import { Router } from 'express';
import { z } from 'zod';
import type { StatusEvent } from '../generated/prisma/client.js';
import { keAngka } from '../lib/angka.js';
import { prisma } from '../lib/prisma.js';
import { keIso } from '../lib/tanggal.js';
import { requireAuth } from '../middleware/auth.js';
import { STATUS_EVENT } from './event.js';
import { filterRentang } from './transaksi.js';

export const laporanRouter = Router();
laporanRouter.use(requireAuth);

const rekapSchema = z.object({ status: z.enum(STATUS_EVENT).optional() });

/** Untung/rugi per event; `dari`/`sampai` membatasi transaksi yang dihitung, `status` membatasi event. */
laporanRouter.get('/rekap', async (req, res) => {
  const { status } = rekapSchema.parse(req.query);
  const tanggal = filterRentang(req.query);
  const events = await prisma.event.findMany({
    where: status ? { status: status as StatusEvent } : {},
    orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    select: { id: true, nama: true, tanggal: true, status: true },
  });
  const sums = events.length
    ? await prisma.transaksi.groupBy({
        by: ['eventId', 'jenis'],
        where: { eventId: { in: events.map((e) => e.id) }, tanggal },
        _sum: { nominal: true },
        _count: { _all: true },
      })
    : [];
  const rows = events.map((e) => {
    const milik = sums.filter((s) => s.eventId === e.id);
    const total = (jenis: 'masuk' | 'keluar') => keAngka(milik.find((s) => s.jenis === jenis)?._sum.nominal);
    return {
      event: { ...e, tanggal: keIso(e.tanggal) },
      masuk: total('masuk'),
      keluar: total('keluar'),
      jumlahTransaksi: milik.reduce((n, s) => n + s._count._all, 0),
    };
  });
  res.json({ rekap: rows });
});
