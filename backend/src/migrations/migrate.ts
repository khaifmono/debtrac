#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { query } from '../database';

const MIGRATION_TABLE = process.env.MIGRATION_TABLE || 'migrations';

interface Migration {
  id: number;
  name: string;
  up: string;
  down: string;
}

async function ensureMigrationTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
  } catch (error) {
    console.error('❌ Failed to create migration table:', error);
    process.exit(1);
  }
}

async function getExecutedMigrations(): Promise<string[]> {
  try {
    const result = await query(`SELECT name FROM ${MIGRATION_TABLE} ORDER BY id ASC`);
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('❌ Failed to get executed migrations:', error);
    return [];
  }
}

async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, 'files');
  const migrations: Migration[] = [];

  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️ No migrations directory found');
    return migrations;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Split the file into up and down sections
    const parts = content.split('-- DOWN');
    if (parts.length !== 2) {
      console.error(`❌ Migration file ${file} must contain '-- DOWN' separator`);
      continue;
    }

    const up = parts[0].trim();
    const down = parts[1].trim();

    // Extract migration name from filename (remove .sql extension)
    const name = file.replace('.sql', '');

    migrations.push({
      id: migrations.length + 1,
      name,
      up,
      down
    });
  }

  return migrations;
}

async function runMigration(migration: Migration, direction: 'up' | 'down') {
  const sql = direction === 'up' ? migration.up : migration.down;

  try {
    await query('BEGIN');

    if (direction === 'up') {
      await query(sql);
      await query(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES ($1)`, [migration.name]);
      console.log(`✅ Migration ${migration.name} applied`);
    } else {
      await query(sql);
      await query(`DELETE FROM ${MIGRATION_TABLE} WHERE name = $1`, [migration.name]);
      console.log(`✅ Migration ${migration.name} rolled back`);
    }

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    console.error(`❌ Migration ${migration.name} failed:`, error);
    throw error;
  }
}

async function migrateUp() {
  console.log('🚀 Running migrations up...');

  await ensureMigrationTable();
  const executedMigrations = await getExecutedMigrations();
  const migrations = await loadMigrations();

  let appliedCount = 0;
  for (const migration of migrations) {
    if (!executedMigrations.includes(migration.name)) {
      await runMigration(migration, 'up');
      appliedCount++;
    }
  }

  if (appliedCount === 0) {
    console.log('✅ No new migrations to apply');
  } else {
    console.log(`✅ Applied ${appliedCount} migration(s)`);
  }
}

async function migrateDown() {
  console.log('🔄 Running migrations down...');

  await ensureMigrationTable();
  const executedMigrations = await getExecutedMigrations();
  const migrations = await loadMigrations();

  if (executedMigrations.length === 0) {
    console.log('✅ No migrations to rollback');
    return;
  }

  // Get the last executed migration
  const lastMigrationName = executedMigrations[executedMigrations.length - 1];
  const migration = migrations.find(m => m.name === lastMigrationName);

  if (!migration) {
    console.error(`❌ Migration ${lastMigrationName} not found in files`);
    return;
  }

  await runMigration(migration, 'down');
  console.log('✅ Rolled back 1 migration');
}

async function showStatus() {
  console.log('📊 Migration Status');

  await ensureMigrationTable();
  const executedMigrations = await getExecutedMigrations();
  const migrations = await loadMigrations();

  console.log('\nAvailable migrations:');
  migrations.forEach(migration => {
    const status = executedMigrations.includes(migration.name) ? '✅' : '⏳';
    console.log(`${status} ${migration.name}`);
  });

  console.log(`\nTotal: ${executedMigrations.length}/${migrations.length} applied`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'up':
      await migrateUp();
      break;
    case 'down':
      await migrateDown();
      break;
    case 'status':
      await showStatus();
      break;
    default:
      console.log('Usage: migrate [up|down|status]');
      console.log('  up: Apply all pending migrations');
      console.log('  down: Rollback the last migration');
      console.log('  status: Show migration status');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

