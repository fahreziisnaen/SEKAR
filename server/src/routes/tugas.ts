import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { tidakDitemukan } from '../lib/http-error.js';
import { isNotFound, prisma } from '../lib/prisma.js';
import { dariIso, keIso, tanggalIso } from '../lib/tanggal.js';
import { paramId, teks } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';
import { pastikanEvent, pastikanPenggunaAktif } from '../services/event.js';

const tugasSelect = {
  id: true,
  eventId: true,
  label: true,
  tenggat: true,
  selesai: true,
  pic: { select: { id: true, nama: true } },
} as const satisfies Prisma.TugasSelect;

type TugasRow = Prisma.TugasGetPayload<{ select: typeof tugasSelect }>;

function toTugasDto(t: TugasRow) {
  return { ...t, tenggat: t.tenggat ? keIso(t.tenggat) : null };
}

const picOpsional = z.coerce.number().int().positive().nullish().transform((v) => v ?? null);
const tenggatOpsional = z
  .union([z.literal(''), tanggalIso])
  .nullish()
  .transform((v) => (v ? dariIso(v) : null));

/** `/api/event/:eventId/tugas` */
export const tugasEventRouter = Router({ mergeParams: true });
tugasEventRouter.use(requireAuth);

tugasEventRouter.get('/', async (req, res) => {
  const eventId = paramId(req, 'eventId');
  await pastikanEvent(eventId);
  const rows = await prisma.tugas.findMany({ where: { eventId }, orderBy: [{ urutan: 'asc' }, { id: 'asc' }], select: tugasSelect });
  res.json({ tugas: rows.map(toTugasDto) });
});

const buatSchema = z.object({ label: teks('Kebutuhan', 160), picId: picOpsional, tenggat: tenggatOpsional });

tugasEventRouter.post('/', requireIzin('tulisEvent'), async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const d = buatSchema.parse(req.body);
  await pastikanEvent(eventId);
  if (d.picId) await pastikanPenggunaAktif([d.picId]);
  const urutan = ((await prisma.tugas.aggregate({ where: { eventId }, _max: { urutan: true } }))._max.urutan ?? -1) + 1;
  const row = await prisma.tugas.create({ data: { eventId, ...d, urutan }, select: tugasSelect });
  res.status(201).json({ tugas: toTugasDto(row) });
});

/** `/api/tugas/:id` */
export const tugasRouter = Router();
tugasRouter.use(requireAuth, requireIzin('tulisEvent'));

const ubahSchema = z.object({
  label: teks('Kebutuhan', 160).optional(),
  picId: picOpsional.optional(),
  tenggat: tenggatOpsional.optional(),
  selesai: z.boolean().optional(),
});

tugasRouter.patch('/:id', async (req, res) => {
  const d = ubahSchema.parse(req.body);
  if (d.picId) await pastikanPenggunaAktif([d.picId]);
  try {
    const row = await prisma.tugas.update({ where: { id: paramId(req) }, data: d, select: tugasSelect });
    res.json({ tugas: toTugasDto(row) });
  } catch (err) {
    if (isNotFound(err)) throw tidakDitemukan('Kebutuhan');
    throw err;
  }
});

tugasRouter.delete('/:id', async (req, res) => {
  const hasil = await prisma.tugas.deleteMany({ where: { id: paramId(req) } });
  if (!hasil.count) throw tidakDitemukan('Kebutuhan');
  res.status(204).end();
});
