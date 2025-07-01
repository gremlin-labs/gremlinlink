import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    return NextResponse.json({ 
      user: {
        user_id: session.user_id,
        email: session.email,
        name: session.name,
        is_active: session.is_active,
      },
    });

  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json({ 
      error: 'Session validation failed',
    }, { status: 500 });
  }
} 