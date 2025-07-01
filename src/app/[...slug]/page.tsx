import { notFound, redirect } from 'next/navigation';
import { BlockService } from '@/lib/services/block-service';
import { renderBlock, getBlockMetadata } from '@/lib/renderers';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { Metadata } from 'next';

/**
 * UNIVERSAL CONTENT PAGE
 * 
 * This replaces all fragmented routes (/page/[id], /image/[id], /post/[id])
 * with a single, unified handler that works for all content types.
 * 
 * Performance Features:
 * - Ultra-fast redirect resolution (<100ms)
 * - SEO-optimized metadata generation
 * - Analytics tracking without blocking render
 * - Efficient block tree loading
 */

interface UniversalPageProps {
  params: Promise<{ slug: string[] }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: UniversalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugString = slug?.join('/') || '';
  
  try {
    const block = await BlockService.getBlockBySlug(slugString);
    
    if (!block) {
      return {
        title: 'Not Found',
        description: 'The requested content could not be found.',
      };
    }

    const metadata = getBlockMetadata(block);
    
    return {
      title: metadata.title,
      description: metadata.description,
      openGraph: {
        title: metadata.ogTitle || metadata.title,
        description: metadata.ogDescription || metadata.description,
        type: (metadata.ogType as 'website' | 'article') || 'website',
        images: metadata.ogImage ? [{ url: metadata.ogImage }] : undefined,
      },
      twitter: {
        card: (metadata.twitterCard as 'summary' | 'summary_large_image') || 'summary',
        title: metadata.twitterTitle || metadata.title,
        description: metadata.twitterDescription || metadata.description,
        images: metadata.twitterImage ? [metadata.twitterImage] : undefined,
      },
      robots: metadata.robots,
      alternates: {
        canonical: metadata.canonicalUrl,
      },
    };
  } catch {
    // Handle error silently for metadata generation
    return {
      title: 'Content',
      description: 'View content',
    };
  }
}

export default async function UniversalPage({ params }: UniversalPageProps) {
  const { slug } = await params;
  const slugString = slug?.join('/') || '';
  
  // Get block with performance optimization
  const block = await BlockService.getBlockBySlug(slugString);
  
  if (!block) {
    notFound();
  }

  // Handle redirects immediately (critical for URL shortener performance)
  if (block.renderer === 'redirect') {
    const renderResult = await renderBlock(block);
    
    if (renderResult.type === 'redirect') {
      // Validate URL before redirecting
      try {
        new URL(renderResult.url);
      } catch {
        // Invalid redirect URL, return 404
        notFound();
      }
      
      // Track analytics asynchronously (non-blocking)
      BlockService.trackClick(block.id, {
        timestamp: new Date().toISOString(),
        type: 'redirect',
      }).catch(() => {
        // Handle analytics error silently
      });
      
      redirect(renderResult.url);
    }
  }

  try {

    // For non-redirect content, get full block tree if needed
    const blockTree = block.type === 'root' && block.renderer !== 'redirect' 
      ? await BlockService.getBlockTree(slugString)
      : block;

    if (!blockTree) {
      notFound();
    }

    // Track analytics asynchronously (non-blocking)
    BlockService.trackClick(block.id, {
      timestamp: new Date().toISOString(),
      type: 'view',
    }).catch(() => {
      // Handle analytics error silently
    });

    // Render the content using the unified block renderer
    if (blockTree.renderer === 'page') {
      // Page blocks control the entire page layout
      return (
        <div className="min-h-screen">
          <BlockRenderer block={blockTree} mode="view" />
        </div>
      );
    }

    // For other block types, use the standard container layout
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <BlockRenderer block={blockTree} mode="view" />
        </main>
      </div>
    );
    
  } catch {
    // Handle page error silently
    notFound();
  }
}

// Enable static generation for performance
export const dynamic = 'force-dynamic'; // Required for analytics tracking
export const revalidate = 3600; // Revalidate every hour