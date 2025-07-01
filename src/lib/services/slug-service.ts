import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and, asc, desc, count } from 'drizzle-orm';
import { slugSchema, isReservedSlug } from '@/lib/urlShortener';
import slugify from 'slugify';

// Object types supported by the unified slug system
export type ObjectType = 'redirect' | 'article' | 'image' | 'card' | 'gallery';

// Resolved object interface
export interface ResolvedObject {
  id: string;
  type: ObjectType;
  slug: string;
  data: Record<string, unknown>; // The actual object data
  metadata: Record<string, unknown>; // The metadata
}

// Slug creation data
export interface CreateSlugData {
  slug: string;
  renderer: ObjectType;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  is_published?: boolean;
}

// Renderer priority mapping (lower numbers = higher priority)
const RENDERER_PRIORITIES = {
  redirect: 1,  // Highest priority - redirects take precedence
  article: 2,   // Second priority - main content
  card: 3,      // Third priority - card content
  image: 4,     // Fourth priority - media
  gallery: 5,   // Lowest priority - gallery content
} as const;

/**
 * SlugService - Universal slug resolver and manager for unified contentBlocks
 * 
 * This service manages the unified namespace where all content blocks share
 * the same slug space with conflict resolution through renderer priority.
 */
export class SlugService {
  /**
   * Resolve a slug to its target object
   * Uses priority-based resolution: redirect (1) > article (2) > card (3) > image (4) > gallery (5)
   */
  static async resolveSlug(slug: string): Promise<ResolvedObject | null> {
    try {
      // Find active content block with highest priority (lowest number)
      const blocks = await db
        .select()
        .from(contentBlocks)
        .where(and(eq(contentBlocks.slug, slug), eq(contentBlocks.is_published, true)))
        .orderBy(asc(contentBlocks.created_at)); // Get oldest first for consistency

      if (blocks.length === 0) {
        return null;
      }

      // Sort by renderer priority and take the highest priority one
      const sortedBlocks = blocks.sort((a, b) => {
        const priorityA = RENDERER_PRIORITIES[a.renderer as ObjectType] || 999;
        const priorityB = RENDERER_PRIORITIES[b.renderer as ObjectType] || 999;
        return priorityA - priorityB;
      });

      const block = sortedBlocks[0];

      return {
        id: block.id,
        type: block.renderer as ObjectType,
        slug: block.slug,
        data: block.data as Record<string, unknown>,
        metadata: block.metadata as Record<string, unknown>,
      };
    } catch {
      // Silent error handling - don't log to console
      return null;
    }
  }

  /**
   * Create a new content block with slug
   * Handles conflict detection and validation
   */
  static async createBlock(data: CreateSlugData): Promise<string> {
    return db.transaction(async (tx) => {
      // Validate slug format
      const parsedSlug = slugSchema.safeParse(data.slug);
      if (!parsedSlug.success) {
        throw new Error('Invalid slug format. Use 3-50 alphanumeric characters, hyphens, or underscores.');
      }

      // Check for reserved slugs
      if (isReservedSlug(data.slug)) {
        throw new Error('This slug is reserved and cannot be used.');
      }

      // Check for existing active slug
      const [existing] = await tx
        .select()
        .from(contentBlocks)
        .where(and(eq(contentBlocks.slug, data.slug), eq(contentBlocks.is_published, true)))
        .limit(1);

      if (existing) {
        throw new Error(`Slug "${data.slug}" is already taken by a ${existing.renderer}.`);
      }

      // Create content block
      const [newBlock] = await tx
        .insert(contentBlocks)
        .values({
          slug: data.slug,
          type: 'root',
          renderer: data.renderer,
          data: data.data,
          metadata: data.metadata || {},
          is_published: data.is_published ?? true,
        })
        .returning();

      return newBlock.id;
    });
  }

  /**
   * Update slug for an existing content block
   */
  static async updateSlug(oldSlug: string, newSlug: string, renderer: ObjectType): Promise<void> {
    return db.transaction(async (tx) => {
      // Validate new slug
      const parsedSlug = slugSchema.safeParse(newSlug);
      if (!parsedSlug.success) {
        throw new Error('Invalid slug format.');
      }

      if (isReservedSlug(newSlug)) {
        throw new Error('This slug is reserved.');
      }

      // Check if new slug is available (unless it's the same slug)
      if (oldSlug !== newSlug) {
        const [existing] = await tx
          .select()
          .from(contentBlocks)
          .where(and(eq(contentBlocks.slug, newSlug), eq(contentBlocks.is_published, true)))
          .limit(1);

        if (existing) {
          throw new Error(`Slug "${newSlug}" is already taken.`);
        }
      }

      // Update the slug
      await tx
        .update(contentBlocks)
        .set({ 
          slug: newSlug,
          updated_at: new Date(),
        })
        .where(and(eq(contentBlocks.slug, oldSlug), eq(contentBlocks.renderer, renderer)));
    });
  }

  /**
   * Deactivate a content block (soft delete)
   */
  static async deactivateBlock(blockId: string): Promise<void> {
    await db
      .update(contentBlocks)
      .set({ 
        is_published: false,
        updated_at: new Date(),
      })
      .where(eq(contentBlocks.id, blockId));
  }

  /**
   * Generate a unique slug from a title
   */
  static async generateUniqueSlug(title: string, renderer: ObjectType): Promise<string> {
    // Create base slug from title
    let baseSlug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Ensure minimum length
    if (baseSlug.length < 3) {
      baseSlug = `${renderer}-${baseSlug}`;
    }

    // Truncate if too long
    if (baseSlug.length > 50) {
      baseSlug = baseSlug.substring(0, 47);
    }

    // Check if base slug is available
    const [existing] = await db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.slug, baseSlug), eq(contentBlocks.is_published, true)))
      .limit(1);

    if (!existing && !isReservedSlug(baseSlug)) {
      return baseSlug;
    }

    // Generate numbered variants
    let counter = 1;
    let candidateSlug: string;
    
    do {
      candidateSlug = `${baseSlug}-${counter}`;
      
      const [conflict] = await db
        .select()
        .from(contentBlocks)
        .where(and(eq(contentBlocks.slug, candidateSlug), eq(contentBlocks.is_published, true)))
        .limit(1);

      if (!conflict && !isReservedSlug(candidateSlug)) {
        return candidateSlug;
      }
      
      counter++;
    } while (counter <= 100); // Prevent infinite loops

    throw new Error('Unable to generate unique slug. Please try a different title.');
  }

  /**
   * Get all content blocks for analytics and management
   */
  static async getAllBlocks(limit = 100, offset = 0) {
    return db
      .select({
        id: contentBlocks.id,
        slug: contentBlocks.slug,
        type: contentBlocks.type,
        renderer: contentBlocks.renderer,
        is_published: contentBlocks.is_published,
        created_at: contentBlocks.created_at,
        updated_at: contentBlocks.updated_at,
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.is_published, true))
      .orderBy(desc(contentBlocks.created_at))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get content blocks by renderer type
   */
  static async getBlocksByRenderer(renderer: ObjectType, limit = 50) {
    return db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.renderer, renderer), eq(contentBlocks.is_published, true)))
      .orderBy(desc(contentBlocks.created_at))
      .limit(limit);
  }

  /**
   * Check if slug is available
   */
  static async isSlugAvailable(slug: string): Promise<boolean> {
    if (isReservedSlug(slug)) {
      return false;
    }

    const [existing] = await db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.slug, slug), eq(contentBlocks.is_published, true)))
      .limit(1);

    return !existing;
  }

  /**
   * Get content block by ID
   */
  static async getBlockById(id: string): Promise<Record<string, unknown> | null> {
    const [result] = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);

    return result || null;
  }

  /**
   * Get default priority for renderer type
   * Lower numbers = higher priority
   */
  static getRendererPriority(renderer: ObjectType): number {
    return RENDERER_PRIORITIES[renderer] || 999;
  }

  /**
   * Suggest alternative slugs when there's a conflict
   */
  static async suggestAlternativeSlug(desiredSlug: string, renderer: ObjectType): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Try with renderer type prefix
    const withPrefix = `${renderer}-${desiredSlug}`;
    if (await this.isSlugAvailable(withPrefix)) {
      suggestions.push(withPrefix);
    }

    // Try with numbers
    for (let i = 1; i <= 5; i++) {
      const numbered = `${desiredSlug}-${i}`;
      if (await this.isSlugAvailable(numbered)) {
        suggestions.push(numbered);
      }
    }

    // Try with current year
    const currentYear = new Date().getFullYear();
    const withYear = `${desiredSlug}-${currentYear}`;
    if (await this.isSlugAvailable(withYear)) {
      suggestions.push(withYear);
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Get content blocks by slug pattern (for analytics)
   */
  static async getBlocksBySlugPattern(pattern: string, limit = 20) {
    return db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.is_published, true))
      .orderBy(desc(contentBlocks.created_at))
      .limit(limit);
  }

  /**
   * Update content block data
   */
  static async updateBlockData(id: string, data: Record<string, unknown>, metadata?: Record<string, unknown>): Promise<void> {
    const updateFields: Record<string, unknown> = {
      data,
      updated_at: new Date(),
    };

    if (metadata) {
      updateFields.metadata = metadata;
    }

    const [updatedBlock] = await db
      .update(contentBlocks)
      .set(updateFields)
      .where(eq(contentBlocks.id, id))
      .returning();

    if (!updatedBlock) {
      throw new Error('Content block not found');
    }
  }

  /**
   * Get content block statistics
   */
  static async getBlockStats() {
    // Get total count
    const [totalCount] = await db
      .select({ count: count() })
      .from(contentBlocks);

    // Get published count
    const [publishedCount] = await db
      .select({ count: count() })
      .from(contentBlocks)
      .where(eq(contentBlocks.is_published, true));

    // Get counts by renderer
    const rendererCounts = await db
      .select({
        renderer: contentBlocks.renderer,
        count: count(),
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.is_published, true))
      .groupBy(contentBlocks.renderer);

    return {
      total_blocks: totalCount?.count || 0,
      published_blocks: publishedCount?.count || 0,
      by_renderer: rendererCounts.reduce((acc, item) => {
        acc[item.renderer] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}