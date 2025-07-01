import { SlugService } from './slug-service';
import { z } from 'zod';
import sharp from 'sharp';
import { lookup } from 'mime-types';

// Image creation and update schemas
export const createImageSchema = z.object({
  title: z.string().min(1).max(255),
  alt_text: z.string().max(255).optional(),
  caption: z.string().optional(),
  slug: z.string().min(3).max(50),
  url: z.string().url(),
});

export const updateImageSchema = createImageSchema.partial().omit({ slug: true, url: true });

// Type definitions
export type CreateImageData = z.infer<typeof createImageSchema>;
export type UpdateImageData = z.infer<typeof updateImageSchema>;

export interface ImageMetadata {
  width: number;
  height: number;
  file_size: number;
  mime_type: string;
  blurhash?: string;
}

export interface ProcessedImageData extends CreateImageData {
  metadata: ImageMetadata;
}

export interface ImageBlock {
  id: string;
  slug: string;
  title: string;
  alt_text?: string | null;
  caption?: string | null;
  url: string;
  width: number;
  height: number;
  file_size: number;
  mime_type: string;
  blurhash?: string | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * ImageService - Manages image blocks with rich metadata and optimization
 * 
 * Handles image processing, metadata extraction, and slug management for image blocks.
 * Integrates with Sharp.js for server-side image processing and optimization.
 * Uses the unified contentBlocks architecture with renderer: 'image'.
 */
export class ImageService {
  /**
   * Create a new image block with metadata extraction
   */
  static async createImage(data: CreateImageData): Promise<ImageBlock> {
    // Validate input
    const validatedData = createImageSchema.parse(data);

    // Extract metadata from image URL
    const metadata = await this.extractImageMetadata(validatedData.url);

    // Create content block using SlugService
    const blockId = await SlugService.createBlock({
      slug: validatedData.slug,
      renderer: 'image',
      data: {
        title: validatedData.title,
        alt_text: validatedData.alt_text || null,
        caption: validatedData.caption || null,
        url: validatedData.url,
        width: metadata.width,
        height: metadata.height,
        file_size: metadata.file_size,
        mime_type: metadata.mime_type,
        blurhash: metadata.blurhash || null,
      },
      metadata: {
        extracted_at: new Date().toISOString(),
        processing_version: '1.0',
      },
      is_published: true,
    });

    // Retrieve and return the created block
    const createdBlock = await this.getImageById(blockId);
    if (!createdBlock) {
      throw new Error('Failed to retrieve created image block');
    }

    return createdBlock;
  }

  /**
   * Get image by ID
   */
  static async getImageById(id: string): Promise<ImageBlock | null> {
    const block = await SlugService.getBlockById(id);
    
    if (!block || block.renderer !== 'image') {
      return null;
    }

    return this.mapBlockToImage(block);
  }

  /**
   * Get image by slug
   */
  static async getImageBySlug(slug: string): Promise<ImageBlock | null> {
    const resolved = await SlugService.resolveSlug(slug);
    
    if (!resolved || resolved.type !== 'image') {
      return null;
    }

    return this.mapResolvedToImage(resolved);
  }

  /**
   * Update image metadata
   */
  static async updateImage(id: string, data: UpdateImageData): Promise<ImageBlock> {
    const validatedData = updateImageSchema.parse(data);

    // Get current block
    const currentBlock = await SlugService.getBlockById(id);
    if (!currentBlock || currentBlock.renderer !== 'image') {
      throw new Error('Image block not found');
    }

    // Merge current data with updates
    const currentData = currentBlock.data as Record<string, unknown>;
    const updatedData = {
      ...currentData,
      ...Object.fromEntries(
        Object.entries(validatedData).filter(([, value]) => value !== undefined)
      ),
    };

    // Update the block
    await SlugService.updateBlockData(id, updatedData);

    // Return updated block
    const updatedBlock = await this.getImageById(id);
    if (!updatedBlock) {
      throw new Error('Failed to retrieve updated image block');
    }

    return updatedBlock;
  }

  /**
   * Delete image block
   */
  static async deleteImage(id: string): Promise<void> {
    // Verify it's an image block
    const block = await SlugService.getBlockById(id);
    if (!block || block.renderer !== 'image') {
      throw new Error('Image block not found');
    }

    // Deactivate the block
    await SlugService.deactivateBlock(id);
  }

  /**
   * Get all images with pagination
   */
  static async getAllImages(limit = 20, offset = 0): Promise<ImageBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('image', limit);
    return blocks.map(block => this.mapBlockToImage(block)).slice(offset, offset + limit);
  }

  /**
   * Search images by title or alt text
   */
  static async searchImages(query: string, limit = 10): Promise<ImageBlock[]> {
    // Get all image blocks and filter by title/alt_text
    const blocks = await SlugService.getBlocksByRenderer('image', 100);
    
    const filtered = blocks
      .map(block => this.mapBlockToImage(block))
      .filter(image => 
        image.title.toLowerCase().includes(query.toLowerCase()) ||
        (image.alt_text && image.alt_text.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, limit);

    return filtered;
  }

  /**
   * Get images by dimensions (useful for finding specific aspect ratios)
   */
  static async getImagesByDimensions(
    minWidth?: number,
    maxWidth?: number,
    minHeight?: number,
    maxHeight?: number,
    limit = 20
  ): Promise<ImageBlock[]> {
    const blocks = await SlugService.getBlocksByRenderer('image', 100);
    
    const filtered = blocks
      .map(block => this.mapBlockToImage(block))
      .filter(image => {
        if (minWidth && image.width < minWidth) return false;
        if (maxWidth && image.width > maxWidth) return false;
        if (minHeight && image.height < minHeight) return false;
        if (maxHeight && image.height > maxHeight) return false;
        return true;
      })
      .slice(0, limit);

    return filtered;
  }

  /**
   * Update image slug
   */
  static async updateImageSlug(imageId: string, newSlug: string): Promise<void> {
    // Get current block to find current slug
    const block = await SlugService.getBlockById(imageId);
    if (!block || block.renderer !== 'image') {
      throw new Error('Image block not found');
    }

    // Update slug using SlugService
    await SlugService.updateSlug(block.slug as string, newSlug, 'image');
  }

  /**
   * Process and optimize image from buffer
   */
  static async processImageBuffer(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
      format = 'webp',
    } = options;

    try {
      // Process image with Sharp
      let sharpInstance = sharp(buffer);

      // Get original metadata
      const originalMetadata = await sharpInstance.metadata();

      // Resize if needed
      if (originalMetadata.width && originalMetadata.width > maxWidth ||
          originalMetadata.height && originalMetadata.height > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert format and optimize
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
      }

      // Generate processed buffer
      const processedBuffer = await sharpInstance.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      // Create metadata object
      const metadata: ImageMetadata = {
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        file_size: processedBuffer.length,
        mime_type: `image/${format}`,
      };

      return {
        buffer: processedBuffer,
        metadata,
      };
    } catch {
      // Silent error handling
      throw new Error('Failed to process image');
    }
  }

  /**
   * Generate responsive image variants
   */
  static async generateResponsiveVariants(
    buffer: Buffer,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<{ size: number; buffer: Buffer; metadata: ImageMetadata }[]> {
    const variants = [];

    for (const size of sizes) {
      try {
        const processed = await this.processImageBuffer(buffer, {
          maxWidth: size,
          maxHeight: size,
          format: 'webp',
        });

        variants.push({
          size,
          buffer: processed.buffer,
          metadata: processed.metadata,
        });
      } catch {
        // Silent error handling - skip this variant
      }
    }

    return variants;
  }

  /**
   * Extract metadata from image URL
   * Private helper method
   */
  private static async extractImageMetadata(url: string): Promise<ImageMetadata> {
    try {
      // Fetch image from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Extract metadata with Sharp
      const metadata = await sharp(buffer).metadata();
      
      // Determine MIME type
      const mimeType = lookup(url) || metadata.format ? `image/${metadata.format}` : 'image/jpeg';

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        file_size: buffer.length,
        mime_type: mimeType,
      };
    } catch {
      // Silent error handling
      
      // Return default metadata if extraction fails
      return {
        width: 0,
        height: 0,
        file_size: 0,
        mime_type: 'image/jpeg',
      };
    }
  }

  /**
   * Generate blurhash for progressive loading
   * Note: This would require a blurhash library in a real implementation
   */
  private static async generateBlurhash(): Promise<string | null> {
    try {
      // Placeholder for blurhash generation
      // In a real implementation, you would use the 'blurhash' package
      // const blurhash = encode(pixels, width, height, 4, 4);
      return null; // Return null for now
    } catch {
      // Silent error handling
      return null;
    }
  }

  /**
   * Get image statistics
   */
  static async getImageStats() {
    const stats = await SlugService.getBlockStats();
    const imageBlocks = await SlugService.getBlocksByRenderer('image', 1000);
    
    // Calculate total file size
    const totalSize = imageBlocks.reduce((sum, block) => {
      const data = block.data as Record<string, unknown>;
      return sum + ((data.file_size as number) || 0);
    }, 0);

    return {
      total_images: imageBlocks.length,
      total_size_bytes: totalSize,
      total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      total_blocks: stats.total_blocks,
    };
  }

  /**
   * Validate image URL accessibility
   */
  static async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok && response.headers.get('content-type')?.startsWith('image/') === true;
    } catch {
      return false;
    }
  }

  /**
   * Private helper to map content block to image
   */
  private static mapBlockToImage(block: Record<string, unknown>): ImageBlock {
    const data = (block.data as Record<string, unknown>) || {};

    return {
      id: block.id as string,
      slug: block.slug as string,
      title: (data.title as string) || '',
      alt_text: (data.alt_text as string) || null,
      caption: (data.caption as string) || null,
      url: (data.url as string) || '',
      width: (data.width as number) || 0,
      height: (data.height as number) || 0,
      file_size: (data.file_size as number) || 0,
      mime_type: (data.mime_type as string) || 'image/jpeg',
      blurhash: (data.blurhash as string) || null,
      is_published: block.is_published as boolean,
      created_at: new Date(block.created_at as string),
      updated_at: new Date(block.updated_at as string),
    };
  }

  /**
   * Private helper to map resolved object to image
   */
  private static mapResolvedToImage(resolved: { id: string; type: string; slug: string; data: Record<string, unknown>; metadata: Record<string, unknown> }): ImageBlock {
    const data = resolved.data || {};

    return {
      id: resolved.id,
      slug: resolved.slug,
      title: (data.title as string) || '',
      alt_text: (data.alt_text as string) || null,
      caption: (data.caption as string) || null,
      url: (data.url as string) || '',
      width: (data.width as number) || 0,
      height: (data.height as number) || 0,
      file_size: (data.file_size as number) || 0,
      mime_type: (data.mime_type as string) || 'image/jpeg',
      blurhash: (data.blurhash as string) || null,
      is_published: true, // Resolved objects are always published
      created_at: new Date(), // We don't have this from resolved object
      updated_at: new Date(), // We don't have this from resolved object
    };
  }
}