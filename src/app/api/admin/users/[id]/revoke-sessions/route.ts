import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { isAuthenticated } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await UserService.revokeUserSessions(id);
    return NextResponse.json({ success: true });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to revoke user sessions' },
      { status: 500 }
    );
  }
} 