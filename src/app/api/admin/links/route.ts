import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';

// Zod schema for create link request body
const createLinkSchema = z.object({
  slug: z.string().min(1).max(100),
  target_url: z.string().url(),
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional().default(false),
  icon: z.string().max(50).optional(),
  image_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }
    
    const { slug, target_url, title, description, is_default, icon, image_url } = parsed.data;

    // Check if slug already exists
    const existing = await db.select().from(contentBlocks).where(eq(contentBlocks.slug, slug)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }

    // Create redirect block
    const result = await db.insert(contentBlocks).values({
      slug,
      renderer: 'redirect',
      type: 'root',
      data: {
        url: target_url,
        title,
        description: description || null,
        icon: icon || null,
        image_url: image_url || null,
      },
      metadata: {
        title,
        description: description || null,
      },
      is_published: true,
    }).returning();

    // Transform to legacy format for compatibility
    const link = {
      id: result[0].id,
      slug: result[0].slug,
      target_url,
      title,
      description: description || null,
      clicks_count: 0,
      is_active: true,
      is_default: is_default || false,
      icon: icon || null,
      image_url: image_url || null,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
    };

    return NextResponse.json({ link }, { status: 201 });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all redirect blocks
    const redirectBlocks = await db.select()
      .from(contentBlocks)
      .where(eq(contentBlocks.renderer, 'redirect'))
      .orderBy(contentBlocks.created_at);

    // Transform to legacy format for compatibility
    const links = redirectBlocks.map(block => {
      const data = block.data as Record<string, unknown>;
      const metadata = block.metadata as Record<string, unknown>;
      return {
        id: block.id,
        slug: block.slug,
        target_url: data.url,
        title: (data?.title as string) || (metadata?.title as string) || block.slug,
        description: (data?.description as string) || (metadata?.description as string),
        clicks_count: 0, // TODO: Implement analytics
        is_active: block.is_published,
        is_default: false, // TODO: Implement default links
        icon: data.icon,
        image_url: data.image_url,
        created_at: block.created_at,
        updated_at: block.updated_at,
      };
    });

    return NextResponse.json({ links });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}