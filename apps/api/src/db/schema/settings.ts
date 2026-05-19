import { sql } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './users'

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey().notNull(),
  value: text('value').notNull().default(''),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  updatedBy: text('updated_by').references(() => users.id),
})
