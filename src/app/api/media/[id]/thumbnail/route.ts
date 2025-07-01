import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get asset from database
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Use thumbnail if available, otherwise fall back to original
    const imagePath = asset.thumbnail_path || asset.storage_path;
    const filePath = join(process.cwd(), 'public', imagePath);
    const fileBuffer = await readFile(filePath);

    // Return thumbnail with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': asset.thumbnail_path ? 'image/webp' : (asset.mime_type || 'application/octet-stream'),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to serve thumbnail' },
      { status: 500 }
    );
  }
} 