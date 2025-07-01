import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy initialization of S3Client to avoid build-time errors
let spacesClientInstance: S3Client | null = null;

function getSpacesClient(): S3Client {
  if (!spacesClientInstance) {
    spacesClientInstance = new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT, // e.g., "https://nyc3.digitaloceanspaces.com"
      region: process.env.DO_SPACES_REGION || 'us-east-1', // Digital Ocean Spaces region
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY || '',
        secretAccessKey: process.env.DO_SPACES_SECRET || '',
      },
    });
  }
  return spacesClientInstance;
}

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || '';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT; // Optional CDN endpoint

// Generate a unique filename
export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `link-images/${timestamp}-${randomString}.${extension}`;
}

// Upload file to Digital Ocean Spaces
export async function uploadToSpaces(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read', // Make the file publicly accessible
    });

    await getSpacesClient().send(command);

    // Return the public URL
    const publicUrl = CDN_ENDPOINT 
      ? `${CDN_ENDPOINT}/${fileName}`
      : `${process.env.DO_SPACES_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    return publicUrl;
  } catch {
    // Silent error handling - don't log to console
    throw new Error('Failed to upload image');
  }
}

// Delete file from Digital Ocean Spaces
export async function deleteFromSpaces(fileName: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await getSpacesClient().send(command);
  } catch {
    // Silent error handling - don't log to console
    throw new Error('Failed to delete image');
  }
}

// Extract filename from URL for deletion
export function extractFileNameFromUrl(url: string): string {
  const urlParts = url.split('/');
  const fileName = urlParts.slice(-2).join('/'); // Get "link-images/filename.ext"
  return fileName;
}

// Generate presigned URL for direct upload (alternative approach)
export async function generatePresignedUrl(
  fileName: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const signedUrl = await getSignedUrl(getSpacesClient(), command, { expiresIn });
    return signedUrl;
  } catch {
    // Silent error handling - don't log to console
    throw new Error('Failed to generate upload URL');
  }
}

// Validate file type and size
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Please upload an image smaller than 5MB.',
    };
  }

  return { valid: true };
} 