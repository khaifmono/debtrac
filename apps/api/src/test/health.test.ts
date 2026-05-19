import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import app from '../app'

describe('GET /api/health', () => {
  it('returns 200 with status OK', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await app.fetch(req, env)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; version: string }
    expect(body.status).toBe('OK')
    expect(body.version).toBe('2.0.0')
  })
})
