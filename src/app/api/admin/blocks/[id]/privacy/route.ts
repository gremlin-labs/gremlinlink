import { NextRequest, NextResponse } from 'next/server';
import { LandingBlockService } from '@/lib/services/landing-block-service';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

// POST /api/admin/blocks/[id]/privacy - Toggle privacy status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const result = await LandingBlockService.togglePrivacy(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to toggle privacy' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      isPrivate: result.isPrivate,
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to toggle privacy' },
      { status: 500 }
    );
  }
} 