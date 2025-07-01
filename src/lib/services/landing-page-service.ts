import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import type { ContentBlock } from '@/lib/db/schema';

export interface LandingPageComponent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  url?: string | null;
  icon?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  metadata?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateComponentData {
  type: string;
  title: string;
  description?: string | null;
  url?: string | null;
  icon?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active?: boolean;
  metadata?: string | null;
}

export interface UpdateComponentData extends Partial<CreateComponentData> {
  id: string;
}

export interface LandingPageConfig {
  title: string;
  description?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image?: string;
  hero_cta_text?: string;
  hero_cta_url?: string;
  theme?: 'light' | 'dark' | 'custom';
  custom_css?: string;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
}

export class LandingPageService {
  static async getAllComponents(): Promise<LandingPageComponent[]> {
    try {
      const components = await db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.renderer, 'card'))
        .orderBy(asc(contentBlocks.display_order));
      
      return components.map(component => this.mapBlockToComponent(component));
    } catch {
      // Silent error handling
      throw new Error('Failed to fetch landing page components');
    }
  }

  static async getActiveComponents(): Promise<LandingPageComponent[]> {
    try {
      const components = await db
        .select()
        .from(contentBlocks)
        .where(and(
          eq(contentBlocks.renderer, 'card'),
          eq(contentBlocks.is_published, true)
        ))
        .orderBy(asc(contentBlocks.display_order));
      
      return components.map(component => this.mapBlockToComponent(component));
    } catch {
      // Silent error handling
      throw new Error('Failed to fetch active landing page components');
    }
  }

  static async getComponentById(id: string): Promise<LandingPageComponent | null> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(and(
          eq(contentBlocks.id, id),
          eq(contentBlocks.renderer, 'card')
        ))
        .limit(1);

      if (result.length === 0) return null;

      return this.mapBlockToComponent(result[0]);
    } catch {
      // Silent error handling
      throw new Error('Failed to fetch landing page component');
    }
  }

  static async createComponent(data: CreateComponentData): Promise<LandingPageComponent> {
    try {
      const result = await db
        .insert(contentBlocks)
        .values({
          slug: `component-${Date.now()}`, // Generate a unique slug
          renderer: 'card',
          data: {
            title: data.title,
            description: data.description,
            url: data.url,
            icon: data.icon,
            image_url: data.image_url,
          },
          metadata: {
            type: data.type,
            custom_metadata: data.metadata,
          },
          display_order: data.display_order,
          is_published: data.is_active ?? true,
        })
        .returning();

      return this.mapBlockToComponent(result[0]);
    } catch {
      // Silent error handling
      throw new Error('Failed to create landing page component');
    }
  }

  static async updateComponent(data: UpdateComponentData): Promise<LandingPageComponent> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
      };

      // Build the data object for content block
      const blockData: Record<string, unknown> = {};
      const blockMetadata: Record<string, unknown> = {};

      if (data.title !== undefined) blockData.title = data.title;
      if (data.description !== undefined) blockData.description = data.description;
      if (data.url !== undefined) blockData.url = data.url;
      if (data.icon !== undefined) blockData.icon = data.icon;
      if (data.image_url !== undefined) blockData.image_url = data.image_url;
      if (data.type !== undefined) blockMetadata.type = data.type;
      if (data.metadata !== undefined) blockMetadata.custom_metadata = data.metadata;

      if (Object.keys(blockData).length > 0) updateData.data = blockData;
      if (Object.keys(blockMetadata).length > 0) updateData.metadata = blockMetadata;
      if (data.display_order !== undefined) updateData.display_order = data.display_order;
      if (data.is_active !== undefined) updateData.is_published = data.is_active;

      const result = await db
        .update(contentBlocks)
        .set(updateData)
        .where(eq(contentBlocks.id, data.id))
        .returning();

      if (result.length === 0) {
        throw new Error('Component not found');
      }

      return this.mapBlockToComponent(result[0]);
    } catch {
      // Silent error handling
      throw new Error('Failed to update landing page component');
    }
  }

  static async deleteComponent(id: string): Promise<void> {
    try {
      const result = await db
        .delete(contentBlocks)
        .where(eq(contentBlocks.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error('Component not found');
      }
    } catch {
      // Silent error handling
      throw new Error('Failed to delete landing page component');
    }
  }

  static async reorderComponents(componentIds: string[]): Promise<void> {
    try {
      // Update display_order for each component
      const updatePromises = componentIds.map((id, index) =>
        db
          .update(contentBlocks)
          .set({ 
            display_order: index + 1,
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.id, id))
      );

      await Promise.all(updatePromises);
    } catch {
      // Silent error handling
      throw new Error('Failed to reorder landing page components');
    }
  }

  static async getNextDisplayOrder(): Promise<number> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.renderer, 'card'))
        .orderBy(desc(contentBlocks.display_order))
        .limit(1);

      return result.length > 0 ? result[0].display_order + 1 : 1;
    } catch {
      // Silent error handling
      return 1;
    }
  }

  // Helper method to migrate existing default links to landing page components
  static async migrateDefaultLinksToComponents(): Promise<void> {
    try {
      // This would be used to migrate existing default links
      // Implementation would depend on your specific migration needs
      // Silent operation - no console output
    } catch {
      // Silent error handling
      throw new Error('Failed to migrate default links');
    }
  }

  // Private helper to map content block to landing page component
  private static mapBlockToComponent(block: Record<string, unknown>): LandingPageComponent {
    const data = (block.data as Record<string, unknown>) || {};
    const metadata = (block.metadata as Record<string, unknown>) || {};

    return {
      id: block.id as string,
      type: (metadata.type as string) || 'default',
      title: (data.title as string) || '',
      description: (data.description as string) || null,
      url: (data.url as string) || null,
      icon: (data.icon as string) || null,
      image_url: (data.image_url as string) || null,
      display_order: block.display_order as number,
      is_active: block.is_published as boolean,
      metadata: (metadata.custom_metadata as string) || null,
      created_at: new Date(block.created_at as string),
      updated_at: new Date(block.updated_at as string),
    };
  }

  /**
   * Get the current landing page configuration
   */
  static async getLandingPageConfig(): Promise<LandingPageConfig | null> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.renderer, 'article'),
            eq(contentBlocks.slug, 'landing-page-config'),
            eq(contentBlocks.is_published, true)
          )
        )
        .limit(1);

      if (!result[0]) {
        return null;
      }

      return result[0].data as LandingPageConfig;
    } catch {
      // Silent error handling
      return null;
    }
  }

  /**
   * Update landing page configuration
   */
  static async updateLandingPageConfig(config: Partial<LandingPageConfig>): Promise<LandingPageConfig> {
    try {
      // First try to get existing config
      const existing = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.renderer, 'article'),
            eq(contentBlocks.slug, 'landing-page-config')
          )
        )
        .limit(1);

      if (existing[0]) {
        // Update existing config
        const currentData = existing[0].data as LandingPageConfig;
        const updatedData = { ...currentData, ...config };

        await db
          .update(contentBlocks)
          .set({
            data: updatedData,
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.id, existing[0].id));

        return updatedData;
      } else {
        // Create new config
        const newData = {
          title: 'Landing Page',
          theme: 'light' as const,
          ...config,
        };

        await db.insert(contentBlocks).values({
          slug: 'landing-page-config',
          renderer: 'article',
          data: newData,
          metadata: {
            type: 'landing_page_config',
            created_via: 'landing_page_service',
          },
          is_published: true,
          type: 'root',
          display_order: 0,
        });

        return newData;
      }
    } catch {
      // Silent error handling
      throw new Error('Failed to update landing page configuration');
    }
  }

  /**
   * Get landing page blocks in display order
   */
  static async getLandingPageBlocks(): Promise<ContentBlock[]> {
    try {
      const result = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.is_published, true),
            eq(contentBlocks.type, 'root')
          )
        )
        .orderBy(asc(contentBlocks.display_order), desc(contentBlocks.updated_at));

      return result as ContentBlock[];
    } catch {
      // Silent error handling
      return [];
    }
  }

  /**
   * Set blocks for landing page with specific order
   */
  static async setLandingPageBlocks(blockIds: string[]): Promise<void> {
    try {
      // Update display order for each block
      for (let i = 0; i < blockIds.length; i++) {
        await db
          .update(contentBlocks)
          .set({
            display_order: i,
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.id, blockIds[i]));
      }
    } catch {
      // Silent error handling
      throw new Error('Failed to set landing page blocks');
    }
  }

  /**
   * Add a block to the landing page
   */
  static async addBlockToLandingPage(blockId: string, position?: number): Promise<void> {
    try {
      const displayOrder = position ?? 999; // Default to end if no position specified

      await db
        .update(contentBlocks)
        .set({
          display_order: displayOrder,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.id, blockId));
    } catch {
      // Silent error handling
      throw new Error('Failed to add block to landing page');
    }
  }

  /**
   * Remove a block from the landing page (sets display_order to 0)
   */
  static async removeBlockFromLandingPage(blockId: string): Promise<void> {
    try {
      await db
        .update(contentBlocks)
        .set({
          display_order: 0,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.id, blockId));
    } catch {
      // Silent error handling
      throw new Error('Failed to remove block from landing page');
    }
  }

  /**
   * Get landing page preview data
   */
  static async getLandingPagePreview(): Promise<{
    config: LandingPageConfig | null;
    blocks: ContentBlock[];
    totalBlocks: number;
  }> {
    try {
      const [config, blocks] = await Promise.all([
        this.getLandingPageConfig(),
        this.getLandingPageBlocks(),
      ]);

      return {
        config,
        blocks,
        totalBlocks: blocks.length,
      };
    } catch {
      // Silent error handling
      return {
        config: null,
        blocks: [],
        totalBlocks: 0,
      };
    }
  }

  /**
   * Reset landing page to default state
   */
  static async resetLandingPage(): Promise<void> {
    try {
      // Reset all blocks to display_order 0
      await db
        .update(contentBlocks)
        .set({
          display_order: 0,
          updated_at: new Date(),
        })
        .where(eq(contentBlocks.type, 'root'));

      // Delete landing page config
      await db
        .delete(contentBlocks)
        .where(
          and(
            eq(contentBlocks.renderer, 'article'),
            eq(contentBlocks.slug, 'landing-page-config')
          )
        );
    } catch {
      // Silent error handling
      throw new Error('Failed to reset landing page');
    }
  }

  /**
   * Duplicate landing page configuration
   */
  static async duplicateLandingPageConfig(newSlug: string): Promise<LandingPageConfig> {
    try {
      const currentConfig = await this.getLandingPageConfig();
      
      if (!currentConfig) {
        throw new Error('No landing page configuration to duplicate');
      }

      // Create new config with different slug
      await db.insert(contentBlocks).values({
        slug: newSlug,
        renderer: 'article',
        data: currentConfig,
        metadata: {
          type: 'landing_page_config',
          created_via: 'landing_page_service',
          duplicated_from: 'landing-page-config',
        },
        is_published: true,
        type: 'root',
        display_order: 0,
      });

      return currentConfig;
    } catch {
      // Silent error handling
      throw new Error('Failed to duplicate landing page configuration');
    }
  }

  /**
   * Get landing page analytics/stats
   */
  static async getLandingPageStats(): Promise<{
    configExists: boolean;
    totalBlocks: number;
    publishedBlocks: number;
    privateBlocks: number;
  }> {
    try {
      const [config, allBlocks, publishedBlocks, privateBlocks] = await Promise.all([
        this.getLandingPageConfig(),
        db.select({ count: contentBlocks.id }).from(contentBlocks).where(eq(contentBlocks.type, 'root')),
        db.select({ count: contentBlocks.id }).from(contentBlocks).where(
          and(
            eq(contentBlocks.type, 'root'),
            eq(contentBlocks.is_published, true)
          )
        ),
        db.select({ count: contentBlocks.id }).from(contentBlocks).where(
          and(
            eq(contentBlocks.type, 'root'),
            eq(contentBlocks.is_private, true)
          )
        ),
      ]);

      return {
        configExists: !!config,
        totalBlocks: allBlocks.length,
        publishedBlocks: publishedBlocks.length,
        privateBlocks: privateBlocks.length,
      };
    } catch {
      // Silent error handling
      return {
        configExists: false,
        totalBlocks: 0,
        publishedBlocks: 0,
        privateBlocks: 0,
      };
    }
  }
} 