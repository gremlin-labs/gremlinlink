#!/bin/bash

# GremlinLink Deployment Script
# Handles database migrations and data seeding for production deployment

set -e  # Exit on any error

echo "🚀 Starting GremlinLink deployment..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

echo "📊 Environment check passed"

# Run database migrations
echo "🔄 Running database migrations..."
npx drizzle-kit push:pg --config=drizzle.config.ts

# Check if we need to populate the database
echo "🔍 Checking if database needs initial population..."
node -e "
const { db } = require('./dist/lib/db');
const { urlWords } = require('./dist/lib/db/schema');

(async () => {
  try {
    const count = await db.select().from(urlWords).limit(1);
    if (count.length === 0) {
      console.log('📝 Database is empty, will populate with word lists');
      process.exit(0);
    } else {
      console.log('✅ Database already has data, skipping population');
      process.exit(1);
    }
  } catch (error) {
    console.log('📝 Database needs population (table may not exist)');
    process.exit(0);
  }
})();
" && {
    echo "🌱 Populating database with initial data..."
    npm run populate
} || {
    echo "⏭️  Skipping database population"
}

echo "✅ Deployment completed successfully!"
echo "🔗 GremlinLink is ready to serve at $NEXT_PUBLIC_APP_URL" 