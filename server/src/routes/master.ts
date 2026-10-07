import { Router } from 'express';
import { z } from 'zod';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { isForeignKeyViolation, isNotFound, isUniqueViolation, prisma } from '../lib/prisma.js';
import { paramId, teks, teksOpsional } from '../lib/validasi.js';
import { requireAuth, requireIzin } from '../middleware/auth.js';

/** Data master: kategori keuangan, metode pembayaran, jenis dokumen, dan template event. */
export const masterRouter = Router();
masterRouter.use(requireAuth);

const urut = [{ urutan: 'asc' as const }, { nama: 'asc' as const }];

async function ambilTemplate() {
  const rows = await prisma.templateEvent.findMany({
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, deskripsi: true, tugas: { orderBy: { urutan: 'asc' }, select: { label: true } } },
  });
  return rows.map((t) => ({ ...t, tugas: t.tugas.map((x) => x.label) }));
}

masterRouter.get('/', async (_req, res) => {
  const [kategori, metode, jenisDokumen, template] = await Promise.all([
    prisma.kategoriKeuangan.findMany({ orderBy: urut, select: { id: true, nama: true, jenis: true } }),
    prisma.metodePembayaran.findMany({ orderBy: urut, select: { id: true, nama: true } }),
    prisma.jenisDokumen.findMany({ orderBy: urut, select: { id: true, nama: true } }),
    ambilTemplate(),
  ]);
  res.json({ kategori, metode, jenisDokumen, template });
});

const tulis = requireIzin('kelolaPengaturan');

function sudahAda(label: string) {
  return new HttpError(409, `${label} dengan nama tersebut sudah ada.`, 'DUPLICATE');
}

function masihDipakai(label: string) {
  return new HttpError(409, `${label} masih dipakai sehingga tidak dapat dihapus.`, 'IN_USE');
}

/** Item baru diletakkan di urutan paling akhir. */
async function urutanBerikut(agg: Promise<{ _max: { urutan: number | null } }>) {
  return ((await agg)._max.urutan ?? -1) + 1;
}

masterRouter.post('/kategori', tulis, async (req, res) => {
  const data = z.object({ nama: teks('Nama kategori', 60), jenis: z.enum(['masuk', 'keluar'], { error: 'Jenis kategori tidak valid.' }) }).parse(req.body);
  try {
    const urutan = await urutanBerikut(prisma.kategoriKeuangan.aggregate({ where: { jenis: data.jenis }, _max: { urutan: true } }));
    const kategori = await prisma.kategoriKeuangan.create({ data: { ...data, urutan }, select: { id: true, nama: true, jenis: true } });
    res.status(201).json({ kategori });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahAda('Kategori');
    throw err;
  }
});

masterRouter.delete('/kategori/:id', tulis, async (req, res) => {
  try {
    await prisma.kategoriKeuangan.delete({ where: { id: paramId(req) } });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw masihDipakai('Kategori');
    if (isNotFound(err)) throw tidakDitemukan('Kategori');
    throw err;
  }
  res.status(204).end();
});

masterRouter.post('/metode', tulis, async (req, res) => {
  const { nama } = z.object({ nama: teks('Nama metode', 60) }).parse(req.body);
  try {
    const urutan = await urutanBerikut(prisma.metodePembayaran.aggregate({ _max: { urutan: true } }));
    const metode = await prisma.metodePembayaran.create({ data: { nama, urutan }, select: { id: true, nama: true } });
    res.status(201).json({ metode });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahAda('Metode pembayaran');
    throw err;
  }
});

masterRouter.delete('/metode/:id', tulis, async (req, res) => {
  try {
    await prisma.metodePembayaran.delete({ where: { id: paramId(req) } });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw masihDipakai('Metode pembayaran');
    if (isNotFound(err)) throw tidakDitemukan('Metode pembayaran');
    throw err;
  }
  res.status(204).end();
});

masterRouter.post('/jenis-dokumen', tulis, async (req, res) => {
  const { nama } = z.object({ nama: teks('Nama jenis dokumen', 60) }).parse(req.body);
  try {
    const urutan = await urutanBerikut(prisma.jenisDokumen.aggregate({ _max: { urutan: true } }));
    const jenisDokumen = await prisma.jenisDokumen.create({ data: { nama, urutan }, select: { id: true, nama: true } });
    res.status(201).json({ jenisDokumen });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahAda('Jenis dokumen');
    throw err;
  }
});

masterRouter.delete('/jenis-dokumen/:id', tulis, async (req, res) => {
  try {
    await prisma.jenisDokumen.delete({ where: { id: paramId(req) } });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw masihDipakai('Jenis dokumen');
    if (isNotFound(err)) throw tidakDitemukan('Jenis dokumen');
    throw err;
  }
  res.status(204).end();
});

const templateSchema = z.object({
  nama: teks('Nama template', 80),
  deskripsi: teksOpsional('Deskripsi', 255),
  tugas: z
    .array(z.string().trim().max(160, 'Kebutuhan maksimal 160 karakter.'))
    .max(100, 'Maksimal 100 kebutuhan per template.')
    .transform((list) => list.filter(Boolean)),
});

masterRouter.post('/template', tulis, async (req, res) => {
  const { tugas, ...data } = templateSchema.parse(req.body);
  try {
    const template = await prisma.templateEvent.create({
      data: { ...data, tugas: { create: tugas.map((label, urutan) => ({ label, urutan })) } },
      select: { id: true },
    });
    res.status(201).json({ template: { id: template.id, ...data, tugas } });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahAda('Template');
    throw err;
  }
});

masterRouter.put('/template/:id', tulis, async (req, res) => {
  const id = paramId(req);
  const { tugas, ...data } = templateSchema.parse(req.body);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.templateEvent.update({ where: { id }, data });
      await tx.templateTugas.deleteMany({ where: { templateId: id } });
      await tx.templateTugas.createMany({ data: tugas.map((label, urutan) => ({ templateId: id, label, urutan })) });
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw sudahAda('Template');
    if (isNotFound(err)) throw tidakDitemukan('Template');
    throw err;
  }
  res.json({ template: { id, ...data, tugas } });
});

masterRouter.delete('/template/:id', tulis, async (req, res) => {
  const hasil = await prisma.templateEvent.deleteMany({ where: { id: paramId(req) } });
  if (!hasil.count) throw tidakDitemukan('Template');
  res.status(204).end();
});
