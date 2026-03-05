#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready"

echo "Running migrations..."
node dist/migrations/migrate.js up

if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database..."
  node dist/database/seed.js
fi

echo "Starting server..."
exec node dist/index.js
