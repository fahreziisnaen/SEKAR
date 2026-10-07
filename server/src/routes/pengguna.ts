import { Router } from 'express';
import { z } from 'zod';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { kirimPrivat, MIME, type Ekstensi } from '../lib/uploads.js';
import { hashPassword } from '../lib/password.js';
import { isUniqueViolation, prisma } from '../lib/prisma.js';
import { emailOpsional, paramId, teks, teksOpsional, username } from '../lib/validasi.js';
import { currentUser, requireAuth, requireIzin } from '../middleware/auth.js';
import { hapusMfa } from '../services/mfa.js';
import { denganTandaTangan } from '../services/tandaTangan.js';
import { kataSandiBaru } from './auth.js';

export const penggunaRouter = Router();
penggunaRouter.use(requireAuth);

const penggunaSelect = {
  id: true,
  nama: true,
  username: true,
  email: true,
  peran: true,
  aktif: true,
  jabatan: true,
  telepon: true,
  tanggungJawab: true,
  tandaTanganDiperbarui: true,
  mfaAktifSejak: true,
} as const;

type BarisPengguna = Awaited<ReturnType<typeof prisma.pengguna.findMany<{ select: typeof penggunaSelect }>>>[number];

function keDto({ mfaAktifSejak, ...p }: BarisPengguna) {
  return { ...denganTandaTangan(p), mfaAktif: mfaAktifSejak !== null };
}

/** Semua anggota boleh melihat daftar pengguna (untuk memilih PIC & tim event). */
penggunaRouter.get('/', async (_req, res) => {
  const pengguna = await prisma.pengguna.findMany({ orderBy: [{ aktif: 'desc' }, { nama: 'asc' }], select: penggunaSelect });
  res.json({ pengguna: pengguna.map(keDto) });
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
  username,
  email: emailOpsional,
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

/** Username & email harus unik; dicek lebih dulu agar pesan galat menunjuk field yang tepat. */
async function pastikanUnik(data: { username: string; email: string | null }, kecualiId?: number) {
  const bentrok = await prisma.pengguna.findFirst({
    where: { OR: [{ username: data.username }, ...(data.email ? [{ email: data.email }] : [])], ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
    select: { username: true },
  });
  if (!bentrok) return;
  const field = bentrok.username === data.username ? 'username' : 'email';
  const pesan = field === 'username' ? 'Username sudah dipakai pengguna lain.' : 'Email sudah dipakai pengguna lain.';
  throw new HttpError(409, pesan, 'DUPLICATE', [{ path: field, message: pesan }]);
}

function sudahDipakai() {
  return new HttpError(409, 'Username atau email sudah dipakai pengguna lain.', 'DUPLICATE');
}

penggunaRouter.post('/', requireIzin('kelolaPengguna'), async (req, res) => {
  const { kataSandi, ...data } = buatSchema.parse(req.body);
  await pastikanUnik(data);
  try {
    const pengguna = await prisma.pengguna.create({
      data: { ...data, passwordHash: await hashPassword(kataSandi) },
      select: penggunaSelect,
    });
    res.status(201).json({ pengguna: keDto(pengguna) });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahDipakai();
    throw err;
  }
});

penggunaRouter.put('/:id', requireIzin('kelolaPengguna'), async (req, res) => {
  const id = paramId(req);
  const { kataSandi, ...data } = ubahSchema.parse(req.body);
  const me = currentUser(req);
  const lama = await prisma.pengguna.findUnique({ where: { id }, select: { peran: true, aktif: true, username: true } });
  if (!lama) throw tidakDitemukan('Pengguna');
  await pastikanUnik(data, id);

  if (id === me.id && (!data.aktif || data.peran !== 'admin')) {
    throw new HttpError(400, 'Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.', 'SELF_LOCKOUT');
  }
  const kehilanganAdmin = lama.peran === 'admin' && lama.aktif && (data.peran !== 'admin' || !data.aktif);
  if (kehilanganAdmin && (await prisma.pengguna.count({ where: { peran: 'admin', aktif: true } })) <= 1) {
    throw new HttpError(400, 'Harus ada minimal satu admin aktif.', 'LAST_ADMIN');
  }

  // Sesi dicabut bila kata sandi direset, akun dinonaktifkan, peran, atau username berubah.
  const cabutSesi = Boolean(kataSandi) || !data.aktif || data.peran !== lama.peran || data.username !== lama.username;
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
    res.json({ pengguna: keDto(pengguna) });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahDipakai();
    throw err;
  }
});

/**
 * Reset MFA pengguna lain (mis. ponsel hilang): MFA dimatikan dan semua sesinya dicabut.
 * Bila organisasi mewajibkan MFA, pengguna memasang ulang saat masuk berikutnya.
 */
penggunaRouter.delete('/:id/mfa', requireIzin('kelolaPengguna'), async (req, res) => {
  const id = paramId(req);
  if (id === currentUser(req).id) {
    throw new HttpError(400, 'Atur MFA akun Anda sendiri lewat Pengaturan › Akun Saya.', 'SELF_MFA');
  }
  if (!(await prisma.pengguna.findUnique({ where: { id }, select: { id: true } }))) throw tidakDitemukan('Pengguna');
  await hapusMfa(id, true);
  const pengguna = await prisma.pengguna.findUniqueOrThrow({ where: { id }, select: penggunaSelect });
  res.json({ pengguna: keDto(pengguna) });
});
