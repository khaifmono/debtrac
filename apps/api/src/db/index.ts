import { drizzle } from 'drizzle-orm/d1'
import type { AppEnv } from '../_types'
import * as schema from './schema'

export function createDb(env: AppEnv['Bindings']) {
  return drizzle(env.DB, { schema })
}
