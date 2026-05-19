import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema',
  out: './src/db/migrations',
  driver: 'd1-http',
})
