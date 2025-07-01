import { NextRequest, NextResponse } from 'next/server';
import { BlockService } from '@/lib/services/block-service';
import { z } from 'zod';

/**
 * INDIVIDUAL BLOCK MANAGEMENT API
 * 
 * Handles CRUD operations for individual blocks
 */

const updateBlockSchema = z.object({
  renderer: z.string().min(1).max(50).optional(),
  data: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  parent_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});

/**
 * GET /api/blocks/[id]
 * 
 * Get a specific block by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const block = await BlockService.getBlockById(id);

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      block: block,
    });

  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blocks/[id]
 * 
 * Update a specific block
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const validatedData = updateBlockSchema.parse(body);
    const updatedBlock = await BlockService.updateBlock(id, validatedData);

    return NextResponse.json({
      success: true,
      block: updatedBlock,
      message: 'Block updated successfully',
    });

  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blocks/[id]
 * 
 * Delete a specific block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      console.error('DELETE /api/blocks/[id]: Missing block ID');
      return NextResponse.json(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      );
    }

    console.log(`DELETE /api/blocks/${id}: Starting deletion`);

    // Check if block exists before deletion
    console.log(`DELETE /api/blocks/${id}: Checking if block exists`);
    const existingBlock = await BlockService.getBlockById(id);
    if (!existingBlock) {
      console.error(`DELETE /api/blocks/${id}: Block not found`);
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404 }
      );
    }

    console.log(`DELETE /api/blocks/${id}: Block found - slug: ${existingBlock.slug}, renderer: ${existingBlock.renderer}`);
    console.log(`DELETE /api/blocks/${id}: Proceeding with deletion`);
    
    await BlockService.deleteBlock(id);
    console.log(`DELETE /api/blocks/${id}: Deletion completed successfully`);

    return NextResponse.json({
      success: true,
      message: 'Block deleted successfully',
    });

  } catch (error) {
    console.error('DELETE /api/blocks/[id]: Error occurred:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}