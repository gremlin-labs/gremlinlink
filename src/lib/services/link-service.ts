import { db } from '@/lib/db';
import { contentBlocks, clicks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SlugService } from './slug-service';
import { 
  slugSchema, 
  urlSchema, 
  generateRandomSlug, 
  sanitizeUrl, 
  isReservedSlug,
} from '@/lib/urlShortener';

export interface CreateLinkData {
  slug?: string;
  target_url: string;
  title: string;
  description?: string;
  is_default?: boolean;
  display_order?: number;
  icon?: string;
  image_url?: string;
}

export interface UpdateLinkData {
  slug?: string;
  target_url?: string;
  title?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  display_order?: number;
  icon?: string;
  image_url?: string;
}

export interface LinkBlock {
  id: string;
  slug: string;
  target_url: string;
  title: string;
  description?: string | null;
  clicks_count: number;
  is_active: boolean;
  is_default: boolean;
  display_order?: number | null;
  icon?: string | null;
  image_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class LinkService {
  static async createLink(data: CreateLinkData): Promise<LinkBlock> {
    // Validate and sanitize target URL
    const parsedUrl = urlSchema.safeParse(data.target_url);
    if (!parsedUrl.success) {
      throw new Error('Invalid target URL');
    }
    const normalizedUrl = sanitizeUrl(data.target_url);

    // Handle slug generation/validation
    let slug = data.slug;
    if (slug) {
      const parsedSlug = slugSchema.safeParse(slug);
      if (!parsedSlug.success) {
        throw new Error('Invalid slug format. Use 3-50 alphanumeric characters, hyphens, or underscores.');
      }
      if (isReservedSlug(slug)) {
        throw new Error('This slug is reserved and cannot be used.');
      }
      
      // Check if slug already exists
      const isAvailable = await SlugService.isSlugAvailable(slug);
      if (!isAvailable) {
        throw new Error('This slug is already taken.');
      }
    } else {
      // Generate random slug for regular links (not default links)
      if (!data.is_default) {
        let attempts = 0;
        do {
          slug = generateRandomSlug(6);
          const isAvailable = await SlugService.isSlugAvailable(slug);
          if (isAvailable) break;
          attempts++;
        } while (attempts < 10);
        
        if (attempts >= 10) {
          throw new Error('Unable to generate unique slug. Please try again.');
        }
      } else {
        throw new Error('Default links must have a slug.');
      }
    }

    // Create content block using SlugService
    const blockId = await SlugService.createBlock({
      slug: slug!,
      renderer: 'redirect',
      data: {
        target_url: normalizedUrl,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        is_default: data.is_default || false,
        display_order: data.display_order || null,
        icon: data.icon || null,
        image_url: data.image_url || null,
        clicks_count: 0,
      },
      metadata: {
        created_via: 'link_service',
        link_type: data.is_default ? 'default' : 'regular',
      },
      is_published: true,
    });

    // Retrieve and return the created block
    const createdBlock = await this.getLinkById(blockId);
    if (!createdBlock) {
      throw new Error('Failed to retrieve created link block');
    }

    return createdBlock;
  }

  static async updateLink(id: string, data: UpdateLinkData): Promise<LinkBlock> {
    // Get current block
    const currentBlock = await SlugService.getBlockById(id);
    if (!currentBlock || currentBlock.renderer !== 'redirect') {
      throw new Error('Link not found');
    }

    const currentData = currentBlock.data as Record<string, unknown>;
    const updatedData = { ...currentData };

    if (data.target_url !== undefined) {
      const parsedUrl = urlSchema.safeParse(data.target_url);
      if (!parsedUrl.success) {
        throw new Error('Invalid target URL');
      }
      updatedData.target_url = sanitizeUrl(data.target_url);
    }

    if (data.slug !== undefined) {
      const parsedSlug = slugSchema.safeParse(data.slug);
      if (!parsedSlug.success) {
        throw new Error('Invalid slug format');
      }
      if (isReservedSlug(data.slug)) {
        throw new Error('This slug is reserved');
      }
      
      // Check if new slug conflicts with existing (unless it's the same slug)
      if (data.slug !== currentBlock.slug) {
        const isAvailable = await SlugService.isSlugAvailable(data.slug);
        if (!isAvailable) {
          throw new Error('This slug is already taken');
        }
        
        // Update slug using SlugService
        await SlugService.updateSlug(currentBlock.slug as string, data.slug, 'redirect');
      }
    }

    if (data.title !== undefined) {
      updatedData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updatedData.description = data.description?.trim() || null;
    }

    if (data.is_default !== undefined) {
      updatedData.is_default = data.is_default;
    }

    if (data.display_order !== undefined) {
      updatedData.display_order = data.display_order;
    }

    if (data.icon !== undefined) {
      updatedData.icon = data.icon;
    }

    if (data.image_url !== undefined) {
      updatedData.image_url = data.image_url;
    }

    // Update block data
    await SlugService.updateBlockData(id, updatedData);

    // Update published status if is_active changed
    if (data.is_active !== undefined) {
      if (data.is_active) {
        // Reactivate block by updating is_published
        await db
          .update(contentBlocks)
          .set({ 
            is_published: true,
            updated_at: new Date(),
          })
          .where(eq(contentBlocks.id, id));
      } else {
        // Deactivate block
        await SlugService.deactivateBlock(id);
      }
    }

    // Return updated block
    const updatedBlock = await this.getLinkById(id);
    if (!updatedBlock) {
      throw new Error('Failed to retrieve updated link');
    }

    return updatedBlock;
  }

  static async deleteLink(id: string): Promise<LinkBlock> {
    // Verify it's a link block
    const block = await SlugService.getBlockById(id);
    if (!block || block.renderer !== 'redirect') {
      throw new Error('Link not found');
    }

    const linkBlock = this.mapBlockToLink(block);

    // Deactivate the block
    await SlugService.deactivateBlock(id);

    return linkBlock;
  }

  static async getLink(id: string): Promise<LinkBlock | null> {
    return this.getLinkById(id);
  }

  static async getLinkById(id: string): Promise<LinkBlock | null> {
    const block = await SlugService.getBlockById(id);
    
    if (!block || block.renderer !== 'redirect') {
      return null;
    }

    return this.mapBlockToLink(block);
  }

  static async getLinkBySlug(slug: string): Promise<LinkBlock | null> {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'redirect') {
      return null;
    }

    return this.mapResolvedToLink(resolved);
  }

  static async getAllLinks(): Promise<LinkBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('redirect', 1000);
    return blocks.map(block => this.mapBlockToLink(block));
  }

  static async getRegularLinks(): Promise<LinkBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('redirect', 1000);
    return blocks
      .map(block => this.mapBlockToLink(block))
      .filter(link => !link.is_default);
  }

  static async getDefaultLinks(): Promise<LinkBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('redirect', 1000);
    const defaultLinks = blocks
      .map(block => this.mapBlockToLink(block))
      .filter(link => link.is_default)
      .sort((a, b) => {
        // Sort by display_order first, then by created_at
        if (a.display_order !== null && b.display_order !== null && a.display_order !== undefined && b.display_order !== undefined) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== null && a.display_order !== undefined) return -1;
        if (b.display_order !== null && b.display_order !== undefined) return 1;
        return b.created_at.getTime() - a.created_at.getTime();
      });

    return defaultLinks;
  }

  static async incrementClickCount(linkId: string, metadata?: {
    userAgent?: string;
    referrer?: string;
    ipAddress?: string;
    [key: string]: unknown;
  }): Promise<void> {
    // Get current block to increment click count
    const block = await SlugService.getBlockById(linkId);
    if (!block || block.renderer !== 'redirect') {
      throw new Error('Link not found');
    }

    const currentData = block.data as Record<string, unknown>;
    const currentClickCount = (currentData.clicks_count as number) || 0;

    // Update click count in block data
    await SlugService.updateBlockData(linkId, {
      ...currentData,
      clicks_count: currentClickCount + 1,
    });

    // Also record click in clicks table for analytics with enhanced data
    try {
      // Basic country detection from IP (placeholder)
      let country: string | undefined;
      if (metadata?.ipAddress) {
        // In production, implement proper GeoIP lookup here
        // country = await detectCountryFromIP(metadata.ipAddress);
      }

      await db.insert(clicks).values({
        block_id: linkId,
        timestamp: new Date(),
        referrer: metadata?.referrer,
        user_agent: metadata?.userAgent,
        ip_address: metadata?.ipAddress,
        country: country,
        metadata: {
          click_type: 'link_redirect',
          ...metadata,
        },
      });
    } catch {
      // Silent error handling - don't fail if analytics insert fails
    }
  }

  /**
   * Private helper to map content block to link
   */
  private static mapBlockToLink(block: Record<string, unknown>): LinkBlock {
    const data = (block.data as Record<string, unknown>) || {};

    return {
      id: block.id as string,
      slug: block.slug as string,
      target_url: (data.target_url as string) || '',
      title: (data.title as string) || '',
      description: (data.description as string) || null,
      clicks_count: (data.clicks_count as number) || 0,
      is_active: block.is_published as boolean,
      is_default: (data.is_default as boolean) || false,
      display_order: (data.display_order as number) || null,
      icon: (data.icon as string) || null,
      image_url: (data.image_url as string) || null,
      created_at: new Date(block.created_at as string),
      updated_at: new Date(block.updated_at as string),
    };
  }

  /**
   * Private helper to map resolved object to link
   */
  private static mapResolvedToLink(resolved: { id: string; type: string; slug: string; data: Record<string, unknown>; metadata: Record<string, unknown> }): LinkBlock {
    const data = resolved.data || {};

    return {
      id: resolved.id,
      slug: resolved.slug,
      target_url: (data.target_url as string) || '',
      title: (data.title as string) || '',
      description: (data.description as string) || null,
      clicks_count: (data.clicks_count as number) || 0,
      is_active: true, // Resolved objects are always active
      is_default: (data.is_default as boolean) || false,
      display_order: (data.display_order as number) || null,
      icon: (data.icon as string) || null,
      image_url: (data.image_url as string) || null,
      created_at: new Date(), // We don't have this from resolved object
      updated_at: new Date(), // We don't have this from resolved object
    };
  }
}