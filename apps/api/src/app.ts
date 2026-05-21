import { Hono } from 'hono';
import type { AppEnv } from './_types';
import authRoutes from './_routes/auth';
import debtRoutes from './_routes/debts';
import peopleRoutes from './_routes/people';
import paymentRoutes from './_routes/payments';
import userRoutes from './_routes/users';
import settingsRoutes from './_routes/settings';

const app = new Hono<AppEnv>();

// Prevent Cloudflare from caching the service worker — must always be fresh
app.get('/sw.js', async (c) => {
  const assets = (c.env as any)?.ASSETS as Fetcher | undefined;
  if (!assets) return c.notFound();
  const res = await assets.fetch(c.req.raw);
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  return new Response(res.body, { status: res.status, headers });
});

// Public QR landing page — must be before the SPA static middleware so it isn't
// swallowed by the index.html fallback. The og:image tag lets WhatsApp render
// the QR as a link preview card when this URL is pasted into a chat.
app.get('/qr', async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'payment_qr'"
  ).first<{ value: string }>();
  if (!row?.value) return c.notFound();

  const origin = new URL(c.req.raw.url).origin;
  const imgUrl = `${origin}/api/settings/qr`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Payment QR Code">
  <meta property="og:description" content="Scan to pay">
  <meta property="og:image" content="${imgUrl}">
  <meta property="og:url" content="${origin}/qr">
  <meta name="twitter:card" content="summary_large_image">
  <title>Payment QR</title>
  <style>
    body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;font-family:sans-serif;gap:16px}
    img{max-width:280px;width:100%;border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px}
    p{color:#6b7280;font-size:14px;margin:0}
  </style>
</head>
<body>
  <img src="${imgUrl}" alt="Payment QR">
  <p>Scan to pay</p>
</body>
</html>`;
  return c.html(html);
});

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

// Public raw image endpoint — must be before the auth'd settings router
app.get('/api/settings/qr', async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'payment_qr'"
  ).first<{ value: string }>();
  if (!row?.value) return c.notFound();

  const [header, b64] = row.value.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

app.route('/api/settings', settingsRoutes);

app.all('/api/*', (c) => c.json({ error: 'API endpoint not found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

export default app;
