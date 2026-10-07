import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { isNotFound, prisma } from '../lib/prisma.js';
import { DITERIMA, fileUpload, hapusPrivat, kirimPrivat, simpanPrivat, wajibAdaBerkas } from '../lib/uploads.js';
import { idWajib, paramId, teks } from '../lib/validasi.js';
import { currentUser, requireAuth, requireIzin } from '../middleware/auth.js';
import { pastikanEvent } from '../services/event.js';

const STATUS_DOKUMEN = ['draft', 'menunggu', 'disetujui', 'final'] as const;

const dokumenSelect = {
  id: true,
  eventId: true,
  nama: true,
  status: true,
  filePath: true,
  fileNama: true,
  ukuran: true,
  createdAt: true,
  jenis: { select: { id: true, nama: true } },
  diunggahOleh: { select: { id: true, nama: true } },
} as const satisfies Prisma.DokumenSelect;

type DokumenRow = Prisma.DokumenGetPayload<{ select: typeof dokumenSelect }>;

function toDokumenDto({ filePath, fileNama, ukuran, createdAt, ...d }: DokumenRow) {
  return { ...d, file: { nama: fileNama, ukuran, ext: filePath.split('.').pop() ?? '' }, diunggahPada: createdAt.toISOString() };
}

async function pastikanJenis(jenisId: number) {
  const ada = await prisma.jenisDokumen.findUnique({ where: { id: jenisId }, select: { id: true } });
  if (!ada) throw new HttpError(400, 'Jenis dokumen tidak ditemukan.', 'JENIS_TIDAK_VALID');
}

/** `/api/event/:eventId/dokumen` */
export const dokumenEventRouter = Router({ mergeParams: true });
dokumenEventRouter.use(requireAuth);

dokumenEventRouter.get('/', async (req, res) => {
  const eventId = paramId(req, 'eventId');
  await pastikanEvent(eventId);
  const rows = await prisma.dokumen.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' }, select: dokumenSelect });
  res.json({ dokumen: rows.map(toDokumenDto) });
});

const buatSchema = z.object({
  nama: teks('Nama dokumen', 160),
  jenisId: idWajib('Jenis dokumen'),
  status: z.enum(STATUS_DOKUMEN).default('draft'),
});

dokumenEventRouter.post('/', requireIzin('tulisEvent'), fileUpload, async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const d = buatSchema.parse(req.body);
  const file = wajibAdaBerkas(req.file);
  await pastikanEvent(eventId);
  await pastikanJenis(d.jenisId);
  const berkas = await simpanPrivat('dokumen', file, DITERIMA.dokumen);
  try {
    const row = await prisma.dokumen.create({
      data: {
        eventId,
        ...d,
        filePath: berkas.relPath,
        fileNama: berkas.namaAsli,
        mime: berkas.mime,
        ukuran: berkas.ukuran,
        diunggahOlehId: currentUser(req).id,
      },
      select: dokumenSelect,
    });
    res.status(201).json({ dokumen: toDokumenDto(row) });
  } catch (err) {
    await hapusPrivat(berkas.relPath);
    throw err;
  }
});

/** `/api/dokumen/:id` */
export const dokumenRouter = Router();
dokumenRouter.use(requireAuth);

dokumenRouter.get('/:id/unduh', async (req, res) => {
  const row = await prisma.dokumen.findUnique({ where: { id: paramId(req) }, select: { filePath: true, fileNama: true, mime: true } });
  if (!row) throw tidakDitemukan('Dokumen');
  kirimPrivat(res, row.filePath, row.fileNama, row.mime, false);
});

const ubahSchema = z.object({
  nama: teks('Nama dokumen', 160).optional(),
  jenisId: idWajib('Jenis dokumen').optional(),
  status: z.enum(STATUS_DOKUMEN, { error: 'Status dokumen tidak valid.' }).optional(),
});

dokumenRouter.patch('/:id', requireIzin('tulisEvent'), async (req, res) => {
  const d = ubahSchema.parse(req.body);
  if (d.jenisId) await pastikanJenis(d.jenisId);
  try {
    const row = await prisma.dokumen.update({ where: { id: paramId(req) }, data: d, select: dokumenSelect });
    res.json({ dokumen: toDokumenDto(row) });
  } catch (err) {
    if (isNotFound(err)) throw tidakDitemukan('Dokumen');
    throw err;
  }
});

dokumenRouter.delete('/:id', requireIzin('tulisEvent'), async (req, res) => {
  const id = paramId(req);
  const row = await prisma.dokumen.findUnique({ where: { id }, select: { filePath: true } });
  if (!row) throw tidakDitemukan('Dokumen');
  await prisma.dokumen.delete({ where: { id } });
  await hapusPrivat(row.filePath);
  res.status(204).end();
});
