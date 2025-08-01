import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const assets = await db
      .select()
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.created_at))
      .limit(limit)
      .offset(offset);

    // Transform assets to include computed URLs
    const transformedAssets = assets.map(asset => {
      // Check if using external storage (spaces)
      const isExternalUrl = asset.storage_path?.startsWith('http://') || asset.storage_path?.startsWith('https://');
      
      return {
        ...asset,
        url: isExternalUrl ? asset.storage_path : `/api/media/${asset.id}`,
        thumbnail_url: asset.thumbnail_path 
          ? (asset.thumbnail_path.startsWith('http') ? asset.thumbnail_path : `/api/media/${asset.id}/thumbnail`)
          : (isExternalUrl ? asset.storage_path : `/api/media/${asset.id}`),
      };
    });

    return NextResponse.json({
      assets: transformedAssets,
      total: assets.length,
    });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to fetch media assets' },
      { status: 500 }
    );
  }
} 