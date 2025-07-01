import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (sessionCookie?.value) {
      // Invalidate session in database
      await logoutUser(sessionCookie.value);
    }

    // Create response and clear cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    });

    return response;

  } catch {
    // Silent error handling - don't log to console
    
    // Even if there's an error, clear the cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  }
}