import { z } from 'zod';

// Zod schema for slug validation: alphanumeric, hyphens, underscores, 3-50 chars
export const slugSchema = z.string().regex(/^[a-zA-Z0-9_-]{3,50}$/, {
  message: 'Slug must be 3-50 characters, alphanumeric, hyphens or underscores only',
});

// Zod schema for URL validation (basic)
export const urlSchema = z.string().refine((val) => {
  try {
    const parsed = new URL(val);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}, {
  message: 'Invalid URL format',
});

// Sanitize URL by adding https:// if missing and normalizing
export function sanitizeUrl(url: string): string {
  if (!url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Generate random slug of given length
export function generateRandomSlug(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Reserved slugs that cannot be used
export const RESERVED_SLUGS = [
  'admin', 'api', 'login', 'logout', 'dashboard', 'analytics',
  'settings', 'help', 'about', 'contact', 'privacy', 'terms',
  'landing', 'www', 'mail', 'ftp', 'blog', 'docs', 'support',
];

// Check if slug is reserved
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}