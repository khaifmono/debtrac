import { env } from 'cloudflare:test'
import { beforeAll } from 'vitest'
import migration0 from '../db/migrations/0000_wonderful_human_robot.sql?raw'

function applyMigration(sql: string) {
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim().replace(/;$/, ''))
    .filter(s => s.length > 0)
    .map(s => env.DB.prepare(s))
  return env.DB.batch(statements)
}

// Apply schema before each test file — each file gets a fresh isolated D1
beforeAll(async () => {
  await applyMigration(migration0)
})
