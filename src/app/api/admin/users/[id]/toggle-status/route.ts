import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { isAuthenticated } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.toggleUserStatus(id);
    return NextResponse.json({ user });
  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to toggle user status' },
      { status: 500 }
    );
  }
} 