import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const THUMBNAIL_DIR = join(UPLOAD_DIR, 'thumbnails');

// Ensure upload directories exist
async function ensureDirectories() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await mkdir(THUMBNAIL_DIR, { recursive: true });
  } catch {
    // Silent error handling - don't log to console
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadedAssets = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Generate unique filename
      const fileId = uuidv4();
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${fileId}.${extension}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Get image metadata
      const metadata = await sharp(buffer).metadata();

      // Save original file
      await writeFile(filepath, buffer);

      // Generate thumbnail
      const thumbnailFilename = `${fileId}_thumb.webp`;
      const thumbnailPath = join(THUMBNAIL_DIR, thumbnailFilename);
      
      await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      // Save to database
      const [asset] = await db
        .insert(mediaAssets)
        .values({
          filename,
          original_filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          width: metadata.width,
          height: metadata.height,
          storage_path: `/uploads/${filename}`,
          thumbnail_path: `/uploads/thumbnails/${thumbnailFilename}`,
        })
        .returning();

      // Add computed URLs
      const transformedAsset = {
        ...asset,
        url: `/api/media/${asset.id}`,
        thumbnail_url: `/api/media/${asset.id}/thumbnail`,
      };

      uploadedAssets.push(transformedAsset);
    }

    return NextResponse.json({
      assets: uploadedAssets,
      message: `Successfully uploaded ${uploadedAssets.length} files`,
    });
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
} 