#!/bin/sh
# ==============================================================================
# Docker Entrypoint Script
# Runs database migrations before starting the app
# ==============================================================================

set -e

echo "🚀 Starting Food Orders CRM..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('Database connected'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✓ Database is ready!"

# Run migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy
  echo "✓ Migrations completed!"
fi

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed
  echo "✓ Database seeded!"
fi

echo "✓ Starting application..."

# Start the application
exec "$@"
