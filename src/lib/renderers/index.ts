import { ContentBlock } from '@/lib/db/unified-schema';

/**
 * UNIFIED RENDERER SYSTEM
 * 
 * This system handles rendering different content types through a factory pattern.
 * Each renderer knows how to process and display its specific content type.
 * 
 * Key Benefits:
 * - Extensible: Add new content types without changing core logic
 * - Type-safe: Each renderer validates its expected data structure
 * - Performance: Optimized rendering paths for different content types
 * - Consistent: Unified interface for all content rendering
 */

// Base renderer interface
export interface BlockRenderer {
  /**
   * Render the block for web display
   */
  render(block: ContentBlock, context?: RenderContext): Promise<RenderResult>;
  
  /**
   * Validate block data structure
   */
  validate(data: Record<string, unknown>): boolean;
  
  /**
   * Get SEO metadata for the block
   */
  getMetadata(block: ContentBlock): BlockMetadata;
  
  /**
   * Get cache TTL for this block type (in seconds)
   */
  getCacheTTL(): number;
}

// Render context for additional information
export interface RenderContext {
  request?: Request;
  userAgent?: string;
  referrer?: string;
  ipAddress?: string;
  isPreview?: boolean;
}

// Render result types
export type RenderResult = 
  | { type: 'redirect'; url: string; statusCode?: number }
  | { type: 'component'; component: React.ReactNode; metadata?: BlockMetadata }
  | { type: 'json'; data: Record<string, unknown>; metadata?: BlockMetadata }
  | { type: 'error'; message: string; statusCode?: number };

// SEO metadata structure
export interface BlockMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  robots?: string;
  schemaOrg?: Record<string, unknown>;
}

/**
 * REDIRECT RENDERER
 * 
 * Handles URL shortener functionality with ultra-fast redirects
 */
export class RedirectRenderer implements BlockRenderer {
  async render(block: ContentBlock): Promise<RenderResult> {
    const data = block.data as Record<string, unknown>;
    
    // Handle malformed data structure where URL might be nested
    let url = data.url as string;
    const statusCode = data.statusCode as number;
    
    if (!url && typeof data === 'object') {
      // Check for nested structures from legacy data
      for (const value of Object.values(data)) {
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          url = value;
          break;
        }
      }
    }
    
    if (!url) {
      return { type: 'error', message: 'Redirect URL not found', statusCode: 404 };
    }

    return {
      type: 'redirect',
      url: url,
      statusCode: statusCode || 302,
    };
  }

  validate(data: Record<string, unknown>): boolean {
    return typeof data === 'object' && 
           typeof data.url === 'string' && 
           data.url.length > 0;
  }

  getMetadata(block: ContentBlock): BlockMetadata {
    const metadata = block.metadata as Record<string, unknown>;
    return {
      title: (metadata.title as string) || 'Redirect',
      description: (metadata.description as string) || 'Redirecting...',
      robots: 'noindex,nofollow',
    };
  }

  getCacheTTL(): number {
    return 3600; // 1 hour cache for redirects
  }
}

/**
 * ARTICLE RENDERER
 * 
 * Handles rich text content with reading time and SEO optimization
 */
export class ArticleRenderer implements BlockRenderer {
  async render(block: ContentBlock): Promise<RenderResult> {
    const data = block.data as {
      title: string;
      content: Record<string, unknown>[];
      reading_time?: number;
      excerpt?: string;
    };

    if (!data.title || !data.content) {
      return { type: 'error', message: 'Article content not found', statusCode: 404 };
    }

    // For now, return JSON data - will be enhanced with React components
    return {
      type: 'json',
      data: {
        id: block.id,
        slug: block.slug,
        title: data.title,
        content: data.content,
        reading_time: data.reading_time,
        excerpt: data.excerpt,
        created_at: block.created_at,
        updated_at: block.updated_at,
      },
      metadata: this.getMetadata(block),
    };
  }

  validate(data: Record<string, unknown>): boolean {
    return typeof data === 'object' &&
           typeof data.title === 'string' &&
           Array.isArray(data.content);
  }

  getMetadata(block: ContentBlock): BlockMetadata {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;

    return {
      title: data.title as string,
      description: (data.excerpt as string) || (metadata.description as string) || `Read ${data.title}`,
      ogTitle: data.title as string,
      ogDescription: (data.excerpt as string) || (metadata.description as string),
      ogType: 'article',
      ogImage: metadata.og_image as string,
      twitterCard: 'summary_large_image',
      twitterTitle: data.title as string,
      twitterDescription: (data.excerpt as string) || (metadata.description as string),
      twitterImage: metadata.og_image as string,
      schemaOrg: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.excerpt,
        datePublished: block.created_at.toISOString(),
        dateModified: block.updated_at.toISOString(),
      },
    };
  }

  getCacheTTL(): number {
    return 1800; // 30 minutes cache for articles
  }
}

/**
 * IMAGE RENDERER
 * 
 * Handles image display with optimization and metadata
 */
export class ImageRenderer implements BlockRenderer {
  async render(block: ContentBlock): Promise<RenderResult> {
    const data = block.data as {
      // New structure (MediaAsset object)
      image?: {
        url: string;
        filename: string;
        width?: number;
        height?: number;
      };
      alt?: string;
      caption?: string;
      
      // Legacy structure (direct URL) - for backward compatibility
      url?: string;
      alt_text?: string;
      width?: number;
      height?: number;
    };

    // Get image URL from either new or legacy structure
    const imageUrl = data.image?.url || data.url;
    const altText = data.alt || data.alt_text || data.image?.filename || 'Image';
    const caption = data.caption;
    const width = data.image?.width || data.width;
    const height = data.image?.height || data.height;

    if (!imageUrl) {
      return { type: 'error', message: 'Image not found', statusCode: 404 };
    }

    return {
      type: 'json',
      data: {
        id: block.id,
        slug: block.slug,
        url: imageUrl,
        alt_text: altText,
        caption: caption,
        width: width,
        height: height,
        created_at: block.created_at,
      },
      metadata: this.getMetadata(block),
    };
  }

  validate(data: Record<string, unknown>): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    // Check for new structure (image.url)
    if (data.image && typeof data.image === 'object' && data.image !== null) {
      const imageObj = data.image as Record<string, unknown>;
      if (typeof imageObj.url === 'string' && imageObj.url.length > 0) {
        return true;
      }
    }
    
    // Check for legacy structure (url)
    if (typeof data.url === 'string' && data.url.length > 0) {
      return true;
    }
    
    return false;
  }

  getMetadata(block: ContentBlock): BlockMetadata {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;

    // Get values from either new or legacy structure
    const imageUrl = (data.image as { url?: string })?.url || (data.url as string);
    const altText = (data.alt as string) || (data.alt_text as string) || 'Image';
    const caption = data.caption as string;

    return {
      title: (metadata.title as string) || altText || 'Image',
      description: caption || (metadata.description as string) || 'View image',
      ogTitle: (metadata.title as string) || altText || 'Image',
      ogDescription: caption || (metadata.description as string),
      ogType: 'website',
      ogImage: imageUrl,
      twitterCard: 'summary_large_image',
      twitterTitle: (metadata.title as string) || altText,
      twitterDescription: caption,
      twitterImage: imageUrl,
    };
  }

  getCacheTTL(): number {
    return 7200; // 2 hours cache for images
  }
}

/**
 * CARD RENDERER
 * 
 * Handles link preview cards with rich metadata
 */
export class CardRenderer implements BlockRenderer {
  async render(block: ContentBlock): Promise<RenderResult> {
    const data = block.data as {
      title: string;
      description?: string;
      url?: string;
      image_url?: string;
      icon?: string;
    };

    if (!data.title) {
      return { type: 'error', message: 'Card title not found', statusCode: 404 };
    }

    return {
      type: 'json',
      data: {
        id: block.id,
        slug: block.slug,
        title: data.title,
        description: data.description,
        url: data.url,
        image_url: data.image_url,
        icon: data.icon,
        created_at: block.created_at,
      },
      metadata: this.getMetadata(block),
    };
  }

  validate(data: Record<string, unknown>): boolean {
    return typeof data === 'object' &&
           typeof data.title === 'string' &&
           data.title.length > 0;
  }

  getMetadata(block: ContentBlock): BlockMetadata {
    const data = block.data as Record<string, unknown>;

    return {
      title: data.title as string,
      description: (data.description as string) || `Visit ${data.title}`,
      ogTitle: data.title as string,
      ogDescription: data.description as string,
      ogType: 'website',
      ogImage: data.image_url as string,
      twitterCard: 'summary',
      twitterTitle: data.title as string,
      twitterDescription: data.description as string,
      twitterImage: data.image_url as string,
    };
  }

  getCacheTTL(): number {
    return 3600; // 1 hour cache for cards
  }
}

/**
 * GALLERY RENDERER
 * 
 * Handles multiple images in various layouts
 */
export class GalleryRenderer implements BlockRenderer {
  async render(block: ContentBlock): Promise<RenderResult> {
    const data = block.data as {
      images: Array<{
        url: string;
        alt_text?: string;
        caption?: string;
      }>;
      layout?: 'grid' | 'masonry' | 'carousel';
    };

    if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
      return { type: 'error', message: 'Gallery images not found', statusCode: 404 };
    }

    return {
      type: 'json',
      data: {
        id: block.id,
        slug: block.slug,
        images: data.images,
        layout: data.layout || 'grid',
        created_at: block.created_at,
      },
      metadata: this.getMetadata(block),
    };
  }

  validate(data: Record<string, unknown>): boolean {
    return typeof data === 'object' &&
           Array.isArray(data.images) &&
           data.images.length > 0 &&
           data.images.every((img: Record<string, unknown>) => typeof img.url === 'string');
  }

  getMetadata(block: ContentBlock): BlockMetadata {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;
    const images = data.images as Array<{ url: string }>;
    const firstImage = images[0];

    return {
      title: (metadata.title as string) || 'Gallery',
      description: (metadata.description as string) || `Gallery with ${images.length} images`,
      ogTitle: (metadata.title as string) || 'Gallery',
      ogDescription: metadata.description as string,
      ogType: 'website',
      ogImage: firstImage?.url,
      twitterCard: 'summary_large_image',
      twitterTitle: (metadata.title as string) || 'Gallery',
      twitterDescription: metadata.description as string,
      twitterImage: firstImage?.url,
    };
  }

  getCacheTTL(): number {
    return 3600; // 1 hour cache for galleries
  }
}

/**
 * RENDERER REGISTRY
 * 
 * Central registry for all available renderers
 */
export const RENDERERS: Record<string, BlockRenderer> = {
  redirect: new RedirectRenderer(),
  article: new ArticleRenderer(),
  image: new ImageRenderer(),
  card: new CardRenderer(),
  gallery: new GalleryRenderer(),
};

/**
 * RENDERER FACTORY
 * 
 * Factory function to get the appropriate renderer for a block
 */
export function getRenderer(rendererType: string): BlockRenderer | null {
  return RENDERERS[rendererType] || null;
}

/**
 * RENDER BLOCK
 * 
 * Main function to render any block using the appropriate renderer
 */
export async function renderBlock(
  block: ContentBlock,
  context?: RenderContext
): Promise<RenderResult> {
  const renderer = getRenderer(block.renderer);
  
  if (!renderer) {
    return {
      type: 'error',
      message: `Unknown renderer: ${block.renderer}`,
      statusCode: 404,
    };
  }

  // Validate block data
  if (!renderer.validate(block.data)) {
    return {
      type: 'error',
      message: `Invalid data for renderer: ${block.renderer}`,
      statusCode: 400,
    };
  }

  try {
    return await renderer.render(block, context);
  } catch {
    // Renderer error for ${block.renderer}
    return {
      type: 'error',
      message: 'Rendering failed',
      statusCode: 500,
    };
  }
}

/**
 * GET BLOCK METADATA
 * 
 * Extract SEO metadata from any block
 */
export function getBlockMetadata(block: ContentBlock): BlockMetadata {
  const renderer = getRenderer(block.renderer);
  
  if (!renderer) {
    return {
      title: 'Content',
      description: 'View content',
    };
  }

  return renderer.getMetadata(block);
}

/**
 * GET CACHE TTL
 * 
 * Get cache time-to-live for a block type
 */
export function getCacheTTL(rendererType: string): number {
  const renderer = getRenderer(rendererType);
  return renderer?.getCacheTTL() || 300; // Default 5 minutes
}