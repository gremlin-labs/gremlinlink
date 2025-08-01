import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, asc, and, count } from 'drizzle-orm';
import { SlugService } from './slug-service';
import { z } from 'zod';

// Page creation and update schemas
export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  slug: z.string().min(3).max(50),
  is_landing: z.boolean().default(false),
  meta_image: z.string().url().optional(),
  theme: z.string().default('default'),
});

export const updatePageSchema = createPageSchema.partial().omit({ slug: true });

export const addObjectToPageSchema = z.object({
  object_type: z.enum(['redirect', 'image', 'article', 'card', 'gallery']),
  object_id: z.string().uuid(),
  display_order: z.number().int().min(0),
  layout_size: z.enum(['small', 'medium', 'large', 'full']).default('medium'),
  custom_styling: z.record(z.string(), z.unknown()).optional(),
});

// Type definitions
export type CreatePageData = z.infer<typeof createPageSchema>;
export type UpdatePageData = z.infer<typeof updatePageSchema>;
export type AddObjectToPageData = z.infer<typeof addObjectToPageSchema>;

export interface PageWithObjects {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_landing: boolean;
  meta_image: string | null;
  theme: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
  objects: PageObjectWithData[];
}

export interface PageObjectWithData {
  id: string;
  object_type: string;
  object_id: string;
  display_order: number;
  layout_size: string;
  custom_styling: Record<string, unknown>;
  created_at: Date;
  data: Record<string, unknown>; // The actual object data
}

export interface PageBlock {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  is_landing: boolean;
  meta_image?: string | null;
  theme: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * PageService - Manages page creation, composition, and rendering
 * 
 * Pages are content containers that can hold any combination of content blocks.
 * They support flexible layouts and custom styling for rich content experiences.
 * Uses the unified contentBlocks architecture with parent-child relationships.
 */
export class PageService {
  /**
   * Create a new page with slug reservation
   */
  static async createPage(data: CreatePageData): Promise<PageBlock> {
    // Validate input
    const validatedData = createPageSchema.parse(data);

    // Create content block using SlugService
    const blockId = await SlugService.createBlock({
      slug: validatedData.slug,
      renderer: 'article', // Pages use article renderer
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        theme: validatedData.theme,
        content: [], // Empty content array for child blocks
      },
      metadata: {
        is_landing: validatedData.is_landing,
        meta_image: validatedData.meta_image || null,
        page_type: 'container',
      },
      is_published: true,
    });

    // Retrieve and return the created page
    const createdPage = await this.getPageById(blockId);
    if (!createdPage) {
      throw new Error('Failed to retrieve created page');
    }

    return createdPage;
  }

  /**
   * Get page by ID with all its objects
   */
  static async getPageById(id: string): Promise<PageWithObjects | null> {
    const block = await SlugService.getBlockById(id);
    
    if (!block || block.renderer !== 'article') {
      return null;
    }

    return this.enrichPageWithObjects(this.mapBlockToPage(block));
  }

  /**
   * Get page by slug with all its objects
   */
  static async getPageBySlug(slug: string): Promise<PageWithObjects | null> {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'article') {
      return null;
    }

    const pageBlock = this.mapResolvedToPage(resolved);
    return this.enrichPageWithObjects(pageBlock);
  }

  /**
   * Update page metadata
   */
  static async updatePage(id: string, data: UpdatePageData): Promise<PageBlock> {
    const validatedData = updatePageSchema.parse(data);

    // Get current block
    const currentBlock = await SlugService.getBlockById(id);
    if (!currentBlock || currentBlock.renderer !== 'article') {
      throw new Error('Page not found');
    }

    // Merge current data with updates
    const currentData = currentBlock.data as Record<string, unknown>;
    const currentMetadata = currentBlock.metadata as Record<string, unknown>;
    
    const updatedData = {
      ...currentData,
      ...Object.fromEntries(
        Object.entries(validatedData).filter(([key, value]) => 
          value !== undefined && ['title', 'description', 'theme'].includes(key)
        )
      ),
    };

    const updatedMetadata = {
      ...currentMetadata,
      ...Object.fromEntries(
        Object.entries(validatedData).filter(([key, value]) => 
          value !== undefined && ['is_landing', 'meta_image'].includes(key)
        )
      ),
    };

    // Update the block
    await SlugService.updateBlockData(id, updatedData, updatedMetadata);

    // Return updated page
    const updatedPage = await this.getPageById(id);
    if (!updatedPage) {
      throw new Error('Failed to retrieve updated page');
    }

    return {
      ...this.mapPageWithObjectsToPage(updatedPage),
      is_published: true,
    };
  }

  /**
   * Delete page and all its child objects
   */
  static async deletePage(id: string): Promise<void> {
    // Verify it's a page block
    const block = await SlugService.getBlockById(id);
    if (!block || block.renderer !== 'article') {
      throw new Error('Page not found');
    }

    // Get all child blocks
    const childBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, id));

    // Deactivate all child blocks first
    for (const child of childBlocks) {
      await SlugService.deactivateBlock(child.id);
    }

    // Deactivate the page block
    await SlugService.deactivateBlock(id);
  }

  /**
   * Add an object to a page
   */
  static async addObjectToPage(pageId: string, data: AddObjectToPageData): Promise<Record<string, unknown>> {
    const validatedData = addObjectToPageSchema.parse(data);

    // Verify the page exists
    const pageBlock = await SlugService.getBlockById(pageId);
    if (!pageBlock || pageBlock.renderer !== 'article') {
      throw new Error('Page not found');
    }

    // Verify the object exists
    const objectBlock = await SlugService.getBlockById(validatedData.object_id);
    if (!objectBlock || objectBlock.renderer !== validatedData.object_type) {
      throw new Error(`${validatedData.object_type} with ID ${validatedData.object_id} not found`);
    }

    // Check if object is already on this page
    const existingChild = await db
      .select()
      .from(contentBlocks)
      .where(and(
        eq(contentBlocks.parent_id, pageId),
        eq(contentBlocks.id, validatedData.object_id)
      ))
      .limit(1);

    if (existingChild.length > 0) {
      throw new Error('Object is already on this page');
    }

    // Update the object to be a child of this page
    await db
      .update(contentBlocks)
      .set({
        parent_id: pageId,
        type: 'child',
        display_order: validatedData.display_order,
        metadata: {
          ...objectBlock.metadata as Record<string, unknown>,
          layout_size: validatedData.layout_size,
          custom_styling: validatedData.custom_styling || {},
          added_to_page_at: new Date().toISOString(),
        },
        updated_at: new Date(),
      })
      .where(eq(contentBlocks.id, validatedData.object_id));

    // Return the updated object
    const updatedObject = await SlugService.getBlockById(validatedData.object_id);
    return updatedObject || {};
  }

  /**
   * Remove an object from a page
   */
  static async removeObjectFromPage(pageId: string, objectId: string): Promise<void> {
    // Verify the object is a child of this page
    const childBlock = await db
      .select()
      .from(contentBlocks)
      .where(and(
        eq(contentBlocks.id, objectId),
        eq(contentBlocks.parent_id, pageId)
      ))
      .limit(1);

    if (childBlock.length === 0) {
      throw new Error('Object not found on this page');
    }

    // Remove from page by setting parent_id to null and type back to root
    await db
      .update(contentBlocks)
      .set({
        parent_id: null,
        type: 'root',
        display_order: 0,
        updated_at: new Date(),
      })
      .where(eq(contentBlocks.id, objectId));
  }

  /**
   * Reorder objects on a page
   */
  static async reorderPageObjects(
    pageId: string,
    objectOrders: { object_id: string; display_order: number }[]
  ): Promise<void> {
    return db.transaction(async (tx) => {
      for (const { object_id, display_order } of objectOrders) {
        await tx
          .update(contentBlocks)
          .set({ 
            display_order,
            updated_at: new Date(),
          })
          .where(and(
            eq(contentBlocks.id, object_id),
            eq(contentBlocks.parent_id, pageId)
          ));
      }
    });
  }

  /**
   * Get all pages with pagination
   */
  static async getAllPages(limit = 20, offset = 0): Promise<PageBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('article', limit + offset);
    
    // Filter for page-type articles and apply pagination
    const pageBlocks = blocks
      .filter(block => {
        const metadata = block.metadata as Record<string, unknown>;
        return metadata.page_type === 'container';
      })
      .slice(offset, offset + limit);

    return pageBlocks.map(block => this.mapBlockToPage(block));
  }

  /**
   * Get landing pages
   */
  static async getLandingPages(): Promise<PageBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('article', 100);
    
    const landingPages = blocks
      .filter(block => {
        const metadata = block.metadata as Record<string, unknown>;
        return metadata.page_type === 'container' && metadata.is_landing === true;
      })
      .map(block => this.mapBlockToPage(block));

    return landingPages;
  }

  /**
   * Search pages by title
   */
  static async searchPages(query: string, limit = 10): Promise<PageBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('article', 100);
    
    const filtered = blocks
      .filter(block => {
        const metadata = block.metadata as Record<string, unknown>;
        const data = block.data as Record<string, unknown>;
        return metadata.page_type === 'container' && 
               (data.title as string)?.toLowerCase().includes(query.toLowerCase());
      })
      .slice(0, limit)
      .map(block => this.mapBlockToPage(block));

    return filtered;
  }

  /**
   * Get page statistics
   */
  static async getPageStats(pageId: string) {
    const childBlocks = await db
      .select({ count: count() })
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, pageId));

    return {
      object_count: childBlocks[0]?.count || 0,
    };
  }

  /**
   * Update page slug
   */
  static async updatePageSlug(pageId: string, newSlug: string): Promise<void> {
    // Get current block to find current slug
    const block = await SlugService.getBlockById(pageId);
    if (!block || block.renderer !== 'article') {
      throw new Error('Page not found');
    }

    // Update slug using SlugService
    await SlugService.updateSlug(block.slug as string, newSlug, 'article');
  }

  /**
   * Private helper: Enrich page with its objects
   */
  private static async enrichPageWithObjects(page: PageBlock): Promise<PageWithObjects> {
    // Get all child objects for this page
    const childBlocks = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.parent_id, page.id))
      .orderBy(asc(contentBlocks.display_order));

    // Map child blocks to page objects
    const objects: PageObjectWithData[] = childBlocks.map(block => {
      const metadata = block.metadata as Record<string, unknown>;
      
      return {
        id: block.id,
        object_type: block.renderer,
        object_id: block.id,
        display_order: block.display_order,
        layout_size: (metadata.layout_size as string) || 'medium',
        custom_styling: (metadata.custom_styling as Record<string, unknown>) || {},
        created_at: new Date(block.created_at),
        data: block.data as Record<string, unknown>,
      };
    });

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      description: page.description || null,
      is_landing: page.is_landing,
      meta_image: page.meta_image || null,
      theme: page.theme,
      is_published: page.is_published,
      created_at: page.created_at,
      updated_at: page.updated_at,
      objects,
    };
  }

  /**
   * Private helper to map content block to page
   */
  private static mapBlockToPage(block: Record<string, unknown>): PageBlock {
    const data = (block.data as Record<string, unknown>) || {};
    const metadata = (block.metadata as Record<string, unknown>) || {};

    return {
      id: block.id as string,
      slug: block.slug as string,
      title: (data.title as string) || '',
      description: (data.description as string) || null,
      is_landing: (metadata.is_landing as boolean) || false,
      meta_image: (metadata.meta_image as string) || null,
      theme: (data.theme as string) || 'default',
      is_published: block.is_published as boolean,
      created_at: new Date(block.created_at as string),
      updated_at: new Date(block.updated_at as string),
    };
  }

  /**
   * Private helper to map resolved object to page
   */
  private static mapResolvedToPage(resolved: { id: string; type: string; slug: string; data: Record<string, unknown>; metadata: Record<string, unknown> }): PageBlock {
    const data = resolved.data || {};
    const metadata = resolved.metadata || {};

    return {
      id: resolved.id,
      slug: resolved.slug,
      title: (data.title as string) || '',
      description: (data.description as string) || null,
      is_landing: (metadata.is_landing as boolean) || false,
      meta_image: (metadata.meta_image as string) || null,
      theme: (data.theme as string) || 'default',
      is_published: true, // Resolved objects are always published
      created_at: new Date(), // We don't have this from resolved object
      updated_at: new Date(), // We don't have this from resolved object
    };
  }

  /**
   * Private helper to map PageWithObjects to PageBlock
   */
  private static mapPageWithObjectsToPage(pageWithObjects: PageWithObjects): PageBlock {
    return {
      id: pageWithObjects.id,
      slug: pageWithObjects.slug,
      title: pageWithObjects.title,
      description: pageWithObjects.description,
      is_landing: pageWithObjects.is_landing,
      meta_image: pageWithObjects.meta_image,
      theme: pageWithObjects.theme,
      is_published: true, // Assume published if we can retrieve it
      created_at: pageWithObjects.created_at,
      updated_at: pageWithObjects.updated_at,
    };
  }
}