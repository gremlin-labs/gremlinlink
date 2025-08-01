import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Settings validation schema
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1).max(100),
    siteUrl: z.string().url(),
    siteDescription: z.string().max(500),
  }),
  security: z.object({
    requireAuth: z.boolean(),
    enableRateLimit: z.boolean(),
    enableAnalytics: z.boolean(),
  }),
  email: z.object({
    smtpHost: z.string(),
    smtpPort: z.number().int().min(1).max(65535),
    smtpUsername: z.string().email(),
    smtpPassword: z.string(),
  }),
  domain: z.object({
    customDomain: z.string(),
    forceHttps: z.boolean(),
  }),
});

// Default settings
const defaultSettings = {
  general: {
    siteName: 'GremlinLink',
    siteUrl: 'https://gremlin.link',
    siteDescription: 'A powerful URL shortener and content management system',
  },
  security: {
    requireAuth: true,
    enableRateLimit: true,
    enableAnalytics: true,
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: 'your-email@example.com',
    smtpPassword: '',
  },
  domain: {
    customDomain: 'your-domain.com',
    forceHttps: true,
  },
};

// In-memory storage for demo purposes
// In production, this would be stored in a database
let currentSettings = { ...defaultSettings };

export async function GET() {
  try {
    return NextResponse.json(currentSettings);
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the settings data
    const validatedSettings = settingsSchema.parse(body);
    
    // Update the settings
    currentSettings = validatedSettings;
    
    // In production, you would save to database here
    // await db.settings.upsert({
    //   where: { id: 1 },
    //   update: validatedSettings,
    //   create: { id: 1, ...validatedSettings }
    // });
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: currentSettings,
    });
    
  } catch (error) {
    // Silent error handling - don't log to console
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid settings data',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
} 