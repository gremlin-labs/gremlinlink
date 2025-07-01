import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds must be an array' },
        { status: 400 }
      );
    }

    // Update display order for each block
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(contentBlocks)
        .set({ display_order: i })
        .where(
          and(
            eq(contentBlocks.id, orderedIds[i]),
            eq(contentBlocks.parent_id, parentId),
            eq(contentBlocks.type, 'child')
          )
        );
    }

    return NextResponse.json({
      message: 'Block order updated successfully',
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to update block order' },
      { status: 500 }
    );
  }
} 