import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle temp blocks (not yet saved to database)
    if (id === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({
        children: [],
        total: 0,
      });
    }

    const children = await db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.parent_id, id),
          eq(contentBlocks.type, 'child')
        )
      )
      .orderBy(contentBlocks.display_order);

    return NextResponse.json({
      children,
      total: children.length,
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to fetch child blocks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const { blockId } = await request.json();

    // Handle temp blocks (not yet saved to database)
    if (parentId === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json(
        { error: 'Cannot add blocks to unsaved page. Please save the page first.' },
        { status: 400 }
      );
    }

    // Get the target block
    const [targetBlock] = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, blockId))
      .limit(1);

    if (!targetBlock) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    // Get current max display order
    const [maxOrder] = await db
      .select({ max: contentBlocks.display_order })
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, parentId));

    const nextOrder = (maxOrder?.max || 0) + 1;

    // Create child relationship by inserting a new child block that references the original
    const [childBlock] = await db
      .insert(contentBlocks)
      .values({
        slug: `${targetBlock.slug}-child-${Date.now()}`, // Unique slug for child
        type: 'child',
        parent_id: parentId,
        renderer: targetBlock.renderer,
        data: targetBlock.data,
        metadata: targetBlock.metadata,
        display_order: nextOrder,
        is_published: true,
      })
      .returning();

    return NextResponse.json({
      child: childBlock,
      message: 'Block added successfully',
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to add child block' },
      { status: 500 }
    );
  }
}
 