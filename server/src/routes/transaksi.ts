import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { keAngka, nominalPositif } from '../lib/angka.js';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { isUniqueViolation, prisma } from '../lib/prisma.js';
import { dariIso, keIso, tanggalIso } from '../lib/tanggal.js';
import { DITERIMA, fileUpload, hapusPrivat, kirimPrivat, simpanPrivat } from '../lib/uploads.js';
import { idWajib, paramId, teks, teksOpsional } from '../lib/validasi.js';
import { currentUser, requireAuth, requireIzin } from '../middleware/auth.js';
import { nomorBuktiBerikut } from '../services/bukti.js';
import { denganTandaTangan } from '../services/tandaTangan.js';
import { pastikanEvent } from '../services/event.js';

const transaksiSelect = {
  id: true,
  eventId: true,
  tanggal: true,
  keterangan: true,
  jenis: true,
  nominal: true,
  catatan: true,
  pihak: true,
  pihakKeterangan: true,
  bank: true,
  nomorRekening: true,
  nomorReferensi: true,
  nomorBukti: true,
  buktiPath: true,
  buktiNama: true,
  createdAt: true,
  kategori: { select: { id: true, nama: true } },
  metode: { select: { id: true, nama: true } },
  dibuatOleh: { select: { id: true, nama: true, jabatan: true, peran: true, tandaTanganDiperbarui: true } },
} as const satisfies Prisma.TransaksiSelect;

type TransaksiRow = Prisma.TransaksiGetPayload<{ select: typeof transaksiSelect }>;

function toTransaksiDto(t: TransaksiRow) {
  return {
    id: t.id,
    eventId: t.eventId,
    tanggal: keIso(t.tanggal),
    keterangan: t.keterangan,
    jenis: t.jenis,
    nominal: keAngka(t.nominal),
    kategori: t.kategori,
    metode: t.metode,
    catatan: t.catatan,
    pihak: t.pihak,
    pihakKeterangan: t.pihakKeterangan,
    bank: t.bank,
    nomorRekening: t.nomorRekening,
    nomorReferensi: t.nomorReferensi,
    nomorBukti: t.nomorBukti,
    bukti: t.buktiPath ? { nama: t.buktiNama ?? 'bukti', gambar: /\.(jpg|png|webp)$/.test(t.buktiPath) } : null,
    dibuatOleh: denganTandaTangan(t.dibuatOleh),
    dibuatPada: t.createdAt.toISOString(),
  };
}

const rentangSchema = z.object({ dari: tanggalIso.optional(), sampai: tanggalIso.optional() });

/** Filter tanggal inklusif `?dari=YYYY-MM-DD&sampai=YYYY-MM-DD`. */
export function filterRentang(query: unknown): Prisma.DateTimeFilter | undefined {
  const { dari, sampai } = rentangSchema.parse(query);
  if (!dari && !sampai) return undefined;
  return { ...(dari ? { gte: dariIso(dari) } : {}), ...(sampai ? { lte: dariIso(sampai) } : {}) };
}

/** `/api/event/:eventId/transaksi` */
export const transaksiEventRouter = Router({ mergeParams: true });
transaksiEventRouter.use(requireAuth);

transaksiEventRouter.get('/', async (req, res) => {
  const eventId = paramId(req, 'eventId');
  await pastikanEvent(eventId);
  const rows = await prisma.transaksi.findMany({
    where: { eventId, tanggal: filterRentang(req.query) },
    orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
    select: transaksiSelect,
  });
  res.json({ transaksi: rows.map(toTransaksiDto) });
});

const buatSchema = z.object({
  tanggal: tanggalIso,
  keterangan: teks('Deskripsi', 200),
  kategoriId: idWajib('Kategori'),
  nominal: nominalPositif,
  metodeId: idWajib('Metode pembayaran'),
  catatan: teksOpsional('Catatan', 500),
  pihak: teksOpsional('Nama pihak', 160),
  pihakKeterangan: teksOpsional('Keterangan pihak', 120),
  bank: teksOpsional('Bank', 80),
  nomorRekening: teksOpsional('Nomor rekening', 40),
  nomorReferensi: teksOpsional('Nomor referensi', 80),
});

/** Percobaan ulang bila dua pemasukan bersamaan mendapat nomor bukti yang sama. */
const PERCOBAAN_NOMOR = 5;

transaksiEventRouter.post('/', requireIzin('tulisKeuangan'), fileUpload, async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const d = buatSchema.parse(req.body);
  await pastikanEvent(eventId);
  const [kategori, metode] = await Promise.all([
    prisma.kategoriKeuangan.findUnique({ where: { id: d.kategoriId }, select: { jenis: true } }),
    prisma.metodePembayaran.findUnique({ where: { id: d.metodeId }, select: { id: true } }),
  ]);
  if (!kategori) throw new HttpError(400, 'Kategori tidak ditemukan.', 'KATEGORI_TIDAK_VALID');
  if (!metode) throw new HttpError(400, 'Metode pembayaran tidak ditemukan.', 'METODE_TIDAK_VALID');
  const masuk = kategori.jenis === 'masuk';
  if (masuk && !d.pihak) {
    throw new HttpError(400, 'Pemberi dana wajib diisi untuk pemasukan.', 'VALIDATION_ERROR', [{ path: 'pihak', message: 'Pemberi dana wajib diisi untuk pemasukan.' }]);
  }

  const bukti = req.file ? await simpanPrivat('bukti', req.file, DITERIMA.bukti) : null;
  const data = {
    eventId,
    tanggal: dariIso(d.tanggal),
    keterangan: d.keterangan,
    jenis: kategori.jenis,
    kategoriId: d.kategoriId,
    nominal: BigInt(d.nominal),
    metodeId: d.metodeId,
    catatan: d.catatan,
    pihak: d.pihak,
    pihakKeterangan: d.pihakKeterangan,
    bank: d.bank,
    nomorRekening: d.nomorRekening,
    nomorReferensi: d.nomorReferensi,
    buktiPath: bukti?.relPath ?? null,
    buktiNama: bukti?.namaAsli ?? null,
    dibuatOlehId: currentUser(req).id,
  };
  try {
    for (let percobaan = 1; ; percobaan++) {
      try {
        // Pemasukan langsung mendapat nomor Bukti Penerimaan Dana berurutan per tanggal transaksi.
        const nomorBukti = masuk ? await nomorBuktiBerikut(prisma, d.tanggal) : null;
        const row = await prisma.transaksi.create({ data: { ...data, nomorBukti }, select: transaksiSelect });
        res.status(201).json({ transaksi: toTransaksiDto(row) });
        return;
      } catch (err) {
        if (!(masuk && isUniqueViolation(err) && percobaan < PERCOBAAN_NOMOR)) throw err;
      }
    }
  } catch (err) {
    await hapusPrivat(bukti?.relPath);
    throw err;
  }
});

/** `/api/transaksi/:id` */
export const transaksiRouter = Router();
transaksiRouter.use(requireAuth);

transaksiRouter.get('/:id/bukti', async (req, res) => {
  const row = await prisma.transaksi.findUnique({ where: { id: paramId(req) }, select: { buktiPath: true, buktiNama: true } });
  if (!row?.buktiPath) throw tidakDitemukan('Bukti transaksi');
  const ext = row.buktiPath.split('.').pop()!;
  const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  kirimPrivat(res, row.buktiPath, row.buktiNama ?? `bukti.${ext}`, mime, req.query.inline === '1');
});

transaksiRouter.delete('/:id', requireIzin('tulisKeuangan'), async (req, res) => {
  const id = paramId(req);
  const row = await prisma.transaksi.findUnique({ where: { id }, select: { buktiPath: true } });
  if (!row) throw tidakDitemukan('Transaksi');
  await prisma.transaksi.delete({ where: { id } });
  await hapusPrivat(row.buktiPath);
  res.status(204).end();
});
