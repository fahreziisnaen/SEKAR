import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { DITERIMA, fileUpload, hapusPublik, simpanPublik, wajibAdaBerkas } from '../lib/uploads.js';
import { teks, teksOpsional } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';

const ID = 1;

const organisasiSelect = {
  nama: true,
  email: true,
  telepon: true,
  kota: true,
  logoUrl: true,
  notifPengingatTenggat: true,
  notifPeringatanKeuangan: true,
} as const;

export async function ambilOrganisasi() {
  return prisma.organisasi.findUnique({ where: { id: ID }, select: organisasiSelect });
}

/** Nama & logo untuk halaman login (tanpa sesi). */
export const organisasiPublikRouter = Router();
organisasiPublikRouter.get('/', async (_req, res) => {
  const org = await ambilOrganisasi();
  res.json({ organisasi: { nama: org?.nama ?? null, logoUrl: org?.logoUrl ?? null } });
});

export const organisasiRouter = Router();
organisasiRouter.use(requireAuth);

organisasiRouter.get('/', async (_req, res) => {
  res.json({ organisasi: await ambilOrganisasi() });
});

const organisasiSchema = z.object({
  nama: teks('Nama organisasi', 120),
  email: z
    .string()
    .trim()
    .max(160)
    .nullish()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'Format email tidak valid.'),
  telepon: teksOpsional('Telepon', 40),
  kota: teksOpsional('Kota', 120),
  notifPengingatTenggat: z.boolean().optional(),
  notifPeringatanKeuangan: z.boolean().optional(),
});

organisasiRouter.put('/', requireIzin('kelolaPengaturan'), async (req, res) => {
  const data = organisasiSchema.parse(req.body);
  const organisasi = await prisma.organisasi.upsert({
    where: { id: ID },
    create: { id: ID, ...data },
    update: data,
    select: organisasiSelect,
  });
  res.json({ organisasi });
});

const notifSchema = z.object({
  notifPengingatTenggat: z.boolean().optional(),
  notifPeringatanKeuangan: z.boolean().optional(),
});

organisasiRouter.patch('/notifikasi', requireIzin('kelolaPengaturan'), async (req, res) => {
  const data = notifSchema.parse(req.body);
  const organisasi = await prisma.organisasi.update({ where: { id: ID }, data, select: organisasiSelect });
  res.json({ organisasi });
});

organisasiRouter.post('/logo', requireIzin('kelolaPengaturan'), fileUpload, async (req, res) => {
  const logoUrl = await simpanPublik('logo', wajibAdaBerkas(req.file), DITERIMA.logo);
  const lama = await ambilOrganisasi();
  const organisasi = await prisma.organisasi.update({ where: { id: ID }, data: { logoUrl }, select: organisasiSelect });
  await hapusPublik(lama?.logoUrl);
  res.json({ organisasi });
});

organisasiRouter.delete('/logo', requireIzin('kelolaPengaturan'), async (_req, res) => {
  const lama = await ambilOrganisasi();
  const organisasi = await prisma.organisasi.update({ where: { id: ID }, data: { logoUrl: null }, select: organisasiSelect });
  await hapusPublik(lama?.logoUrl);
  res.json({ organisasi });
});
