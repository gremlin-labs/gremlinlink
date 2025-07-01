import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlWords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Get counts
    const allWords = await db.select().from(urlWords);
    const adjectives = await db.select().from(urlWords).where(eq(urlWords.word_type, 'adjective')).limit(10);
    const nouns = await db.select().from(urlWords).where(eq(urlWords.word_type, 'noun')).limit(10);
    
    return NextResponse.json({
      total: allWords.length,
      adjectives: {
        count: adjectives.length,
        samples: adjectives.map(w => w.word),
      },
      nouns: {
        count: nouns.length,
        samples: nouns.map(w => w.word),
      },
    });
    
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 