import { db } from '../src/lib/db';
import { urlWords } from '../src/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';

function readWordList(filename: string): string[] {
  const filePath = path.join(__dirname, '..', 'data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  
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

async function populate() {
  try {
    console.log('🔍 Checking existing data...');
    const existingWords = await db.select().from(urlWords).limit(1);
    
    if (existingWords.length > 0) {
      console.log('⚠️  Table already has data. Clearing first...');
      await db.delete(urlWords);
    }
    
    console.log('📖 Reading word lists...');
    const adjectives = readWordList('adjectives-list.md');
    const nouns = readWordList('nouns-list.md');
    
    console.log(`📊 Found ${adjectives.length} adjectives and ${nouns.length} nouns`);
    
    if (adjectives.length === 0 || nouns.length === 0) {
      throw new Error('No words found in files!');
    }
    
    const words = [
      ...adjectives.map(word => ({ word, word_type: 'adjective' as const })),
      ...nouns.map(word => ({ word, word_type: 'noun' as const }))
    ];
    
    console.log('💾 Inserting words in batches...');
    
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      await db.insert(urlWords).values(batch);
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)} inserted`);
    }
    
    // Verify the data
    const totalCount = await db.select().from(urlWords);
    const adjectiveCount = await db.select().from(urlWords).where(eq(urlWords.word_type, 'adjective'));
    const nounCount = await db.select().from(urlWords).where(eq(urlWords.word_type, 'noun'));
    
    console.log(`✅ Successfully populated ${totalCount.length} words!`);
    console.log(`   📝 ${adjectiveCount.length} adjectives`);
    console.log(`   📝 ${nounCount.length} nouns`);
    
    // Test a few random selections
    console.log('🎲 Testing random selection...');
    const testAdjectives = await db.select().from(urlWords).where(eq(urlWords.word_type, 'adjective')).limit(3);
    const testNouns = await db.select().from(urlWords).where(eq(urlWords.word_type, 'noun')).limit(3);
    
    console.log('   Sample adjectives:', testAdjectives.map(w => w.word));
    console.log('   Sample nouns:', testNouns.map(w => w.word));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populate(); 