import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { DITERIMA, fileUpload, hapusPrivat, simpanPrivat, wajibAdaBerkas } from '../lib/uploads.js';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyAgainstDummy, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  clearMfaCookie,
  MFA_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  setMfaCookie,
  verifyAccessToken,
  verifyMfaToken,
  verifyRefreshToken,
  type TujuanMfa,
} from '../lib/tokens.js';
import {
  ambilWajibMfa,
  currentUser,
  denganWajibMfa,
  requireAuth,
  requireAuthTanpaMfa,
  sessionUserSelect,
  toSessionDto,
} from '../middleware/auth.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { loginAttemptLimiter, loginIpLimiter, mfaLimiter } from '../middleware/rate-limit.js';
import { aktifkanMfa, buatUlangKodePemulihan, hapusMfa, mulaiPasangMfa, sisaKodePemulihan, wajibKodeBenar } from '../services/mfa.js';
import { MAKS_TANDA_TANGAN_BYTES, versiTandaTangan } from '../services/tandaTangan.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string({ error: 'Username wajib diisi.' }).trim().toLowerCase().min(1, 'Username wajib diisi.').max(64),
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

const kodeSchema = z.object({
  kode: z.string({ error: 'Kode verifikasi wajib diisi.' }).trim().min(1, 'Kode verifikasi wajib diisi.').max(32),
});

/**
 * Langkah 1: username + kata sandi. Bila akun memakai MFA (atau organisasi mewajibkannya),
 * sesi belum dibuat; yang diberikan hanya tiket singkat `sk_mfa` untuk langkah berikutnya.
 */
authRouter.post('/login', loginIpLimiter, loginAttemptLimiter, async (req, res) => {
  const { username, password, ingat } = loginSchema.parse(req.body);
  const user = await prisma.pengguna.findUnique({ where: { username }, select: { ...sessionUserSelect, passwordHash: true } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  if (!user || !valid) {
    throw new HttpError(401, 'Username atau kata sandi salah. Periksa kembali lalu coba lagi.', 'INVALID_CREDENTIALS');
  }
  if (!user.aktif) {
    throw new HttpError(403, 'Akun Anda dinonaktifkan. Hubungi admin.', 'ACCOUNT_DISABLED');
  }
  const wajibMfa = await ambilWajibMfa();
  if (user.mfaAktifSejak || wajibMfa) {
    clearAuthCookies(res);
    setMfaCookie(res, user, ingat, user.mfaAktifSejak ? 'verifikasi' : 'pasang');
    res.json({ langkah: user.mfaAktifSejak ? 'mfa' : 'pasang-mfa' });
    return;
  }
  setAuthCookies(res, user, ingat);
  res.json({ user: toSessionDto(denganWajibMfa(user, wajibMfa)) });
});

const TIKET_HABIS = 'Waktu verifikasi habis. Silakan masuk kembali.';

async function ambilTiket(req: Request, tujuan: TujuanMfa) {
  const tiket = verifyMfaToken(req.cookies?.[MFA_COOKIE]);
  if (!tiket || tiket.tujuan !== tujuan) throw new HttpError(401, TIKET_HABIS, 'MFA_TIKET_TIDAK_VALID');
  const user = await prisma.pengguna.findUnique({ where: { id: tiket.userId }, select: sessionUserSelect });
  if (!user || !user.aktif || user.tokenVersion !== tiket.tokenVersion) throw new HttpError(401, TIKET_HABIS, 'MFA_TIKET_TIDAK_VALID');
  return { tiket, user };
}

/** Membuat sesi setelah langkah MFA berhasil. */
async function mulaiSesi(res: Response, penggunaId: number, ingat: boolean) {
  const [user, wajibMfa] = await Promise.all([
    prisma.pengguna.findUniqueOrThrow({ where: { id: penggunaId }, select: sessionUserSelect }),
    ambilWajibMfa(),
  ]);
  clearMfaCookie(res);
  setAuthCookies(res, user, ingat);
  return toSessionDto(denganWajibMfa(user, wajibMfa));
}

/** Langkah 2 (akun ber-MFA): kode authenticator atau kode pemulihan. */
authRouter.post('/login/mfa', mfaLimiter, async (req, res) => {
  const { kode } = kodeSchema.parse(req.body);
  const { tiket, user } = await ambilTiket(req, 'verifikasi');
  const hasil = await wajibKodeBenar(user.id, kode);
  res.json({ user: await mulaiSesi(res, user.id, tiket.ingat), ...(hasil.metode === 'pemulihan' ? { sisaKodePemulihan: hasil.sisa } : {}) });
});

/** Langkah 2 (MFA diwajibkan, belum dipasang): tampilkan QR. */
authRouter.post('/login/mfa/pasang', async (req, res) => {
  const { user } = await ambilTiket(req, 'pasang');
  res.json(await mulaiPasangMfa(user.id, user.username));
});

/** Langkah 3 (MFA diwajibkan): konfirmasi kode pertama, MFA aktif, sesi dibuat. */
authRouter.post('/login/mfa/aktifkan', mfaLimiter, async (req, res) => {
  const { kode } = kodeSchema.parse(req.body);
  const { tiket, user } = await ambilTiket(req, 'pasang');
  const kodePemulihan = await aktifkanMfa(user.id, kode);
  res.json({ user: await mulaiSesi(res, user.id, tiket.ingat), kodePemulihan });
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
  res.json({ user: toSessionDto(denganWajibMfa(user, await ambilWajibMfa())) });
});

authRouter.post('/logout', async (req, res) => {
  clearMfaCookie(res);
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
  requireAuthTanpaMfa,
  (req, res) => {
    res.json({ user: toSessionDto(currentUser(req)) });
  },
);

/* ---------- MFA milik sendiri (Pengaturan > Akun Saya) ---------- */

function ingatDariSesi(req: Request): boolean {
  const access = verifyAccessToken(String(req.cookies?.[ACCESS_COOKIE] ?? ''), { ignoreExpiration: true });
  return typeof access === 'object' && access.ingat;
}

authRouter.get('/mfa', requireAuthTanpaMfa, async (req, res) => {
  const me = currentUser(req);
  res.json({
    aktif: me.mfaAktifSejak !== null,
    aktifSejak: me.mfaAktifSejak,
    wajib: me.wajibMfa,
    sisaKodePemulihan: me.mfaAktifSejak ? await sisaKodePemulihan(me.id) : 0,
  });
});

authRouter.post('/mfa/pasang', requireAuthTanpaMfa, async (req, res) => {
  const me = currentUser(req);
  if (me.mfaAktifSejak) throw new HttpError(400, 'Verifikasi dua langkah sudah aktif.', 'MFA_SUDAH_AKTIF');
  res.json(await mulaiPasangMfa(me.id, me.username));
});

/** Mengaktifkan MFA; sesi di perangkat lain dicabut karena dibuat tanpa MFA. */
authRouter.post('/mfa/aktifkan', requireAuthTanpaMfa, mfaLimiter, async (req, res) => {
  const { kode } = kodeSchema.parse(req.body);
  const me = currentUser(req);
  if (me.mfaAktifSejak) throw new HttpError(400, 'Verifikasi dua langkah sudah aktif.', 'MFA_SUDAH_AKTIF');
  const kodePemulihan = await aktifkanMfa(me.id, kode);
  const user = await prisma.pengguna.update({ where: { id: me.id }, data: { tokenVersion: { increment: 1 } }, select: sessionUserSelect });
  setAuthCookies(res, user, ingatDariSesi(req));
  res.json({ kodePemulihan });
});

const nonaktifSchema = kodeSchema.extend({
  kataSandi: z.string({ error: 'Kata sandi wajib diisi.' }).min(1, 'Kata sandi wajib diisi.').max(128),
});

authRouter.post('/mfa/nonaktifkan', requireAuth, mfaLimiter, async (req, res) => {
  const { kode, kataSandi } = nonaktifSchema.parse(req.body);
  const me = currentUser(req);
  if (me.wajibMfa) throw new HttpError(400, 'Organisasi mewajibkan verifikasi dua langkah, jadi MFA tidak dapat dinonaktifkan.', 'MFA_WAJIB');
  if (!me.mfaAktifSejak) throw new HttpError(400, 'Verifikasi dua langkah belum aktif.', 'MFA_TIDAK_AKTIF');
  const row = await prisma.pengguna.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(row.passwordHash, kataSandi))) {
    throw new HttpError(400, 'Kata sandi salah.', 'WRONG_PASSWORD', [{ path: 'kataSandi', message: 'Kata sandi salah.' }]);
  }
  await wajibKodeBenar(me.id, kode);
  await hapusMfa(me.id, false);
  res.status(204).end();
});

/** Kode pemulihan baru; semua kode lama tidak berlaku lagi. */
authRouter.post('/mfa/kode-pemulihan', requireAuth, mfaLimiter, async (req, res) => {
  const { kode } = kodeSchema.parse(req.body);
  const me = currentUser(req);
  if (!me.mfaAktifSejak) throw new HttpError(400, 'Verifikasi dua langkah belum aktif.', 'MFA_TIDAK_AKTIF');
  await wajibKodeBenar(me.id, kode);
  res.json({ kodePemulihan: await buatUlangKodePemulihan(me.id) });
});

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
  setAuthCookies(res, updated, ingatDariSesi(req));
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
