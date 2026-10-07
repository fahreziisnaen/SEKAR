import { Router } from 'express';
import { z } from 'zod';
import { nominal } from '../lib/angka.js';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { isNotFound, prisma } from '../lib/prisma.js';
import { dariIso, tanggalIso } from '../lib/tanggal.js';
import { hapusPrivat } from '../lib/uploads.js';
import { idWajib, paramId, teks, teksOpsional } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';
import { daftarEvent, detailEvent, pastikanEvent, pastikanPenggunaAktif } from '../services/event.js';

export const eventRouter = Router();
eventRouter.use(requireAuth);

export const STATUS_EVENT = ['draft', 'akan_datang', 'berlangsung', 'selesai', 'dibatalkan'] as const;
/** Jumlah tahap timeline (Perencanaan … Selesai). */
export const JUMLAH_TAHAP = 5;

const dasarSchema = z.object({
  nama: teks('Nama event', 160),
  tanggal: tanggalIso,
  waktu: teksOpsional('Jam', 60),
  lokasi: teks('Lokasi', 120),
  venue: teksOpsional('Venue', 200),
  deskripsi: teksOpsional('Deskripsi', 5000),
  picId: idWajib('PIC'),
  anggotaIds: z.array(z.coerce.number().int().positive()).max(500).default([]),
  budget: nominal.default(0),
  targetPemasukan: nominal.default(0),
  estimasiPengeluaran: nominal.default(0),
});

const buatSchema = dasarSchema.extend({
  templateId: z.coerce.number().int().positive().nullish(),
});

const ubahSchema = dasarSchema.extend({
  status: z.enum(STATUS_EVENT, { error: 'Status event tidak valid.' }),
  tahap: z.coerce.number().int().min(0).max(JUMLAH_TAHAP - 1),
});

function kolomEvent(d: z.infer<typeof dasarSchema>) {
  return {
    nama: d.nama,
    tanggal: dariIso(d.tanggal),
    waktu: d.waktu,
    lokasi: d.lokasi,
    venue: d.venue,
    deskripsi: d.deskripsi,
    picId: d.picId,
    budget: BigInt(d.budget),
    targetPemasukan: BigInt(d.targetPemasukan),
    estimasiPengeluaran: BigInt(d.estimasiPengeluaran),
  };
}

eventRouter.get('/', async (_req, res) => {
  res.json({ event: await daftarEvent() });
});

eventRouter.post('/', requireIzin('tulisEvent'), async (req, res) => {
  const { templateId, anggotaIds, ...d } = buatSchema.parse(req.body);
  await pastikanPenggunaAktif([d.picId, ...anggotaIds]);
  const template = templateId
    ? await prisma.templateEvent.findUnique({ where: { id: templateId }, select: { tugas: { orderBy: { urutan: 'asc' }, select: { label: true } } } })
    : null;
  if (templateId && !template) throw tidakDitemukan('Template');

  const tanggal = dariIso(d.tanggal);
  const dibuat = await prisma.event.create({
    data: {
      ...kolomEvent({ ...d, anggotaIds }),
      anggota: { create: [...new Set(anggotaIds)].map((penggunaId) => ({ penggunaId })) },
      tugas: { create: (template?.tugas ?? []).map((t, urutan) => ({ label: t.label, picId: d.picId, tenggat: tanggal, urutan })) },
    },
    select: { id: true },
  });
  res.status(201).json({ event: await detailEvent(dibuat.id) });
});

eventRouter.get('/:id', async (req, res) => {
  res.json({ event: await detailEvent(paramId(req)) });
});

eventRouter.put('/:id', requireIzin('tulisEvent'), async (req, res) => {
  const id = paramId(req);
  const { anggotaIds, status, tahap, ...d } = ubahSchema.parse(req.body);
  await pastikanEvent(id);
  await pastikanPenggunaAktif([d.picId, ...anggotaIds]);
  await prisma.$transaction([
    prisma.event.update({ where: { id }, data: { ...kolomEvent({ ...d, anggotaIds }), status, tahap } }),
    prisma.anggotaEvent.deleteMany({ where: { eventId: id } }),
    prisma.anggotaEvent.createMany({ data: [...new Set(anggotaIds)].map((penggunaId) => ({ eventId: id, penggunaId })) }),
  ]);
  res.json({ event: await detailEvent(id) });
});

eventRouter.delete('/:id', requireIzin('hapusEvent'), async (req, res) => {
  const id = paramId(req);
  const [bukti, dokumen] = await Promise.all([
    prisma.transaksi.findMany({ where: { eventId: id, buktiPath: { not: null } }, select: { buktiPath: true } }),
    prisma.dokumen.findMany({ where: { eventId: id }, select: { filePath: true } }),
  ]);
  try {
    await prisma.event.delete({ where: { id } });
  } catch (err) {
    if (isNotFound(err)) throw tidakDitemukan('Event');
    throw err;
  }
  // Berkas dihapus setelah baris database terhapus; berkas yatim lebih aman daripada referensi rusak.
  await Promise.all([...bukti.map((b) => hapusPrivat(b.buktiPath)), ...dokumen.map((d) => hapusPrivat(d.filePath))]);
  res.status(204).end();
});

const anggaranSchema = z.object({
  items: z
    .array(z.object({ kategoriId: idWajib('Kategori'), nominal }))
    .max(200)
    .refine((list) => new Set(list.map((i) => i.kategoriId)).size === list.length, 'Kategori tidak boleh berulang.'),
});

/** Mengganti seluruh budget per kategori pengeluaran. Nominal 0 = kategori tidak dianggarkan. */
eventRouter.put('/:id/anggaran', requireIzin('tulisKeuangan'), async (req, res) => {
  const id = paramId(req);
  const { items } = anggaranSchema.parse(req.body);
  await pastikanEvent(id);
  const dipakai = items.filter((i) => i.nominal > 0);
  if (dipakai.length) {
    const valid = await prisma.kategoriKeuangan.count({ where: { id: { in: dipakai.map((i) => i.kategoriId) }, jenis: 'keluar' } });
    if (valid !== dipakai.length) throw new HttpError(400, 'Budget hanya dapat diatur untuk kategori pengeluaran.', 'KATEGORI_TIDAK_VALID');
  }
  await prisma.$transaction([
    prisma.anggaran.deleteMany({ where: { eventId: id } }),
    prisma.anggaran.createMany({ data: dipakai.map((i) => ({ eventId: id, kategoriId: i.kategoriId, nominal: BigInt(i.nominal) })) }),
  ]);
  res.json({ event: await detailEvent(id) });
});
