import { sql } from 'drizzle-orm'
import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { people } from './people'

export const debts = sqliteTable('debts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personId: text('person_id').references(() => people.id, { onDelete: 'cascade' }),
  personName: text('person_name').notNull(),
  direction: text('direction', { enum: ['owed_to_me', 'i_owe'] }).notNull(),
  amount: real('amount').notNull(),
  status: text('status', { enum: ['unpaid', 'partially_paid', 'settled'] }).default('unpaid'),
  dueDate: text('due_date'),
  notes: text('notes'),
  remainingAmount: real('remaining_amount').notNull().default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})
