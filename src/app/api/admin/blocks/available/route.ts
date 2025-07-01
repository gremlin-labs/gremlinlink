import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeTypes = searchParams.get('exclude')?.split(',') || [];
    const excludeIds = searchParams.get('excludeIds')?.split(',') || [];

    // Build where conditions
    const whereConditions = [
      eq(contentBlocks.type, 'root'),
      eq(contentBlocks.is_published, true),
    ];

    if (excludeTypes.length > 0) {
      whereConditions.push(notInArray(contentBlocks.renderer, excludeTypes));
    }

    if (excludeIds.length > 0) {
      whereConditions.push(notInArray(contentBlocks.id, excludeIds));
    }

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(and(...whereConditions));

    return NextResponse.json({
      blocks,
      total: blocks.length,
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to fetch available blocks' },
      { status: 500 }
    );
  }
} 