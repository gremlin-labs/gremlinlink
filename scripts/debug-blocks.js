const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/gremlinlink';
const sql = postgres(connectionString);
const db = drizzle(sql);

async function checkBlocks() {
  try {
    console.log('Checking for existing blocks...');
    
    const result = await sql`
      SELECT id, slug, renderer, data, is_published, created_at 
      FROM content_blocks 
      WHERE type = 'root' 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log(`Found ${result.length} blocks:`);
    
    result.forEach((block, index) => {
      console.log(`\n${index + 1}. Block ID: ${block.id}`);
      console.log(`   Slug: ${block.slug}`);
      console.log(`   Renderer: ${block.renderer}`);
      console.log(`   Published: ${block.is_published}`);
      console.log(`   Data:`, JSON.stringify(block.data, null, 2));
      
      // Check for redirect blocks with potentially invalid URLs
      if (block.renderer === 'redirect' && block.data && block.data.url) {
        try {
          new URL(block.data.url);
          console.log(`   ✅ Valid URL: ${block.data.url}`);
        } catch (error) {
          console.log(`   ❌ Invalid URL: ${block.data.url} - ${error.message}`);
        }
      }
    });
    
  } catch (error) {
    console.error('Error checking blocks:', error);
  } finally {
    await sql.end();
  }
}

checkBlocks(); 