import { NextRequest, NextResponse } from 'next/server';
import { BlockService } from '@/lib/services/block-service';
import { z } from 'zod';

/**
 * UNIFIED BLOCKS API
 * 
 * This single endpoint replaces multiple fragmented APIs:
 * - /api/admin/pages
 * - /api/admin/images  
 * - /api/admin/posts
 * - /api/admin/landing-components
 * - /api/links
 * 
 * All content operations now go through this unified interface.
 */

// Request validation schemas
const createBlockSchema = z.object({
  slug: z.string().min(3).max(50),
  renderer: z.string().min(1).max(50),
  data: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  parent_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});

const querySchema = z.object({
  renderer: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  published: z.string().optional(), // 'true', 'false', or undefined for all
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  updates: z.object({
    is_published: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  }),
});

/**
 * GET /api/blocks
 * 
 * Retrieve blocks with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    let blocks;
    let publishedOnly = true;

    // Handle published filter
    if (query.published === 'false') {
      publishedOnly = false;
    } else if (query.published === 'true') {
      publishedOnly = true;
    } else {
      publishedOnly = false; // Show all when not specified
    }

    if (query.search) {
      // Search blocks
      blocks = await BlockService.searchBlocks(query.search, {
        renderer: query.renderer,
        limit: query.limit,
        offset: query.offset,
        publishedOnly,
      });
    } else if (query.renderer) {
      // Get blocks by renderer type
      blocks = await BlockService.getBlocksByRenderer(query.renderer, {
        limit: query.limit,
        offset: query.offset,
        publishedOnly,
      });
    } else {
      // Get all blocks
      blocks = await BlockService.searchBlocks('', {
        limit: query.limit,
        offset: query.offset,
        publishedOnly,
      });
    }

    // Get statistics for the frontend
    const allBlocks = await BlockService.searchBlocks('', { publishedOnly: false });
    const stats = {
      total: allBlocks.length,
      published: allBlocks.filter(b => b.is_published).length,
      drafts: allBlocks.filter(b => !b.is_published).length,
      by_renderer: allBlocks.reduce((acc, block) => {
        acc[block.renderer] = (acc[block.renderer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      success: true,
      blocks,
      stats,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: blocks.length,
      },
    });

  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blocks
 * 
 * Create a new content block
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createBlockSchema.parse(body);

    const block = await BlockService.createBlock(validatedData);

    return NextResponse.json({
      success: true,
      block: block,
      message: 'Block created successfully',
    }, { status: 201 });

  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle business logic errors (slug conflicts, etc.)
      if (error.message.includes('already taken') || error.message.includes('reserved')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }

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
 * PATCH /api/blocks
 * 
 * Bulk operations on blocks
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'bulk_delete': {
        const deleteData = bulkDeleteSchema.parse(body);
        await Promise.all(deleteData.ids.map(id => BlockService.deleteBlock(id)));
        return NextResponse.json({
          success: true,
          message: `${deleteData.ids.length} blocks deleted successfully`,
        });
      }

      case 'bulk_update': {
        const updateData = bulkUpdateSchema.parse(body);
        
        await Promise.all(
          updateData.ids.map(async (id) => {
            return await BlockService.updateBlock(id, updateData.updates);
          })
        );
        
        return NextResponse.json({
          success: true,
          message: `${updateData.ids.length} blocks updated successfully`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}