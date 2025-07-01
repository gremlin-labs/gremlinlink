import { NextResponse } from 'next/server';
import { verifyMagicLink, createUserSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify magic link
    const userId = await verifyMagicLink(token);

    if (!userId) {
      return NextResponse.json({ 
        error: 'Invalid or expired magic link',
      }, { status: 401 });
    }

    // Create user session
    const sessionToken = await createUserSession(userId);

    // Create response with session cookie
    const response = NextResponse.json({ 
      success: true, 
      message: 'Successfully authenticated',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });

    return response;

  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
    }, { status: 500 });
  }
} 