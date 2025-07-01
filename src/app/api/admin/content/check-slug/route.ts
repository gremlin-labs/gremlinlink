import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingBlock = await db.select()
      .from(contentBlocks)
      .where(eq(contentBlocks.slug, slug))
      .limit(1);

    return NextResponse.json({
      available: existingBlock.length === 0,
      slug,
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to check slug availability' },
      { status: 500 }
    );
  }
} 