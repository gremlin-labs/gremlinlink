import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks, blockTags } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

/**
 * INDIVIDUAL BLOCK API
 * 
 * Handles CRUD operations for individual content blocks.
 * Supports GET, PUT, and DELETE operations with proper validation.
 */

const UpdateBlockSchema = z.object({
  slug: z.string().min(1).max(255).optional(),
  type: z.enum(['root', 'child']).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  renderer: z.string().min(1).max(50).optional(),
  data: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  display_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
  tags: z.array(z.string()).optional(), // Tag IDs
});

// GET /api/admin/blocks/[id] - Get single block
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const block = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);

    if (block.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Get associated tags
    const blockTagsResult = await db
      .select({
        tag_id: blockTags.tag_id,
      })
      .from(blockTags)
      .where(eq(blockTags.block_id, id));

    const tagIds = blockTagsResult.map(bt => bt.tag_id);

    return NextResponse.json({
      block: {
        ...block[0],
        tags: tagIds,
      },
    });

  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/blocks/[id] - Update block
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateBlockSchema.parse(body);

    // Check if block exists
    const existingBlock = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);

    if (existingBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Check if slug is being changed and if it conflicts
    if (validatedData.slug) {
      const slugConflict = await db
        .select({ id: contentBlocks.id })
        .from(contentBlocks)
        .where(eq(contentBlocks.slug, validatedData.slug))
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data (exclude tags from block update)
    const { tags, ...blockUpdateData } = validatedData;
    
    // Update the block
    const [updatedBlock] = await db
      .update(contentBlocks)
      .set({
        ...blockUpdateData,
        updated_at: new Date(),
      })
      .where(eq(contentBlocks.id, id))
      .returning();

    // Handle tags update if provided
    if (tags !== undefined) {
      // Remove existing tag associations
      await db
        .delete(blockTags)
        .where(eq(blockTags.block_id, id));

      // Add new tag associations
      if (tags.length > 0) {
        const tagRelations = tags.map(tagId => ({
          block_id: id,
          tag_id: tagId,
        }));

        await db.insert(blockTags).values(tagRelations);
      }
    }

    return NextResponse.json({ block: updatedBlock });

  } catch (error) {
    // Log error for debugging (could be replaced with proper logging service)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blocks/[id] - Delete block
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if block exists
    const existingBlock = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);

    if (existingBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Delete the block (cascading deletes will handle tags and revisions)
    await db
      .delete(contentBlocks)
      .where(eq(contentBlocks.id, id));

    return NextResponse.json({ success: true });

  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}