import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, type, data, publish = false } = body;

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Slug and type are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingBlock = await db.select()
      .from(contentBlocks)
      .where(eq(contentBlocks.slug, slug))
      .limit(1);

    if (existingBlock.length > 0) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Extract data and metadata from the request
    const blockData = data?.data || data || {};
    const blockMetadata = data?.metadata || {};

    console.log('Creating content block:', {
      slug,
      type,
      blockData,
      blockMetadata,
      publish
    });

    // Create the content block
    const [block] = await db.insert(contentBlocks).values({
      slug,
      type: 'root',
      renderer: type,
      data: blockData,
      metadata: blockMetadata,
      is_published: publish,
      display_order: 0,
    }).returning();

    console.log('Created block:', block);

    return NextResponse.json({
      success: true,
      block,
    });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
} 