import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { ContentBlock } from '@/lib/db/schema';
import { SlugService } from './slug-service';

export interface LandingBlockData {
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  link_text?: string;
  background_color?: string;
  text_color?: string;
  layout?: 'hero' | 'feature' | 'cta' | 'testimonial';
}

export class LandingBlockService {
  /**
   * Get the current landing block
   */
  static async getLandingBlock(): Promise<ContentBlock | null> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.is_landing_block, true),
            eq(contentBlocks.is_published, true)
          )
        )
        .limit(1);

      return result[0] as ContentBlock || null;
    } catch {
      // Silent error handling
      return null;
    }
  }

  /**
   * Set a block as the landing block (removes landing status from all other blocks)
   * Landing blocks are automatically made public
   */
  static async setLandingBlock(blockId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Start a transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // First, remove landing status from all blocks
        await tx
          .update(contentBlocks)
          .set({ 
            is_landing_block: false,
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.is_landing_block, true));

        // Then set the new landing block and force it to be public
        await tx
          .update(contentBlocks)
          .set({ 
            is_landing_block: true,
            is_private: false, // Force landing blocks to be public
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.id, blockId));
      });

      return { success: true };
    } catch (error) {
      // Silent error handling
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set landing block',
      };
    }
  }

  /**
   * Remove landing block status (no landing block)
   */
  static async removeLandingBlock(): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(contentBlocks)
        .set({ 
          is_landing_block: false,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.is_landing_block, true));

      return { success: true };
    } catch (error) {
      // Silent error handling
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove landing block',
      };
    }
  }

  /**
   * Get all public blocks for the index page (when no landing block is set)
   */
  static async getPublicBlocks(): Promise<ContentBlock[]> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.is_published, true),
            eq(contentBlocks.is_private, false),
            eq(contentBlocks.type, 'root') // Only root blocks for the index
          )
        )
        .orderBy(desc(contentBlocks.updated_at));

      return result as ContentBlock[];
    } catch {
      // Silent error handling
      return [];
    }
  }

  /**
   * Toggle privacy status of a block
   */
  static async togglePrivacy(blockId: string): Promise<{ success: boolean; isPrivate?: boolean; error?: string }> {
    try {
      // First get the current privacy status
      const block = await db
        .select({ is_private: contentBlocks.is_private })
        .from(contentBlocks)
        .where(eq(contentBlocks.id, blockId))
        .limit(1);

      if (!block[0]) {
        return { success: false, error: 'Block not found' };
      }

      const newPrivacyStatus = !block[0].is_private;

      // Update the privacy status
      await db
        .update(contentBlocks)
        .set({ 
          is_private: newPrivacyStatus,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.id, blockId));

      return { success: true, isPrivate: newPrivacyStatus };
    } catch (error) {
      // Silent error handling
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to toggle privacy',
      };
    }
  }

  /**
   * Get landing block status and public block count for admin dashboard
   */
  static async getLandingStatus(): Promise<{
    hasLandingBlock: boolean;
    landingBlock?: ContentBlock;
    publicBlockCount: number;
    totalBlockCount: number;
  }> {
    try {
      const [landingBlock, publicBlocks, totalBlocks] = await Promise.all([
        this.getLandingBlock(),
        db.select({ count: contentBlocks.id }).from(contentBlocks).where(
          and(
            eq(contentBlocks.is_published, true),
            eq(contentBlocks.is_private, false),
            eq(contentBlocks.type, 'root'),
          )
        ),
        db.select({ count: contentBlocks.id }).from(contentBlocks).where(
          and(
            eq(contentBlocks.is_published, true),
            eq(contentBlocks.type, 'root'),
          )
        ),
      ]);

      return {
        hasLandingBlock: !!landingBlock,
        landingBlock: landingBlock || undefined,
        publicBlockCount: publicBlocks.length,
        totalBlockCount: totalBlocks.length,
      };
    } catch {
      // Silent error handling
      return {
        hasLandingBlock: false,
        publicBlockCount: 0,
        totalBlockCount: 0,
      };
    }
  }

  /**
   * Create a custom landing block using SlugService
   */
  static async createCustomLandingBlock(slug: string, data: LandingBlockData) {
    try {
      // Create content block using SlugService
      const blockId = await SlugService.createBlock({
        slug,
        renderer: 'card',
        data: {
          ...data,
          block_type: 'landing_block',
        },
        metadata: {
          created_via: 'landing_block_service',
          layout: data.layout || 'feature',
        },
        is_published: true,
      });

      return blockId;
    } catch {
      // Silent error handling
      throw new Error('Failed to create landing block');
    }
  }

  /**
   * Get a custom landing block by slug
   */
  static async getCustomLandingBlock(slug: string) {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'card') {
      return null;
    }

    const data = resolved.data as Record<string, unknown>;
    if (data.block_type !== 'landing_block') {
      return null;
    }

    return {
      id: resolved.id,
      slug: resolved.slug,
      ...data,
    };
  }

  /**
   * Update a custom landing block
   */
  static async updateCustomLandingBlock(slug: string, data: Partial<LandingBlockData>) {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'card') {
      throw new Error('Landing block not found');
    }

    const currentData = resolved.data as Record<string, unknown>;
    if (currentData.block_type !== 'landing_block') {
      throw new Error('Not a landing block');
    }

    const updatedData = {
      ...currentData,
      ...data,
    };

    await SlugService.updateBlockData(resolved.id, updatedData);
    
    return this.getCustomLandingBlock(slug);
  }

  /**
   * Delete a custom landing block
   */
  static async deleteCustomLandingBlock(slug: string) {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'card') {
      throw new Error('Landing block not found');
    }

    const data = resolved.data as Record<string, unknown>;
    if (data.block_type !== 'landing_block') {
      throw new Error('Not a landing block');
    }

    await SlugService.deactivateBlock(resolved.id);
  }

  /**
   * Get all custom landing blocks
   */
  static async getAllCustomLandingBlocks() {
    const blocks = await SlugService.getBlocksByRenderer('card', 1000);
    
    return blocks
      .filter(block => {
        const data = block.data as Record<string, unknown>;
        return data.block_type === 'landing_block';
      })
      .map(block => ({
        id: block.id,
        slug: block.slug,
        ...(block.data as Record<string, unknown>),
        created_at: new Date(block.created_at),
        updated_at: new Date(block.updated_at),
      }));
  }

  /**
   * Get custom landing blocks by layout
   */
  static async getCustomLandingBlocksByLayout(layout: string) {
    const allBlocks = await this.getAllCustomLandingBlocks();
    
    return allBlocks.filter(block => {
      const blockData = block as Record<string, unknown>;
      return blockData.layout === layout;
    });
  }

  /**
   * Search custom landing blocks
   */
  static async searchCustomLandingBlocks(query: string) {
    const allBlocks = await this.getAllCustomLandingBlocks();
    
    return allBlocks.filter(block => {
      const blockData = block as Record<string, unknown>;
      return (blockData.title as string)?.toLowerCase().includes(query.toLowerCase()) ||
             (blockData.description as string)?.toLowerCase().includes(query.toLowerCase());
    });
  }

  /**
   * Reorder custom landing blocks
   */
  static async reorderCustomLandingBlocks(blockOrders: { slug: string; display_order: number }[]) {
    try {
      for (const { slug, display_order } of blockOrders) {
        const resolved = await SlugService.resolveSlug(slug);
        if (resolved && resolved.type === 'card') {
          const data = resolved.data as Record<string, unknown>;
          if (data.block_type === 'landing_block') {
            await db
              .update(contentBlocks)
              .set({ 
                display_order,
                updated_at: new Date(),
              })
              .where(eq(contentBlocks.id, resolved.id));
          }
        }
      }
    } catch {
      // Silent error handling
      throw new Error('Failed to reorder landing blocks');
    }
  }

  /**
   * Duplicate a custom landing block
   */
  static async duplicateCustomLandingBlock(sourceSlug: string, newSlug: string) {
    const sourceBlock = await this.getCustomLandingBlock(sourceSlug);
    
    if (!sourceBlock) {
      throw new Error('Source landing block not found');
    }

    // Remove id and slug from source data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, slug, created_at, updated_at, ...blockData } = sourceBlock as Record<string, unknown>;

    return this.createCustomLandingBlock(newSlug, blockData as unknown as LandingBlockData);
  }

  /**
   * Get custom landing block statistics
   */
  static async getCustomLandingBlockStats() {
    const allBlocks = await this.getAllCustomLandingBlocks();
    
    const layoutCounts = allBlocks.reduce((acc, block) => {
      const blockData = block as Record<string, unknown>;
      const layout = (blockData.layout as string) || 'feature';
      acc[layout] = (acc[layout] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_blocks: allBlocks.length,
      layout_distribution: layoutCounts,
    };
  }

  /**
   * Bulk update custom landing blocks
   */
  static async bulkUpdateCustomLandingBlocks(updates: { slug: string; data: Partial<LandingBlockData> }[]) {
    const results = [];
    
    for (const { slug, data } of updates) {
      try {
        const updated = await this.updateCustomLandingBlock(slug, data);
        results.push({ slug, success: true, data: updated });
      } catch {
        // Silent error handling
        results.push({ slug, success: false, error: 'Update failed' });
      }
    }

    return results;
  }
} 