import { NextRequest, NextResponse } from 'next/server';
import { LinkService } from '@/lib/services/link-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get the link from database
    const link = await LinkService.getLinkBySlug(slug);
    
    if (!link || !link.target_url || !link.is_active) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    // Increment click count asynchronously (fire-and-forget)
    LinkService.incrementClickCount(link.id).catch(() => {
      // Silent error handling - don't log to console
    });

    return NextResponse.json({ 
      found: true, 
      target_url: link.target_url,
      slug: link.slug,
    });
    
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json({ found: false }, { status: 500 });
  }
} 