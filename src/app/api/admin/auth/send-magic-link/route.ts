import { NextResponse } from 'next/server';
import { isAllowedDomain, createOrGetUser, createMagicLink, sendMagicLink } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if domain is allowed
    if (!isAllowedDomain(normalizedEmail)) {
      return NextResponse.json({ 
        error: 'This email domain is not authorized to access the admin panel',
      }, { status: 403 });
    }

    // Create or get user
    const user = await createOrGetUser(normalizedEmail);

    if (!user.is_active) {
      return NextResponse.json({ 
        error: 'Your account has been deactivated. Please contact an administrator.',
      }, { status: 403 });
    }

    // Create magic link
    const token = await createMagicLink(user.id);

    // Send magic link email
    await sendMagicLink(normalizedEmail, token);

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent successfully',
    });

  } catch (error) {
    // Log error for debugging (could be replaced with proper logging service)
    
    if (error instanceof Error && error.message.includes('Failed to send magic link email')) {
      return NextResponse.json({ 
        error: 'Failed to send email. Please try again later.',
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'An unexpected error occurred',
    }, { status: 500 });
  }
} 