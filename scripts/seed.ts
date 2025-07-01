#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import { urlWords } from '../src/lib/db/schema';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Validate database URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env file');
  process.exit(1);
}

// Create a dedicated connection for seeding
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

const db = drizzle(client, { schema });

function readWordList(filename: string): string[] {
  const filePath = join(__dirname, '..', 'data', filename);
  
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const words: string[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      words.push(match[1].trim());
    }
  }
  
  return words;
}

async function main() {
  console.log('🌱 Starting URL words seeding...');

  try {
    // Verify database connection
    console.log('🔍 Verifying database connection...');
    const testResult = await client`SELECT 1`;
    console.log('   ✅ Database connection verified');

    const args = process.argv.slice(2);
    const forceFlag = args.includes('--force');

    // If force flag, clear existing data
    if (forceFlag) {
      console.log('🔄 Force flag detected - clearing existing data...');
      await db.delete(urlWords);
      console.log('   ✅ Cleared existing words');
    } else {
      // Check if already seeded
      const existingWords = await db.select().from(urlWords).limit(1);
      if (existingWords.length > 0) {
        console.log('⚠️  URL words already exist. Use --force to reseed.');
        process.exit(0);
      }
    }

    const adjectives = readWordList('adjectives-list.md');
    const nouns = readWordList('nouns-list.md');

    if (adjectives.length === 0) {
      throw new Error('No adjectives found! Check adjectives-list.md');
    }

    if (nouns.length === 0) {
      throw new Error('No nouns found! Check nouns-list.md');
    }

    let wordsCreated = 0;

    // Insert adjectives
    for (const word of adjectives) {
      try {
        await db.insert(urlWords).values({
          word: word.toLowerCase(),
          word_type: 'adjective',
        });
        wordsCreated++;
      } catch (e) {
        console.error(`Failed to insert adjective: ${word}`, e);
      }
    }

    // Insert nouns
    for (const word of nouns) {
      try {
        await db.insert(urlWords).values({
          word: word.toLowerCase(),
          word_type: 'noun',
        });
        wordsCreated++;
      } catch (e) {
        console.error(`Failed to insert noun: ${word}`, e);
      }
    }

    console.log(`✅ Created ${wordsCreated} words`);

    // Verify the seeding worked
    const totalWords = await db.select().from(urlWords);
    const adjectivesList = await db.select().from(urlWords).where(eq(urlWords.word_type, 'adjective'));
    const nounsList = await db.select().from(urlWords).where(eq(urlWords.word_type, 'noun'));

    console.log(`✅ Successfully seeded ${totalWords.length} words!`);
    console.log(`   📝 ${adjectivesList.length} adjectives`);
    console.log(`   📝 ${nounsList.length} nouns`);

    console.log('🎉 URL words seeding completed successfully');

  } catch (error) {
    console.error('❌ Error seeding URL words:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main();