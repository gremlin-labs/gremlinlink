import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users, magicLinks, userSessions } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { Resend } from 'resend';
import { 
  SESSION_COOKIE_NAME as _SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE as _SESSION_COOKIE_MAX_AGE,
  MAGIC_LINK_EXPIRY as _MAGIC_LINK_EXPIRY
} from '@/lib/auth-constants';

// Lazy initialization of Resend to avoid build-time errors
let resendInstance: Resend | null = null;

function getResendInstance(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// Re-export constants for backward compatibility
export const SESSION_COOKIE_NAME = _SESSION_COOKIE_NAME;
export const SESSION_COOKIE_MAX_AGE = _SESSION_COOKIE_MAX_AGE;
export const MAGIC_LINK_EXPIRY = _MAGIC_LINK_EXPIRY;

// Check if email domain is allowed
export function isAllowedDomain(email: string): boolean {
  const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',').map(d => d.trim()) || [];
  
  if (allowedDomains.length === 0) {
    // No ALLOWED_DOMAINS configured - all domains will be rejected
    return false;
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.some(domain => 
    emailDomain === domain.toLowerCase() || 
    emailDomain?.endsWith('.' + domain.toLowerCase())
  );
}

// Generate a secure token using Web Crypto API (Edge Runtime compatible)
export function generateSecureToken(): string {
  // Generate 32 random bytes
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create or get user by email
export async function createOrGetUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create new user
  const newUser = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0], // Use email prefix as default name
    })
    .returning();

  return newUser[0];
}

// Create magic link
export async function createMagicLink(userId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY * 1000);

  await db.insert(magicLinks).values({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  return token;
}

// Send magic link email
export async function sendMagicLink(email: string, token: string) {
  const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/admin/auth/verify?token=${token}`;
  
  try {
    await getResendInstance().emails.send({
      from: process.env.FROM_EMAIL || 'noreply@gremlinlink.com',
      to: email,
      subject: 'Sign in to GremlinLink Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to GremlinLink Admin</h2>
          <p>Click the link below to sign in to your admin account:</p>
          <p>
            <a href="${magicUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Sign In
            </a>
          </p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch {
    // Failed to send magic link email - silent error handling
    throw new Error('Failed to send magic link email');
  }
}

// Verify magic link token
export async function verifyMagicLink(token: string) {
  const magicLink = await db
    .select({
      id: magicLinks.id,
      user_id: magicLinks.user_id,
      expires_at: magicLinks.expires_at,
      used_at: magicLinks.used_at,
    })
    .from(magicLinks)
    .where(eq(magicLinks.token, token))
    .limit(1);

  if (magicLink.length === 0) {
    return null;
  }

  const link = magicLink[0];

  // Check if already used
  if (link.used_at) {
    return null;
  }

  // Check if expired
  if (new Date() > link.expires_at) {
    return null;
  }

  // Mark as used
  await db
    .update(magicLinks)
    .set({ used_at: new Date() })
    .where(eq(magicLinks.id, link.id));

  return link.user_id;
}

// Create user session
export async function createUserSession(userId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE * 1000);

  await db.insert(userSessions).values({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  // Update user's last login
  await db
    .update(users)
    .set({ last_login: new Date() })
    .where(eq(users.id, userId));

  return token;
}

// Validate session token
export async function validateSession(token: string) {
  if (!token) return null;

  const session = await db
    .select({
      user_id: userSessions.user_id,
      expires_at: userSessions.expires_at,
      email: users.email,
      name: users.name,
      is_active: users.is_active,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.user_id, users.id))
    .where(
      and(
        eq(userSessions.token, token),
        gt(userSessions.expires_at, new Date()),
        eq(users.is_active, true)
      )
    )
    .limit(1);

  return session.length > 0 ? session[0] : null;
}

// Check if user is authenticated (for middleware)
export async function isAuthenticated(request?: NextRequest): Promise<boolean> {
  if (!request) return false;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return false;

  const session = await validateSession(sessionCookie.value);
  return session !== null;
}

// Get current user from request
export async function getCurrentUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  return await validateSession(sessionCookie.value);
}

// Logout user (invalidate session)
export async function logoutUser(token: string) {
  await db
    .delete(userSessions)
    .where(eq(userSessions.token, token));
}