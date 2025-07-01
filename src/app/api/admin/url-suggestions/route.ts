import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlWords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '5');
    
    // Validate count parameter
    if (count < 1 || count > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20' },
        { status: 400 }
      );
    }
    
    // Get all adjectives and nouns, then shuffle in JavaScript for better randomness
    const [allAdjectives, allNouns] = await Promise.all([
      db.select({ word: urlWords.word })
        .from(urlWords)
        .where(eq(urlWords.word_type, 'adjective')),
      
      db.select({ word: urlWords.word })
        .from(urlWords)
        .where(eq(urlWords.word_type, 'noun')),
    ]);
    
    // Shuffle arrays and take the requested count
    const shuffleArray = (array: Array<{ word: string }>) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const shuffledAdjectives = shuffleArray(allAdjectives).slice(0, count);
    const shuffledNouns = shuffleArray(allNouns).slice(0, count);
    
    // Generate suggestions by combining adjectives and nouns
    const suggestions = [];
    for (let i = 0; i < count; i++) {
      const adjective = shuffledAdjectives[i]?.word || 'awesome';
      const noun = shuffledNouns[i]?.word || 'project';
      suggestions.push(`${adjective}-${noun}`);
    }
    
    return NextResponse.json({ suggestions });
    
  } catch {
    // Silent error handling - don't log to console
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
} 