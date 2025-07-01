const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const { users } = require('../src/lib/db/schema');

async function createAdmin() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/gremlinlink';
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@yourcompany.com')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = await db.insert(users).values({
      email: 'admin@yourcompany.com',
      role: 'admin',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    console.log('Admin user created:', adminUser[0]);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await sql.end();
  }
}

createAdmin();