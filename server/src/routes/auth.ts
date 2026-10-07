import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { DITERIMA, fileUpload, hapusPrivat, simpanPrivat, wajibAdaBerkas } from '../lib/uploads.js';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyAgainstDummy, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
  verifyAccessToken,
  verifyRefreshToken,
} from '../lib/tokens.js';
import { currentUser, requireAuth, sessionUserSelect, toSessionDto } from '../middleware/auth.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { loginAttemptLimiter, loginIpLimiter } from '../middleware/rate-limit.js';
import { MAKS_TANDA_TANGAN_BYTES, versiTandaTangan } from '../services/tandaTangan.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase().min(1, 'Email wajib diisi.').max(160),
  password: z.string({ error: 'Kata sandi wajib diisi.' }).min(1, 'Kata sandi wajib diisi.').max(128),
  ingat: z.boolean().default(false),
});

export const kataSandiBaru = z
  .string({ error: 'Kata sandi baru wajib diisi.' })
  .min(MIN_PASSWORD_LENGTH, `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`)
  .max(128, 'Kata sandi maksimal 128 karakter.');

authRouter.get('/csrf', (req, res) => {
  res.json({ csrfToken: issueCsrfToken(req, res) });
});

authRouter.post('/login', loginIpLimiter, loginAttemptLimiter, async (req, res) => {
  const { email, password, ingat } = loginSchema.parse(req.body);
  const user = await prisma.pengguna.findUnique({ where: { email }, select: { ...sessionUserSelect, passwordHash: true } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  if (!user || !valid) {
    throw new HttpError(401, 'Email atau kata sandi salah. Periksa kembali lalu coba lagi.', 'INVALID_CREDENTIALS');
  }
  if (!user.aktif) {
    throw new HttpError(403, 'Akun Anda dinonaktifkan. Hubungi admin.', 'ACCOUNT_DISABLED');
  }
  setAuthCookies(res, user, ingat);
  res.json({ user: toSessionDto(user) });
});

authRouter.post('/refresh', async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  const payload = typeof token === 'string' ? verifyRefreshToken(token) : null;
  const user = payload ? await prisma.pengguna.findUnique({ where: { id: payload.userId }, select: sessionUserSelect }) : null;
  if (!payload || !user || !user.aktif || user.tokenVersion !== payload.tokenVersion) {
    clearAuthCookies(res);
    throw new HttpError(401, 'Sesi Anda telah berakhir. Silakan masuk kembali.', 'SESSION_EXPIRED');
  }
  setAuthCookies(res, user, payload.ingat);
  res.json({ user: toSessionDto(user) });
});

authRouter.post('/logout', async (req, res) => {
  const access: unknown = req.cookies?.[ACCESS_COOKIE];
  const refresh: unknown = req.cookies?.[REFRESH_COOKIE];
  const fromAccess = typeof access === 'string' ? verifyAccessToken(access, { ignoreExpiration: true }) : 'invalid';
  const session = typeof fromAccess === 'object' ? fromAccess : typeof refresh === 'string' ? verifyRefreshToken(refresh) : null;
  if (session) {
    // Menaikkan tokenVersion mencabut semua sesi akun ini.
    await prisma.pengguna.updateMany({
      where: { id: session.userId, tokenVersion: session.tokenVersion },
      data: { tokenVersion: { increment: 1 } },
    });
  }
  clearAuthCookies(res);
  res.status(204).end();
});

/** Tanpa cookie sesi sama sekali → `user: null` (200), bukan 401, agar tidak memicu refresh yang pasti gagal. */
authRouter.get(
  '/me',
  (req, res, next) => {
    if (!req.cookies?.[ACCESS_COOKIE] && !req.cookies?.[REFRESH_COOKIE]) {
      res.json({ user: null });
      return;
    }
    next();
  },
  requireAuth,
  (req, res) => {
    res.json({ user: toSessionDto(currentUser(req)) });
  },
);

const gantiSandiSchema = z.object({
  lama: z.string({ error: 'Kata sandi saat ini wajib diisi.' }).min(1, 'Kata sandi saat ini wajib diisi.').max(128),
  baru: kataSandiBaru,
});

/** Mengganti kata sandi sendiri; sesi di perangkat lain ikut dicabut. */
authRouter.put('/kata-sandi', requireAuth, async (req, res) => {
  const { lama, baru } = gantiSandiSchema.parse(req.body);
  const me = currentUser(req);
  const row = await prisma.pengguna.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(row.passwordHash, lama))) {
    throw new HttpError(400, 'Kata sandi saat ini salah.', 'WRONG_PASSWORD', [{ path: 'lama', message: 'Kata sandi saat ini salah.' }]);
  }
  const updated = await prisma.pengguna.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(baru), tokenVersion: { increment: 1 } },
    select: sessionUserSelect,
  });
  const access = verifyAccessToken(String(req.cookies?.[ACCESS_COOKIE] ?? ''), { ignoreExpiration: true });
  setAuthCookies(res, updated, typeof access === 'object' && access.ingat);
  res.status(204).end();
});

/**
 * Tanda tangan milik sendiri — hanya pemiliknya yang boleh mengganti, sehingga tanda tangan
 * di bukti selalu berasal dari orangnya langsung.
 */
authRouter.put('/tanda-tangan', requireAuth, fileUpload, async (req, res) => {
  const file = wajibAdaBerkas(req.file);
  if (file.size > MAKS_TANDA_TANGAN_BYTES) {
    throw new HttpError(400, 'Ukuran gambar tanda tangan maksimal 2 MB.', 'UPLOAD_INVALID');
  }
  const me = currentUser(req);
  const berkas = await simpanPrivat('tanda-tangan', file, DITERIMA.tandaTangan);
  const lama = await prisma.pengguna.findUniqueOrThrow({ where: { id: me.id }, select: { tandaTanganPath: true } });
  try {
    const diperbarui = await prisma.pengguna.update({
      where: { id: me.id },
      data: { tandaTanganPath: berkas.relPath, tandaTanganDiperbarui: new Date() },
      select: { tandaTanganDiperbarui: true },
    });
    await hapusPrivat(lama.tandaTanganPath);
    res.json({ tandaTangan: versiTandaTangan(diperbarui.tandaTanganDiperbarui) });
  } catch (err) {
    await hapusPrivat(berkas.relPath);
    throw err;
  }
});

authRouter.delete('/tanda-tangan', requireAuth, async (req, res) => {
  const me = currentUser(req);
  const lama = await prisma.pengguna.findUniqueOrThrow({ where: { id: me.id }, select: { tandaTanganPath: true } });
  await prisma.pengguna.update({ where: { id: me.id }, data: { tandaTanganPath: null, tandaTanganDiperbarui: null } });
  await hapusPrivat(lama.tandaTanganPath);
  res.status(204).end();
});
