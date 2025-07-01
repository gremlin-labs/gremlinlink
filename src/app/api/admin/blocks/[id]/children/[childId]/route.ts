import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: parentId, childId } = await params;

    // Verify the child block exists and belongs to the parent
    const [childBlock] = await db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.id, childId),
          eq(contentBlocks.parent_id, parentId),
          eq(contentBlocks.type, 'child')
        )
      )
      .limit(1);

    if (!childBlock) {
      return NextResponse.json(
        { error: 'Child block not found' },
        { status: 404 }
      );
    }

    // Delete the child block
    await db
      .delete(contentBlocks)
      .where(eq(contentBlocks.id, childId));

    return NextResponse.json({
      message: 'Child block removed successfully',
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to remove child block' },
      { status: 500 }
    );
  }
} 