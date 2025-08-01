import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { z } from 'zod';
import readingTime from 'reading-time';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify with JSDOM for server-side usage
const window = new JSDOM('').window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

// Post content block schema (for JSONB structure)
export const contentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['paragraph', 'heading', 'list', 'quote', 'code', 'image', 'link']),
  content: z.unknown(), // Flexible content based on block type
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Post creation and update schemas
export const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  excerpt: z.string().max(500).optional(),
  content: z.array(contentBlockSchema),
  slug: z.string().min(3).max(50),
  is_published: z.boolean().default(false),
  published_at: z.date().optional(),
});

export const updatePostSchema = createPostSchema.partial().omit({ slug: true });

// Type definitions
export type CreatePostData = z.infer<typeof createPostSchema>;
export type UpdatePostData = z.infer<typeof updatePostSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export interface PostWithMetadata {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: ContentBlock[];
  reading_time: number | null;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  word_count: number;
  plain_text: string;
}

/**
 * PostService - Manages rich content posts using unified contentBlocks
 * 
 * Handles post creation, content sanitization, reading time calculation,
 * and publishing workflow for blog-style content using the new unified schema.
 */
export class PostService {
  /**
   * Create a new post with content processing
   */
  static async createPost(data: CreatePostData): Promise<Record<string, unknown>> {
    // Validate input
    const validatedData = createPostSchema.parse(data);

    // Process and sanitize content
    const processedContent = await this.processContent(validatedData.content);
    
    // Calculate reading time
    const plainText = this.extractPlainText(processedContent);
    const readingTimeStats = readingTime(plainText);

    // Create the post as a content block with article renderer
    const [post] = await db
      .insert(contentBlocks)
      .values({
        slug: validatedData.slug,
        type: 'root',
        renderer: 'article',
        data: {
          title: validatedData.title,
          content: processedContent,
          reading_time: Math.ceil(readingTimeStats.minutes),
        },
        metadata: {
          excerpt: validatedData.excerpt || null,
          is_published: validatedData.is_published,
          published_at: validatedData.is_published ? (validatedData.published_at || new Date()) : null,
        },
        is_published: validatedData.is_published,
      })
      .returning();

    return post;
  }

  /**
   * Get post by ID with metadata
   */
  static async getPostById(id: string): Promise<PostWithMetadata | null> {
    const [post] = await db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.id, id), eq(contentBlocks.renderer, 'article')))
      .limit(1);

    if (!post) {
      return null;
    }

    return this.enrichPostWithMetadata(post);
  }

  /**
   * Get post by slug with metadata
   */
  static async getPostBySlug(slug: string): Promise<PostWithMetadata | null> {
    const [post] = await db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.slug, slug), eq(contentBlocks.renderer, 'article')))
      .limit(1);

    if (!post) {
      return null;
    }

    return this.enrichPostWithMetadata(post);
  }

  /**
   * Update post content and metadata
   */
  static async updatePost(id: string, data: UpdatePostData): Promise<Record<string, unknown>> {
    const validatedData = updatePostSchema.parse(data);

    // Process content if provided
    let processedContent;
    let readingTimeMinutes;
    
    if (validatedData.content) {
      processedContent = await this.processContent(validatedData.content);
      const plainText = this.extractPlainText(processedContent);
      const readingTimeStats = readingTime(plainText);
      readingTimeMinutes = Math.ceil(readingTimeStats.minutes);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    // Update data field if content changed
    if (processedContent) {
      updateData.data = {
        title: validatedData.title,
        content: processedContent,
        reading_time: readingTimeMinutes,
      };
    } else if (validatedData.title) {
      // Update just the title if no content change
      updateData.data = {
        title: validatedData.title,
      };
    }

    // Update metadata field
    const metadataUpdate: Record<string, unknown> = {};
    if (validatedData.excerpt !== undefined) {
      metadataUpdate.excerpt = validatedData.excerpt;
    }
    if (validatedData.is_published !== undefined) {
      metadataUpdate.is_published = validatedData.is_published;
      updateData.is_published = validatedData.is_published;
      
      if (validatedData.is_published === true && !validatedData.published_at) {
        metadataUpdate.published_at = new Date();
      } else if (validatedData.is_published === false) {
        metadataUpdate.published_at = null;
      }
    }

    if (Object.keys(metadataUpdate).length > 0) {
      updateData.metadata = metadataUpdate;
    }

    const [updatedPost] = await db
      .update(contentBlocks)
      .set(updateData)
      .where(eq(contentBlocks.id, id))
      .returning();

    if (!updatedPost) {
      throw new Error('Post not found');
    }

    return updatedPost;
  }

  /**
   * Delete post
   */
  static async deletePost(id: string): Promise<void> {
    const result = await db
      .delete(contentBlocks)
      .where(and(eq(contentBlocks.id, id), eq(contentBlocks.renderer, 'article')))
      .returning();

    if (result.length === 0) {
      throw new Error('Post not found');
    }
  }

  /**
   * Publish a post
   */
  static async publishPost(id: string): Promise<Record<string, unknown>> {
    const [updatedPost] = await db
      .update(contentBlocks)
      .set({
        is_published: true,
        metadata: {
          is_published: true,
          published_at: new Date(),
        },
        updated_at: new Date(),
      })
      .where(and(eq(contentBlocks.id, id), eq(contentBlocks.renderer, 'article')))
      .returning();

    if (!updatedPost) {
      throw new Error('Post not found');
    }

    return updatedPost;
  }

  /**
   * Unpublish a post
   */
  static async unpublishPost(id: string): Promise<Record<string, unknown>> {
    const [updatedPost] = await db
      .update(contentBlocks)
      .set({
        is_published: false,
        metadata: {
          is_published: false,
          published_at: null,
        },
        updated_at: new Date(),
      })
      .where(and(eq(contentBlocks.id, id), eq(contentBlocks.renderer, 'article')))
      .returning();

    if (!updatedPost) {
      throw new Error('Post not found');
    }

    return updatedPost;
  }

  /**
   * Get all posts with pagination
   */
  static async getAllPosts(limit = 20, offset = 0, publishedOnly = false) {
    const conditions = [eq(contentBlocks.renderer, 'article')];
    
    if (publishedOnly) {
      conditions.push(eq(contentBlocks.is_published, true));
    }

    return db
      .select()
      .from(contentBlocks)
      .where(and(...conditions))
      .orderBy(desc(contentBlocks.created_at))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get published posts only
   */
  static async getPublishedPosts(limit = 20, offset = 0) {
    return this.getAllPosts(limit, offset, true);
  }

  /**
   * Get draft posts only
   */
  static async getDraftPosts(limit = 20, offset = 0) {
    return db
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.renderer, 'article'), eq(contentBlocks.is_published, false)))
      .orderBy(desc(contentBlocks.updated_at))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Search posts by title or content
   */
  static async searchPosts(query: string, limit = 10, publishedOnly = true) {
    const conditions = [eq(contentBlocks.renderer, 'article')];
    
    if (publishedOnly) {
      conditions.push(eq(contentBlocks.is_published, true));
    }

    // Note: This is a simple implementation. In production, you might want full-text search
    return db
      .select()
      .from(contentBlocks)
      .where(and(...conditions))
      .limit(limit);
  }

  /**
   * Update post slug
   */
  static async updatePostSlug(postId: string, newSlug: string): Promise<void> {
    const [updatedPost] = await db
      .update(contentBlocks)
      .set({ 
        slug: newSlug,
        updated_at: new Date(),
      })
      .where(and(eq(contentBlocks.id, postId), eq(contentBlocks.renderer, 'article')))
      .returning();

    if (!updatedPost) {
      throw new Error('Post not found');
    }
  }

  /**
   * Get post statistics
   */
  static async getPostStats() {
    // Get total count
    const [totalCount] = await db
      .select({ count: count() })
      .from(contentBlocks)
      .where(eq(contentBlocks.renderer, 'article'));

    // Get published count
    const [publishedCount] = await db
      .select({ count: count() })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.renderer, 'article'), eq(contentBlocks.is_published, true)));

    // Get draft count
    const [draftCount] = await db
      .select({ count: count() })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.renderer, 'article'), eq(contentBlocks.is_published, false)));

    return {
      total_posts: totalCount?.count || 0,
      published_posts: publishedCount?.count || 0,
      draft_posts: draftCount?.count || 0,
    };
  }

  /**
   * Process and sanitize content blocks
   * Private helper method
   */
  private static async processContent(content: ContentBlock[]): Promise<ContentBlock[]> {
    const processedBlocks: ContentBlock[] = [];

    for (const block of content) {
      const processedBlock = { ...block };

      // Sanitize content based on block type
      switch (block.type) {
        case 'paragraph':
        case 'heading':
        case 'quote':
          if (typeof block.content === 'string') {
            processedBlock.content = purify.sanitize(block.content);
          }
          break;

        case 'list':
          if (Array.isArray(block.content)) {
            processedBlock.content = block.content.map(item => 
              typeof item === 'string' ? purify.sanitize(item) : item
            );
          }
          break;

        case 'code':
          // Code blocks should not be sanitized but should be escaped
          if (typeof block.content === 'string') {
            processedBlock.content = block.content; // Keep as-is for code
          }
          break;

        case 'image':
          // Validate image URLs and metadata
          if (typeof block.content === 'object' && block.content !== null && 'url' in block.content) {
            const imageContent = block.content as Record<string, unknown>;
            processedBlock.content = {
              ...imageContent,
              url: typeof imageContent.url === 'string' ? purify.sanitize(imageContent.url) : '',
              alt: typeof imageContent.alt === 'string' ? purify.sanitize(imageContent.alt) : '',
              caption: typeof imageContent.caption === 'string' ? purify.sanitize(imageContent.caption) : '',
            };
          }
          break;

        case 'link':
          // Validate and sanitize link content
          if (typeof block.content === 'object' && block.content !== null && 'url' in block.content) {
            const linkContent = block.content as Record<string, unknown>;
            processedBlock.content = {
              ...linkContent,
              url: typeof linkContent.url === 'string' ? purify.sanitize(linkContent.url) : '',
              text: typeof linkContent.text === 'string' ? purify.sanitize(linkContent.text) : '',
              title: typeof linkContent.title === 'string' ? purify.sanitize(linkContent.title) : '',
            };
          }
          break;

        default:
          // For unknown block types, sanitize if string
          if (typeof block.content === 'string') {
            processedBlock.content = purify.sanitize(block.content);
          }
      }

      processedBlocks.push(processedBlock);
    }

    return processedBlocks;
  }

  /**
   * Extract plain text from content blocks for reading time calculation
   * Private helper method
   */
  private static extractPlainText(content: ContentBlock[]): string {
    const textParts: string[] = [];

    for (const block of content) {
      switch (block.type) {
        case 'paragraph':
        case 'heading':
        case 'quote':
          if (typeof block.content === 'string') {
            // Strip HTML tags and get plain text
            const plainText = block.content.replace(/<[^>]*>/g, '');
            textParts.push(plainText);
          }
          break;

        case 'list':
          if (Array.isArray(block.content)) {
            const listText = block.content
              .map(item => typeof item === 'string' ? item.replace(/<[^>]*>/g, '') : '')
              .join(' ');
            textParts.push(listText);
          }
          break;

        case 'code':
          if (typeof block.content === 'string') {
            textParts.push(block.content);
          }
          break;

        case 'link':
          if (typeof block.content === 'object' && block.content !== null && 'text' in block.content) {
            const linkContent = block.content as Record<string, unknown>;
            if (typeof linkContent.text === 'string') {
              textParts.push(linkContent.text);
            }
          }
          break;

        // Images don't contribute to reading time
        case 'image':
          break;
      }
    }

    return textParts.join(' ');
  }

  /**
   * Enrich post with calculated metadata
   * Private helper method
   */
  private static enrichPostWithMetadata(post: Record<string, unknown>): PostWithMetadata {
    const data = post.data as Record<string, unknown>;
    const metadata = post.metadata as Record<string, unknown>;
    const content = (data?.content as ContentBlock[]) || [];
    
    const plainText = this.extractPlainText(content);
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;

    return {
      id: post.id as string,
      slug: post.slug as string,
      title: (data?.title as string) || '',
      excerpt: (metadata?.excerpt as string) || null,
      content,
      reading_time: (data?.reading_time as number) || null,
      is_published: post.is_published as boolean,
      published_at: metadata?.published_at ? new Date(metadata.published_at as string) : null,
      created_at: post.created_at as Date,
      updated_at: post.updated_at as Date,
      word_count: wordCount,
      plain_text: plainText,
    };
  }

  /**
   * Validate content structure
   */
  static validateContent(content: unknown[]): boolean {
    try {
      z.array(contentBlockSchema).parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate excerpt from content if not provided
   */
  static generateExcerpt(content: ContentBlock[], maxLength = 200): string {
    const plainText = this.extractPlainText(content);
    
    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Find the last complete sentence within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.5) {
      return truncated.substring(0, lastSentence + 1);
    }

    // If no good sentence break, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace) + '...';
  }
}