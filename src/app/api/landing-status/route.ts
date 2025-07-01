import { NextResponse } from 'next/server';
import { LandingBlockService } from '@/lib/services/landing-block-service';

// GET /api/landing-status - Get current landing block status (public endpoint)
export async function GET() {
  try {
    const landingBlock = await LandingBlockService.getLandingBlock();
    const publicBlocks = await LandingBlockService.getPublicBlocks();

    return NextResponse.json({
      hasLandingBlock: !!landingBlock,
      landingBlock: landingBlock || null,
      publicBlockCount: publicBlocks.length,
      publicBlocks: publicBlocks,
    });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to fetch landing status' },
      { status: 500 }
    );
  }
} 