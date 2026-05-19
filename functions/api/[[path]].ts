import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';
import type { AppEnv } from './_types';
import authRoutes from './_routes/auth';
import debtRoutes from './_routes/debts';
import peopleRoutes from './_routes/people';
import paymentRoutes from './_routes/payments';
import userRoutes from './_routes/users';
import settingsRoutes from './_routes/settings';

const app = new Hono<AppEnv>();

app.use('*', cors({
  origin: (origin) => origin, // allow all origins; tighten in production if needed
  credentials: true,
}));

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

export const onRequest = handle(app);
