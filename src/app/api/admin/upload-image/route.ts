import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { uploadToSpaces, generateFileName, validateImageFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileName = generateFileName(file.name);

    // Upload to Digital Ocean Spaces
    const imageUrl = await uploadToSpaces(buffer, fileName, file.type);

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
    });

  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Handle file size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 