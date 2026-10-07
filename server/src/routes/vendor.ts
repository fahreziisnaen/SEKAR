import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { keAngka, nominal } from '../lib/angka.js';
import { tidakDitemukan } from '../lib/http-error.js';
import { isNotFound, prisma } from '../lib/prisma.js';
import { paramId, teks, teksOpsional } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';
import { pastikanEvent } from '../services/event.js';

const vendorSelect = {
  id: true,
  nama: true,
  kategori: true,
  picNama: true,
  kontak: true,
  nilaiKontrak: true,
  terbayar: true,
  catatan: true,
} as const satisfies Prisma.VendorSelect;

type VendorRow = Prisma.VendorGetPayload<{ select: typeof vendorSelect }>;

function toVendorDto(v: VendorRow) {
  return { ...v, nilaiKontrak: keAngka(v.nilaiKontrak), terbayar: keAngka(v.terbayar) };
}

const vendorSchema = z
  .object({
    nama: teks('Nama vendor', 160),
    kategori: teks('Kategori', 60),
    picNama: teksOpsional('PIC vendor', 120),
    kontak: teksOpsional('Kontak', 60),
    nilaiKontrak: nominal,
    terbayar: nominal.default(0),
    catatan: teksOpsional('Catatan', 255),
  })
  .refine((v) => v.terbayar <= v.nilaiKontrak, { message: 'Jumlah terbayar tidak boleh melebihi nilai kontrak.', path: ['terbayar'] });

function kolom(d: z.infer<typeof vendorSchema>) {
  return { ...d, nilaiKontrak: BigInt(d.nilaiKontrak), terbayar: BigInt(d.terbayar) };
}

/** `/api/event/:eventId/vendor` */
export const vendorEventRouter = Router({ mergeParams: true });
vendorEventRouter.use(requireAuth);

vendorEventRouter.get('/', async (req, res) => {
  const eventId = paramId(req, 'eventId');
  await pastikanEvent(eventId);
  const rows = await prisma.vendor.findMany({ where: { eventId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: vendorSelect });
  res.json({ vendor: rows.map(toVendorDto) });
});

vendorEventRouter.post('/', requireIzin('tulisEvent'), async (req, res) => {
  const eventId = paramId(req, 'eventId');
  const d = vendorSchema.parse(req.body);
  await pastikanEvent(eventId);
  const row = await prisma.vendor.create({ data: { eventId, ...kolom(d) }, select: vendorSelect });
  res.status(201).json({ vendor: toVendorDto(row) });
});

/** `/api/vendor/:id` */
export const vendorRouter = Router();
vendorRouter.use(requireAuth, requireIzin('tulisEvent'));

vendorRouter.put('/:id', async (req, res) => {
  const d = vendorSchema.parse(req.body);
  try {
    const row = await prisma.vendor.update({ where: { id: paramId(req) }, data: kolom(d), select: vendorSelect });
    res.json({ vendor: toVendorDto(row) });
  } catch (err) {
    if (isNotFound(err)) throw tidakDitemukan('Vendor');
    throw err;
  }
});

vendorRouter.delete('/:id', async (req, res) => {
  const hasil = await prisma.vendor.deleteMany({ where: { id: paramId(req) } });
  if (!hasil.count) throw tidakDitemukan('Vendor');
  res.status(204).end();
});
