import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { env, serverRoot } from './env.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundApi } from './middleware/error.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { authRouter } from './routes/auth.js';
import { dokumenEventRouter, dokumenRouter } from './routes/dokumen.js';
import { eventRouter } from './routes/event.js';
import { laporanRouter } from './routes/laporan.js';
import { masterRouter } from './routes/master.js';
import { notifikasiRouter } from './routes/notifikasi.js';
import { organisasiPublikRouter, organisasiRouter } from './routes/organisasi.js';
import { penggunaRouter } from './routes/pengguna.js';
import { pesertaEventRouter, pesertaRouter } from './routes/peserta.js';
import { transaksiEventRouter, transaksiRouter } from './routes/transaksi.js';
import { tugasEventRouter, tugasRouter } from './routes/tugas.js';
import { vendorEventRouter, vendorRouter } from './routes/vendor.js';

z.config(z.locales.id());

const VERSI = (JSON.parse(readFileSync(path.join(serverRoot, 'package.json'), 'utf8')) as { version?: string }).version ?? '0.0.0';

// Endpoint dengan muatan besar memasang parser JSON sendiri.
const BIG_BODY_PATH = /^\/api\/event\/\d+\/peserta\/impor$/;

export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:'],
          'style-src': ["'self'", "'unsafe-inline'"],
          // Saat diakses via http (COOKIE_SECURE=false), directive ini membuat browser meminta
          // aset lewat https sehingga halaman gagal dimuat.
          'upgrade-insecure-requests': env.cookieSecure ? [] : null,
        },
      },
      strictTransportSecurity: env.cookieSecure ? undefined : false,
      crossOriginOpenerPolicy: env.cookieSecure ? undefined : false,
    }),
  );
  const jsonBody = express.json({ limit: '100kb' });
  app.use((req, res, next) => (BIG_BODY_PATH.test(req.path) ? next() : jsonBody(req, res, next)));
  app.use(cookieParser());

  // Hanya berkas publik (logo). Bukti transaksi & dokumen disajikan lewat API yang memeriksa sesi.
  app.use(
    '/uploads',
    express.static(env.publicUploadRoot, { index: false, dotfiles: 'deny', maxAge: '7d', immutable: true, fallthrough: false }),
  );

  const api = express.Router();
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(apiLimiter, csrfProtection);
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.get('/info', (_req, res) => {
    res.json({ versi: VERSI, zonaWaktu: env.APP_TIMEZONE });
  });
  api.use('/auth', authRouter);
  api.use('/organisasi/publik', organisasiPublikRouter);
  api.use('/organisasi', organisasiRouter);
  api.use('/master', masterRouter);
  api.use('/pengguna', penggunaRouter);
  api.use('/event/:eventId/transaksi', transaksiEventRouter);
  api.use('/event/:eventId/tugas', tugasEventRouter);
  api.use('/event/:eventId/dokumen', dokumenEventRouter);
  api.use('/event/:eventId/peserta', pesertaEventRouter);
  api.use('/event/:eventId/vendor', vendorEventRouter);
  api.use('/event', eventRouter);
  api.use('/transaksi', transaksiRouter);
  api.use('/tugas', tugasRouter);
  api.use('/dokumen', dokumenRouter);
  api.use('/peserta', pesertaRouter);
  api.use('/vendor', vendorRouter);
  api.use('/laporan', laporanRouter);
  api.use('/notifikasi', notifikasiRouter);
  api.use(notFoundApi);
  app.use('/api', api);

  // Production: server juga menyajikan hasil build React (satu origin, cookie sameSite=strict aman).
  const indexHtml = path.join(env.clientDistDir, 'index.html');
  if (env.isProduction && existsSync(indexHtml)) {
    app.use(express.static(env.clientDistDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
