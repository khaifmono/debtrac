import { Hono } from 'hono';
import type { AppEnv } from './functions/api/_types';
import authRoutes from './functions/api/_routes/auth';
import debtRoutes from './functions/api/_routes/debts';
import peopleRoutes from './functions/api/_routes/people';
import paymentRoutes from './functions/api/_routes/payments';
import userRoutes from './functions/api/_routes/users';
import settingsRoutes from './functions/api/_routes/settings';

const app = new Hono<AppEnv>();

// Serve static assets for all non-API routes with SPA fallback
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api')) return next();
  const assets = (c.env as any)?.ASSETS as Fetcher | undefined;
  if (!assets) return next();
  const res = await assets.fetch(c.req.raw);
  if (res.status !== 404 || c.req.method !== 'GET') return res;
  const url = new URL(c.req.raw.url);
  return assets.fetch(new Request(new URL('/index.html', url).toString(), {
    headers: c.req.raw.headers,
    method: 'GET',
  }));
});

app.get('/api/health', (c) => c.json({
  status: 'OK',
  timestamp: new Date().toISOString(),
  version: '2.0.0',
}));

app.route('/api/auth', authRoutes);
app.route('/api/debts', debtRoutes);
app.route('/api/people', peopleRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/users', userRoutes);
app.route('/api/settings', settingsRoutes);

app.all('/api/*', (c) => c.json({ error: 'API endpoint not found' }, 404));

export default app;
