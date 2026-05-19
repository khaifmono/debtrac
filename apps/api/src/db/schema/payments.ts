import { sql } from 'drizzle-orm'
import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { debts } from './debts'

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  debtId: text('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  date: text('date').notNull().default(sql`(date('now'))`),
  note: text('note'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
