import { NextResponse } from 'next/server';
import { LandingBlockService } from '@/lib/services/landing-block-service';

// GET /api/public-blocks - Get all public blocks for the index page
export async function GET() {
  try {
    const blocks = await LandingBlockService.getPublicBlocks();
    return NextResponse.json({ blocks });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to fetch public blocks' },
      { status: 500 }
    );
  }
} 