import { notFound, redirect } from 'next/navigation';
import { BlockService } from '@/lib/services/block-service';
import { renderBlock, getBlockMetadata } from '@/lib/renderers';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { headers } from 'next/headers';
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

/**
 * Generate metadata for SEO optimization
 */
export async function generateMetadata({ params }: UniversalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugString = slug?.join('/') || '';
  
  const block = await BlockService.getBlockBySlug(slugString);
  
  if (!block) {
    return {
      title: 'Not Found',
      description: 'The requested page could not be found.',
    };
  }

  const metadata = getBlockMetadata(block);
  
  return {
    title: metadata.title,
    description: metadata.description,
    robots: metadata.robots,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
    },
  };
}

/**
 * Extract client IP address from headers
 */
function getClientIP(headersList: Headers): string | undefined {
  // Check various headers for IP address (in order of preference)
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of ipHeaders) {
    const value = headersList.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== '::1' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  }

  return undefined;
}

export default async function UniversalPage({ params }: UniversalPageProps) {
  const { slug } = await params;
  const slugString = slug?.join('/') || '';
  
  // Get request headers for analytics
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || undefined;
  const referrer = headersList.get('referer') || undefined;
  const ipAddress = getClientIP(headersList);
  
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
      
      // Track analytics asynchronously with enhanced data (non-blocking)
      BlockService.trackClick(block.id, {
        timestamp: new Date().toISOString(),
        type: 'redirect',
        userAgent,
        referrer,
        ipAddress,
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

    // Track analytics asynchronously with enhanced data (non-blocking)
    BlockService.trackClick(block.id, {
      timestamp: new Date().toISOString(),
      type: 'view',
      userAgent,
      referrer,
      ipAddress,
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