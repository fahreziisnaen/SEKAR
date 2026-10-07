import express, { Router } from 'express';
import { z } from 'zod';
import { tidakDitemukan } from '../lib/http-error.js';
import { isNotFound, prisma } from '../lib/prisma.js';
import { paramId, teks, teksOpsional } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';
import { pastikanEvent } from '../services/event.js';

const pesertaSelect = { id: true, nama: true, email: true, telepon: true, tipe: true, registrasi: true, kehadiran: true } as const;

const TIPE = ['anggota', 'mitra', 'umum'] as const;
const REGISTRASI = ['menunggu', 'terverifikasi'] as const;
const KEHADIRAN = ['belum', 'hadir', 'tidak_hadir'] as const;

const pesertaSchema = z.object({
  nama: teks('Nama peserta', 120),
  email: z
    .string()
    .trim()
    .max(160)
    .nullish()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'Format email tidak valid.'),
  telepon: teksOpsional('Telepon', 40),
  tipe: z.enum(TIPE, { error: 'Tipe peserta tidak valid.' }).default('umum'),
  registrasi: z.enum(REGISTRASI, { error: 'Status registrasi tidak valid.' }).default('menunggu'),
  kehadiran: z.enum(KEHADIRAN, { error: 'Status kehadiran tidak valid.' }).default('belum'),
});

export const MAKS_IMPOR_PESERTA = 5000;

/** `/api/event/:eventId/peserta` */
export const pesertaEventRouter = Router({ mergeParams: true });
pesertaEventRouter.use(requireAuth);

pesertaEventRouter.get('/', async (req, res) => {
  const eventId = paramId(req, 'eventId');
  await pastikanEvent(eventId);
  const peserta = await prisma.peserta.findMany({ where: { eventId }, orderBy: [{ nama: 'asc' }, { id: 'asc' }], select: pesertaSelect });
  res.json({ peserta });
});

pesertaEventRouter.post('/', requireIzin('tulisEvent'), async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const d = pesertaSchema.parse(req.body);
  await pastikanEvent(eventId);
  const peserta = await prisma.peserta.create({ data: { eventId, ...d }, select: pesertaSelect });
  res.status(201).json({ peserta });
});

const imporSchema = z.object({
  peserta: z.array(pesertaSchema).min(1, 'Tidak ada baris peserta untuk diimpor.').max(MAKS_IMPOR_PESERTA, `Maksimal ${MAKS_IMPOR_PESERTA} peserta per impor.`),
});

/** Impor massal (hasil parsing CSV di client). Muatan lebih besar dari batas JSON umum. */
pesertaEventRouter.post('/impor', requireIzin('tulisEvent'), express.json({ limit: '2mb' }), async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const { peserta } = imporSchema.parse(req.body);
  await pastikanEvent(eventId);
  const hasil = await prisma.peserta.createMany({ data: peserta.map((p) => ({ eventId, ...p })) });
  res.status(201).json({ jumlah: hasil.count });
});

/** `/api/peserta/:id` */
export const pesertaRouter = Router();
pesertaRouter.use(requireAuth, requireIzin('tulisEvent'));

pesertaRouter.patch('/:id', async (req, res) => {
  const d = pesertaSchema.partial().parse(req.body);
  try {
    const peserta = await prisma.peserta.update({ where: { id: paramId(req) }, data: d, select: pesertaSelect });
    res.json({ peserta });
  } catch (err) {
    if (isNotFound(err)) throw tidakDitemukan('Peserta');
    throw err;
  }
});

pesertaRouter.delete('/:id', async (req, res) => {
  const hasil = await prisma.peserta.deleteMany({ where: { id: paramId(req) } });
  if (!hasil.count) throw tidakDitemukan('Peserta');
  res.status(204).end();
});
