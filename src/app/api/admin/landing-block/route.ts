import { NextRequest, NextResponse } from 'next/server';
import { LandingBlockService } from '@/lib/services/landing-block-service';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

// GET /api/admin/landing-block - Get current landing block and status
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await LandingBlockService.getLandingStatus();
    return NextResponse.json(status);
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to fetch landing block status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/landing-block - Set a block as landing block
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blockId } = await request.json();

    if (!blockId) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const result = await LandingBlockService.setLandingBlock(blockId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to set landing block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to set landing block' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/landing-block - Remove landing block
export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await LandingBlockService.removeLandingBlock();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove landing block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to remove landing block' },
      { status: 500 }
    );
  }
} 