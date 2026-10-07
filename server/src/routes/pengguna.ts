import { Router } from 'express';
import { z } from 'zod';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { kirimPrivat, MIME, type Ekstensi } from '../lib/uploads.js';
import { hashPassword } from '../lib/password.js';
import { isUniqueViolation, prisma } from '../lib/prisma.js';
import { email, paramId, teks, teksOpsional } from '../lib/validasi.js';
import { currentUser, requireAuth, requireIzin } from '../middleware/auth.js';
import { denganTandaTangan } from '../services/tandaTangan.js';
import { kataSandiBaru } from './auth.js';

export const penggunaRouter = Router();
penggunaRouter.use(requireAuth);

const penggunaSelect = {
  id: true,
  nama: true,
  email: true,
  peran: true,
  aktif: true,
  jabatan: true,
  telepon: true,
  tanggungJawab: true,
  tandaTanganDiperbarui: true,
} as const;

/** Semua anggota boleh melihat daftar pengguna (untuk memilih PIC & tim event). */
penggunaRouter.get('/', async (_req, res) => {
  const pengguna = await prisma.pengguna.findMany({ orderBy: [{ aktif: 'desc' }, { nama: 'asc' }], select: penggunaSelect });
  res.json({ pengguna: pengguna.map(denganTandaTangan) });
});

/** Gambar tanda tangan; dipakai saat menyusun bukti oleh pengguna lain yang sudah login. */
penggunaRouter.get('/:id/tanda-tangan', async (req, res) => {
  const row = await prisma.pengguna.findUnique({ where: { id: paramId(req) }, select: { tandaTanganPath: true } });
  if (!row?.tandaTanganPath) throw tidakDitemukan('Tanda tangan');
  const ext = row.tandaTanganPath.split('.').pop() as Ekstensi;
  kirimPrivat(res, row.tandaTanganPath, `tanda-tangan.${ext}`, MIME[ext] ?? 'image/png', true);
});

const dasar = {
  nama: teks('Nama', 120),
  email,
  peran: z.enum(['admin', 'bendahara', 'anggota', 'peninjau'], { error: 'Peran tidak valid.' }),
  jabatan: teksOpsional('Jabatan', 80),
  telepon: teksOpsional('Telepon', 40),
  tanggungJawab: teksOpsional('Tanggung jawab', 255),
};

const buatSchema = z.object({ ...dasar, kataSandi: kataSandiBaru });
const ubahSchema = z.object({
  ...dasar,
  aktif: z.boolean(),
  /** Kosong = kata sandi tidak diubah. */
  kataSandi: z.union([z.literal(''), kataSandiBaru]).optional(),
});

function emailDipakai() {
  return new HttpError(409, 'Email sudah dipakai pengguna lain.', 'DUPLICATE', [{ path: 'email', message: 'Email sudah dipakai pengguna lain.' }]);
}

penggunaRouter.post('/', requireIzin('kelolaPengguna'), async (req, res) => {
  const { kataSandi, ...data } = buatSchema.parse(req.body);
  try {
    const pengguna = await prisma.pengguna.create({
      data: { ...data, passwordHash: await hashPassword(kataSandi) },
      select: penggunaSelect,
    });
    res.status(201).json({ pengguna: denganTandaTangan(pengguna) });
  } catch (err) {
    if (isUniqueViolation(err)) throw emailDipakai();
    throw err;
  }
});

penggunaRouter.put('/:id', requireIzin('kelolaPengguna'), async (req, res) => {
  const id = paramId(req);
  const { kataSandi, ...data } = ubahSchema.parse(req.body);
  const me = currentUser(req);
  const lama = await prisma.pengguna.findUnique({ where: { id }, select: { peran: true, aktif: true } });
  if (!lama) throw tidakDitemukan('Pengguna');

  if (id === me.id && (!data.aktif || data.peran !== 'admin')) {
    throw new HttpError(400, 'Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.', 'SELF_LOCKOUT');
  }
  const kehilanganAdmin = lama.peran === 'admin' && lama.aktif && (data.peran !== 'admin' || !data.aktif);
  if (kehilanganAdmin && (await prisma.pengguna.count({ where: { peran: 'admin', aktif: true } })) <= 1) {
    throw new HttpError(400, 'Harus ada minimal satu admin aktif.', 'LAST_ADMIN');
  }

  // Sesi dicabut bila kata sandi direset, akun dinonaktifkan, atau peran berubah.
  const cabutSesi = Boolean(kataSandi) || !data.aktif || data.peran !== lama.peran;
  try {
    const pengguna = await prisma.pengguna.update({
      where: { id },
      data: {
        ...data,
        ...(kataSandi ? { passwordHash: await hashPassword(kataSandi) } : {}),
        ...(cabutSesi ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: penggunaSelect,
    });
    res.json({ pengguna: denganTandaTangan(pengguna) });
  } catch (err) {
    if (isUniqueViolation(err)) throw emailDipakai();
    throw err;
  }
});
