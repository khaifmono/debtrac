import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.toml' },
        miniflare: {
          bindings: {
            JWT_SECRET: 'test-secret-minimum-32-chars-long!!',
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
          },
        },
      },
    },
  },
})
