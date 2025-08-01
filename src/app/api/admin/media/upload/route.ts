import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { uploadToSpaces, generateFileName } from '@/lib/storage';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const THUMBNAIL_DIR = join(UPLOAD_DIR, 'thumbnails');

// Check if we should use Digital Ocean Spaces
const useSpaces = Boolean(
  process.env.DO_SPACES_ENDPOINT &&
  process.env.DO_SPACES_BUCKET &&
  process.env.DO_SPACES_KEY &&
  process.env.DO_SPACES_SECRET
);

// Ensure upload directories exist (only for local storage)
async function ensureDirectories() {
  if (!useSpaces) {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await mkdir(THUMBNAIL_DIR, { recursive: true });
    } catch {
      // Silent error handling - don't log to console
    }
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

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Get image metadata
      const metadata = await sharp(buffer).metadata();

      let storagePath: string;
      let thumbnailPath: string | null = null;
      let publicUrl: string;
      let thumbnailUrl: string | null = null;

      if (useSpaces) {
        // Upload to Digital Ocean Spaces
        const fileName = generateFileName(file.name);
        publicUrl = await uploadToSpaces(buffer, fileName, file.type);
        storagePath = fileName;

        // Generate and upload thumbnail
        const thumbnailBuffer = await sharp(buffer)
          .resize(400, 400, { 
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 })
          .toBuffer();
        
        const thumbnailFileName = fileName.replace(/\.[^.]+$/, '_thumb.webp');
        thumbnailUrl = await uploadToSpaces(thumbnailBuffer, thumbnailFileName, 'image/webp');
        thumbnailPath = thumbnailFileName;
      } else {
        // Save locally
        const fileId = uuidv4();
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `${fileId}.${extension}`;
        const filepath = join(UPLOAD_DIR, filename);

        await writeFile(filepath, buffer);

        // Generate thumbnail locally
        const thumbnailFilename = `${fileId}_thumb.webp`;
        const thumbnailFilePath = join(THUMBNAIL_DIR, thumbnailFilename);
        
        await sharp(buffer)
          .resize(400, 400, { 
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 })
          .toFile(thumbnailFilePath);

        storagePath = `/uploads/${filename}`;
        thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;
        publicUrl = storagePath;
        thumbnailUrl = thumbnailPath;
      }

      // Save to database
      const [asset] = await db
        .insert(mediaAssets)
        .values({
          filename: file.name,
          original_filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          width: metadata.width,
          height: metadata.height,
          storage_path: storagePath,
          thumbnail_path: thumbnailPath,
        })
        .returning();

      // Add computed URLs
      const transformedAsset = {
        ...asset,
        url: useSpaces ? publicUrl : `/api/media/${asset.id}`,
        thumbnail_url: useSpaces ? thumbnailUrl : `/api/media/${asset.id}/thumbnail`,
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