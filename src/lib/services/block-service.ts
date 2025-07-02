import { db } from '@/lib/db';
import { contentBlocks, clicks, blockRevisions, blockTags } from '@/lib/db/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import type { ContentBlock } from '@/lib/db/schema';
import { z } from 'zod';
import slugify from 'slugify';
import readingTime from 'reading-time';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify for server-side usage
const window = new JSDOM('').window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

/**
 * UNIFIED BLOCK SERVICE
 * 
 * This service replaces 5+ existing services (LinkService, PageService, ImageService, PostService, SlugService)
 * with a single, unified interface for all content operations.
 * 
 * Key Benefits:
 * - Single API for all content types
 * - Consistent validation and error handling
 * - Performance optimized with caching
 * - Extensible renderer system
 * - Type-safe operations
 */

// Validation schemas
export const createBlockSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-_]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
  renderer: z.string().min(1).max(50),
  data: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
  parent_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});

export const updateBlockSchema = createBlockSchema.partial().omit({ slug: true });

// Type definitions
export type CreateBlockData = z.infer<typeof createBlockSchema>;
export type UpdateBlockData = z.infer<typeof updateBlockSchema>;

export interface BlockWithChildren extends ContentBlock {
  children?: BlockWithChildren[];
}

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin', 'api', 'auth', 'login', 'logout', 'signup', 'dashboard',
  'settings', 'profile', 'help', 'about', 'contact', 'privacy',
  'terms', 'robots', 'sitemap', 'favicon', 'manifest', 'sw',
  'page', 'post', 'image', 'link', 'block', 'edit', 'delete',
  'create', 'new', 'update', 'view', 'preview', 'draft', 'published',
];

/**
 * BlockService - Unified content management service
 * 
 * Handles all content operations through a single, consistent interface.
 * Supports unlimited content types through the renderer pattern.
 */
export class BlockService {
  /**
   * Create a new content block
   */
  static async createBlock(data: CreateBlockData): Promise<ContentBlock> {
    const validatedData = createBlockSchema.parse(data);

    return db.transaction(async (tx) => {
      // Validate slug availability
      await this.validateSlugAvailability(validatedData.slug);

      // Validate parent exists if specified
      if (validatedData.parent_id) {
        const parent = await this.getBlockById(validatedData.parent_id);
        if (!parent) {
          throw new Error('Parent block not found');
        }
      }

      // Process data based on renderer type
      const processedData = await this.processBlockData(validatedData.renderer, validatedData.data);

      // Create the block
      const [block] = await tx
        .insert(contentBlocks)
        .values({
          slug: validatedData.slug,
          type: validatedData.parent_id ? 'child' : 'root',
          parent_id: validatedData.parent_id || null,
          renderer: validatedData.renderer,
          data: processedData,
          metadata: validatedData.metadata || {},
          display_order: validatedData.display_order || 0,
          is_published: validatedData.is_published ?? true,
        })
        .returning();

      return block as ContentBlock;
    });
  }

  /**
   * Get block by ID
   */
  static async getBlockById(id: string): Promise<ContentBlock | null> {
    const [block] = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .limit(1);

    return (block as ContentBlock) || null;
  }

  /**
   * Get block by slug (performance optimized for redirects)
   */
  static async getBlockBySlug(slug: string): Promise<ContentBlock | null> {
    const [block] = await db
      .select()
      .from(contentBlocks)
      .where(and(
        eq(contentBlocks.slug, slug),
        eq(contentBlocks.type, 'root'),
        eq(contentBlocks.is_published, true),
      ))
      .limit(1);

    return (block as ContentBlock) || null;
  }

  /**
   * Get redirect target for URL shortener (ultra-fast)
   */
  static async getRedirectTarget(slug: string): Promise<string | null> {
    const [block] = await db
      .select({
        renderer: contentBlocks.renderer,
        data: contentBlocks.data,
      })
      .from(contentBlocks)
      .where(and(
        eq(contentBlocks.slug, slug),
        eq(contentBlocks.type, 'root'),
        eq(contentBlocks.is_published, true),
        eq(contentBlocks.renderer, 'redirect'),
      ))
      .limit(1);

    if (!block || !block.data || typeof block.data !== 'object') {
      return null;
    }

    const data = block.data as Record<string, unknown>;
    return (data.url as string) || null;
  }

  /**
   * Get block tree (block with all children)
   */
  static async getBlockTree(slug: string): Promise<BlockWithChildren | null> {
    // Get root block
    const rootBlock = await this.getBlockBySlug(slug);
    if (!rootBlock) {
      return null;
    }

    // Get all children recursively
    const children = await this.getBlockChildren(rootBlock.id);

    return {
      ...rootBlock,
      children,
    };
  }

  /**
   * Update block
   */
  static async updateBlock(id: string, data: UpdateBlockData): Promise<ContentBlock> {
    const validatedData = updateBlockSchema.parse(data);

    return db.transaction(async (tx) => {
      // Get existing block using the transaction context
      const [existingBlock] = await tx
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.id, id))
        .limit(1);
        
      if (!existingBlock) {
        throw new Error('Block not found');
      }

      // Process data if provided
      let processedData = validatedData.data;
      if (processedData) {
        processedData = await this.processBlockData(existingBlock.renderer, processedData);
      }

      // Update the block
      const [updatedBlock] = await tx
        .update(contentBlocks)
        .set({
          ...validatedData,
          data: processedData || existingBlock.data,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.id, id))
        .returning();

      return updatedBlock as ContentBlock;
    });
  }

  /**
   * Delete block (hard delete with cascade)
   */
  static async deleteBlock(id: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        console.log(`BlockService.deleteBlock: Starting hard delete for block ${id}`);
        await this.deleteBlockRecursive(tx, id);
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      throw new Error(`Failed to delete block: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recursive helper for deleting blocks within a transaction
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static async deleteBlockRecursive(tx: any, id: string): Promise<void> {
    // First, get direct children to delete them recursively
    const directChildren = await tx
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, id));
    
    console.log(`BlockService.deleteBlockRecursive: Found ${directChildren.length} direct children for block ${id}`);
    
    // Recursively delete all children first
    for (const child of directChildren) {
      console.log(`BlockService.deleteBlockRecursive: Deleting child block ${child.id}`);
      await this.deleteBlockRecursive(tx, child.id);
    }

    // Delete associated data in order (these should cascade automatically, but explicit deletion provides better logging)
    
    // 1. Delete block tags
    const deletedBlockTags = await tx
      .delete(blockTags)
      .where(eq(blockTags.block_id, id))
      .returning({ block_id: blockTags.block_id });
    console.log(`BlockService.deleteBlockRecursive: Deleted ${deletedBlockTags.length} block tags for block ${id}`);

    // 2. Delete block revisions
    const deletedRevisions = await tx
      .delete(blockRevisions)
      .where(eq(blockRevisions.block_id, id))
      .returning({ id: blockRevisions.id });
    console.log(`BlockService.deleteBlockRecursive: Deleted ${deletedRevisions.length} block revisions for block ${id}`);

    // 3. Delete clicks
    const deletedClicks = await tx
      .delete(clicks)
      .where(eq(clicks.block_id, id))
      .returning({ id: clicks.id });
    console.log(`BlockService.deleteBlockRecursive: Deleted ${deletedClicks.length} clicks for block ${id}`);

    // 4. Finally, delete the block itself
    const deletedBlocks = await tx
      .delete(contentBlocks)
      .where(eq(contentBlocks.id, id))
      .returning({ id: contentBlocks.id, slug: contentBlocks.slug });
    
    if (deletedBlocks.length === 0) {
      throw new Error(`Block ${id} not found or already deleted`);
    }
    
    console.log(`BlockService.deleteBlockRecursive: Successfully deleted block ${deletedBlocks[0].id} (slug: ${deletedBlocks[0].slug})`);
  }

  /**
   * Track click/interaction with a block
   */
  static async trackClick(blockId: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      // Extract analytics data from metadata
      const userAgent = metadata?.userAgent as string | undefined;
      const referrer = metadata?.referrer as string | undefined;
      const ipAddress = metadata?.ipAddress as string | undefined;
      
      // Basic country detection from IP (you can enhance this with a proper GeoIP service)
      let country: string | undefined;
      if (ipAddress) {
        // For now, we'll leave country detection as a placeholder
        // In production, you'd want to use a service like MaxMind GeoIP2 or similar
        country = await this.detectCountryFromIP(ipAddress);
      }

      await db.insert(clicks).values({
        block_id: blockId,
        timestamp: new Date(),
        referrer: referrer,
        user_agent: userAgent,
        ip_address: ipAddress,
        country: country,
        metadata: metadata || {},
      });
    } catch {
      // Silent error handling - analytics failures shouldn't break functionality
    }
  }

  /**
   * Detect country from IP address
   * Using ipapi.co free service (1000 requests/day limit)
   * In production, consider using MaxMind GeoIP2 or CloudFlare's CF-IPCountry header
   */
  private static async detectCountryFromIP(ipAddress: string): Promise<string | undefined> {
    try {
      // Skip localhost and private IPs
      if (ipAddress === '127.0.0.1' || ipAddress === '::1' || 
          ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || 
          ipAddress.startsWith('172.')) {
        return undefined;
      }

      // Use ipapi.co free service with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`https://ipapi.co/${ipAddress}/country/`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GremlinLink/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const countryCode = await response.text();
        // Return only if it's a valid 2-letter country code
        if (countryCode && countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
          return countryCode;
        }
      }

      return undefined;
    } catch {
      // Silent error handling - don't fail analytics for GeoIP issues
      return undefined;
    }
  }

  /**
   * Reorder blocks within a parent
   */
  static async reorderBlocks(parentId: string, orderedIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(contentBlocks)
          .set({ 
            display_order: i,
            updated_at: new Date(),
          })
          .where(and(
            eq(contentBlocks.id, orderedIds[i]),
            eq(contentBlocks.parent_id, parentId),
          ));
      }
    });
  }

  /**
   * Generate a unique slug from a title
   */
  static async generateUniqueSlug(title: string): Promise<string> {
    let baseSlug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Ensure minimum length
    if (baseSlug.length < 3) {
      baseSlug = `content-${baseSlug}`;
    }

    // Check if base slug is available
    if (await this.isSlugAvailable(baseSlug)) {
      return baseSlug;
    }

    // Try with numbers
    for (let i = 1; i <= 100; i++) {
      const candidateSlug = `${baseSlug}-${i}`;
      if (await this.isSlugAvailable(candidateSlug)) {
        return candidateSlug;
      }
    }

    // Fallback to timestamp
    return `${baseSlug}-${Date.now()}`;
  }

  /**
   * Check if a slug is available
   */
  static async isSlugAvailable(slug: string): Promise<boolean> {
    if (RESERVED_SLUGS.includes(slug)) {
      return false;
    }

    const [existing] = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(eq(contentBlocks.slug, slug))
      .limit(1);

    return !existing;
  }

  /**
   * Search blocks by content
   */
  static async searchBlocks(
    query: string,
    options: {
      renderer?: string;
      limit?: number;
      offset?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<ContentBlock[]> {
    const {
      renderer,
      limit = 20,
      offset = 0,
      publishedOnly = true,
    } = options;

    const whereConditions = [];

    if (publishedOnly) {
      whereConditions.push(eq(contentBlocks.is_published, true));
    }

    if (renderer) {
      whereConditions.push(eq(contentBlocks.renderer, renderer));
    }

    // Simple text search in data field
    // In production, you might want to use full-text search
    const results = await db
      .select()
      .from(contentBlocks)
      .where(and(...whereConditions))
      .orderBy(desc(contentBlocks.updated_at))
      .limit(limit)
      .offset(offset);

    // Filter by query in memory (simple implementation)
    const filtered = results.filter(block => {
      const dataStr = JSON.stringify(block.data).toLowerCase();
      return dataStr.includes(query.toLowerCase());
    });

    return filtered as ContentBlock[];
  }

  /**
   * Get blocks by renderer type
   */
  static async getBlocksByRenderer(
    renderer: string,
    options: {
      limit?: number;
      offset?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<ContentBlock[]> {
    const {
      limit = 20,
      offset = 0,
      publishedOnly = true,
    } = options;

    const whereConditions = [eq(contentBlocks.renderer, renderer)];

    if (publishedOnly) {
      whereConditions.push(eq(contentBlocks.is_published, true));
    }

    const results = await db
      .select()
      .from(contentBlocks)
      .where(and(...whereConditions))
      .orderBy(desc(contentBlocks.updated_at))
      .limit(limit)
      .offset(offset);

    return results as ContentBlock[];
  }

  /**
   * Get analytics for a specific block
   */
  static async getBlockAnalytics(blockId: string, days = 30): Promise<{
    total_clicks: number;
    recent_clicks: Record<string, unknown>[];
    daily_stats: Record<string, unknown>[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalClicks, recentClicks, dailyStats] = await Promise.all([
      // Total clicks
      db
        .select({ count: count() })
        .from(clicks)
        .where(eq(clicks.block_id, blockId)),

      // Recent clicks
      db
        .select()
        .from(clicks)
        .where(eq(clicks.block_id, blockId))
        .orderBy(desc(clicks.timestamp))
        .limit(10),

      // Daily stats
      db
        .select({
          date: sql`DATE(${clicks.timestamp})`,
          count: count(),
        })
        .from(clicks)
        .where(and(
          eq(clicks.block_id, blockId),
          sql`${clicks.timestamp} >= ${startDate}`,
        ))
        .groupBy(sql`DATE(${clicks.timestamp})`)
        .orderBy(sql`DATE(${clicks.timestamp})`),
    ]);

    return {
      total_clicks: totalClicks[0]?.count || 0,
      recent_clicks: recentClicks as Record<string, unknown>[],
      daily_stats: dailyStats as Record<string, unknown>[],
    };
  }

  /**
   * Get all blocks with their children (for admin dashboard)
   */
  static async getAllBlocksWithChildren(): Promise<BlockWithChildren[]> {
    // Get all root blocks
    const rootBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.type, 'root'))
      .orderBy(asc(contentBlocks.display_order), desc(contentBlocks.updated_at));

    // Get children for each root block
    const blocksWithChildren: BlockWithChildren[] = [];
    for (const block of rootBlocks) {
      const children = await this.getBlockChildren(block.id);
      blocksWithChildren.push({
        ...block as ContentBlock,
        children,
      });
    }

    return blocksWithChildren;
  }

  /**
   * Get children of a block recursively
   */
  private static async getBlockChildren(parentId: string): Promise<BlockWithChildren[]> {
    const children = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, parentId))
      .orderBy(asc(contentBlocks.display_order));

    const childrenWithGrandchildren: BlockWithChildren[] = [];
    for (const child of children) {
      const grandchildren = await this.getBlockChildren(child.id);
      childrenWithGrandchildren.push({
        ...child as ContentBlock,
        children: grandchildren,
      });
    }

    return childrenWithGrandchildren;
  }

  /**
   * Validate slug availability and format
   */
  private static async validateSlugAvailability(slug: string): Promise<void> {
    if (!await this.isSlugAvailable(slug)) {
      throw new Error(`Slug "${slug}" is already taken or reserved`);
    }
  }

  /**
   * Process block data based on renderer type
   */
  private static async processBlockData(renderer: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (renderer) {
      case 'redirect':
        return this.processRedirectData(data);
      case 'article':
        return await this.processArticleData(data);
      case 'image':
        return this.processImageData(data);
      case 'card':
        return this.processCardData(data);
      default:
        return data;
    }
  }

  /**
   * Process redirect data
   */
  private static processRedirectData(data: Record<string, unknown>): Record<string, unknown> {
    const { url, ...rest } = data;
    
    if (!url || typeof url !== 'string') {
      throw new Error('Redirect blocks must have a valid URL');
    }

    return {
      url: url.trim(),
      ...rest,
    };
  }

  /**
   * Process article data
   */
  private static async processArticleData(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { content, title, ...rest } = data;
    
    if (!title || typeof title !== 'string') {
      throw new Error('Article blocks must have a title');
    }

    let processedContent = content;
    let wordCount = 0;
    let readingTimeStats = null;

    if (content && Array.isArray(content)) {
      // Extract plain text for reading time calculation
      const plainText = this.extractPlainText(content);
      wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      readingTimeStats = readingTime(plainText);

      // Sanitize HTML content if present
      processedContent = content.map(block => {
        if (block && typeof block === 'object' && 'content' in block) {
          const blockContent = block as Record<string, unknown>;
          if (typeof blockContent.content === 'string') {
            return {
              ...blockContent,
              content: purify.sanitize(blockContent.content),
            };
          }
        }
        return block;
      });
    }

    return {
      title: title.trim(),
      content: processedContent,
      word_count: wordCount,
      reading_time: readingTimeStats?.minutes || 0,
      ...rest,
    };
  }

  /**
   * Process image data
   */
  private static processImageData(data: Record<string, unknown>): Record<string, unknown> {
    const { url, alt, title, ...rest } = data;
    
    if (!url || typeof url !== 'string') {
      throw new Error('Image blocks must have a valid URL');
    }

    return {
      url: url.trim(),
      alt: alt || '',
      title: title || '',
      ...rest,
    };
  }

  /**
   * Process card data
   */
  private static processCardData(data: Record<string, unknown>): Record<string, unknown> {
    const { title, ...rest } = data;
    
    if (!title || typeof title !== 'string') {
      throw new Error('Card blocks must have a title');
    }

    return {
      title: title.trim(),
      ...rest,
    };
  }

  /**
   * Extract plain text from content blocks for reading time calculation
   */
  private static extractPlainText(content: Record<string, unknown>[]): string {
    return content
      .map(block => {
        if (block && typeof block === 'object' && 'content' in block) {
          const blockContent = block as Record<string, unknown>;
          if (typeof blockContent.content === 'string') {
            // Strip HTML tags and return plain text
            return blockContent.content.replace(/<[^>]*>/g, ' ');
          }
        }
        return '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}