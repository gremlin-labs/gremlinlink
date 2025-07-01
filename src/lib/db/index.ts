import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  max: 1, // Limit connections for middleware
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });