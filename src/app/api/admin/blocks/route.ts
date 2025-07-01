import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks, blockTags } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

/**
 * UNIFIED BLOCKS API
 * 
 * This API replaces all the fragmented endpoints (links, pages, images, posts)
 * with a single, unified interface for managing content blocks.
 * 
 * Features:
 * - Unified CRUD operations for all content types
 * - Advanced filtering and search
 * - Tag-based organization
 * - Performance-optimized queries
 * - Type-safe validation
 */

// Validation schemas
const CreateBlockSchema = z.object({
  slug: z.string().min(1).max(255),
  type: z.enum(['root', 'child']).default('root'),
  parent_id: z.string().uuid().optional(),
  renderer: z.string().min(1).max(50),
  data: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  display_order: z.number().int().default(0),
  is_published: z.boolean().default(true),
  tags: z.array(z.string()).optional(), // Tag IDs
});

// GET /api/admin/blocks - List all blocks with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const renderer = searchParams.get('renderer');
    const type = searchParams.get('type');
    const published = searchParams.get('published');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];
    
    if (renderer && renderer !== 'all') {
      conditions.push(eq(contentBlocks.renderer, renderer));
    }
    
    if (type && type !== 'all') {
      conditions.push(eq(contentBlocks.type, type));
    }
    
    if (published === 'true') {
      conditions.push(eq(contentBlocks.is_published, true));
    } else if (published === 'false') {
      conditions.push(eq(contentBlocks.is_published, false));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(contentBlocks.slug, `%${search}%`),
          sql`${contentBlocks.data}::text ILIKE ${`%${search}%`}`,
          sql`${contentBlocks.metadata}::text ILIKE ${`%${search}%`}`
        )
      );
    }

    // Build query with conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Execute query
    const blocks = await db
      .select({
        id: contentBlocks.id,
        slug: contentBlocks.slug,
        type: contentBlocks.type,
        parent_id: contentBlocks.parent_id,
        renderer: contentBlocks.renderer,
        data: contentBlocks.data,
        metadata: contentBlocks.metadata,
        display_order: contentBlocks.display_order,
        is_published: contentBlocks.is_published,
        created_at: contentBlocks.created_at,
        updated_at: contentBlocks.updated_at,
      })
      .from(contentBlocks)
      .where(whereClause)
      .orderBy(desc(contentBlocks.updated_at))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentBlocks)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Calculate statistics
    const statsQuery = await db
      .select({
        renderer: contentBlocks.renderer,
        is_published: contentBlocks.is_published,
        count: sql<number>`count(*)`,
      })
      .from(contentBlocks)
      .groupBy(contentBlocks.renderer, contentBlocks.is_published);

    const stats = {
      total: blocks.length,
      published: 0,
      drafts: 0,
      by_renderer: {} as Record<string, number>,
    };

    statsQuery.forEach(({ renderer, is_published, count }) => {
      if (is_published) {
        stats.published += count;
      } else {
        stats.drafts += count;
      }
      stats.by_renderer[renderer] = (stats.by_renderer[renderer] || 0) + count;
    });

    return NextResponse.json({
      blocks,
      stats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
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

// POST /api/admin/blocks - Create new block
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateBlockSchema.parse(body);

    // Check if slug already exists
    const existingBlock = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(eq(contentBlocks.slug, validatedData.slug))
      .limit(1);

    if (existingBlock.length > 0) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // Create the block
    const [newBlock] = await db
      .insert(contentBlocks)
      .values({
        slug: validatedData.slug,
        type: validatedData.type,
        parent_id: validatedData.parent_id,
        renderer: validatedData.renderer,
        data: validatedData.data,
        metadata: validatedData.metadata,
        display_order: validatedData.display_order,
        is_published: validatedData.is_published,
      })
      .returning();

    // Handle tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      const tagRelations = validatedData.tags.map(tagId => ({
        block_id: newBlock.id,
        tag_id: tagId,
      }));

      await db.insert(blockTags).values(tagRelations);
    }

    return NextResponse.json({ block: newBlock });

  } catch (error) {
    // Log error for debugging (could be replaced with proper logging service)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}