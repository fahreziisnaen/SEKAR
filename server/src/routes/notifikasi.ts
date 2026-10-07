import { Router } from 'express';
import { env } from '../env.js';
import { keAngka } from '../lib/angka.js';
import { prisma } from '../lib/prisma.js';
import { dariIso, hariIni, keIso, tambahHari } from '../lib/tanggal.js';
import { requireAuth } from '../middleware/auth.js';
import { agregatEvent } from '../services/event.js';
import { ambilOrganisasi } from './organisasi.js';

export const notifikasiRouter = Router();
notifikasiRouter.use(requireAuth);

/** Tenggat dianggap dekat bila jatuh dalam rentang hari ini + N hari. */
export const HARI_PENGINGAT = 2;
/** Peringatan saat pengeluaran mencapai porsi budget ini. */
export const AMBANG_BUDGET = 0.9;

const STATUS_AKTIF = ['draft', 'akan_datang', 'berlangsung'] as const;

/**
 * Notifikasi dalam aplikasi, dihitung saat diminta sesuai pengaturan organisasi:
 * kebutuhan yang lewat/dekat tenggat dan event yang pengeluarannya mendekati budget.
 */
notifikasiRouter.get('/', async (_req, res) => {
  const org = await ambilOrganisasi();
  const hari = hariIni(env.APP_TIMEZONE);
  const notifikasi: Array<Record<string, unknown>> = [];

  if (org?.notifPengingatTenggat ?? true) {
    const tugas = await prisma.tugas.findMany({
      where: { selesai: false, tenggat: { lte: dariIso(tambahHari(hari, HARI_PENGINGAT)) }, event: { status: { in: [...STATUS_AKTIF] } } },
      orderBy: [{ tenggat: 'asc' }, { id: 'asc' }],
      take: 30,
      select: { id: true, label: true, tenggat: true, event: { select: { id: true, nama: true } }, pic: { select: { nama: true } } },
    });
    for (const t of tugas) {
      const tenggat = keIso(t.tenggat!);
      notifikasi.push({ tipe: 'tenggat', id: `tugas-${t.id}`, event: t.event, judul: t.label, pic: t.pic?.nama ?? null, tanggal: tenggat, lewat: tenggat < hari });
    }
  }

  if (org?.notifPeringatanKeuangan ?? true) {
    const events = await prisma.event.findMany({
      where: { status: { in: [...STATUS_AKTIF] }, budget: { gt: 0 } },
      select: { id: true, nama: true, budget: true },
    });
    const agregat = await agregatEvent(events.map((e) => e.id));
    for (const e of events) {
      const keluar = agregat.get(e.id)!.keluar;
      const budget = keAngka(e.budget);
      if (keluar >= budget * AMBANG_BUDGET) {
        notifikasi.push({ tipe: 'keuangan', id: `budget-${e.id}`, event: { id: e.id, nama: e.nama }, persen: Math.round((keluar / budget) * 100) });
      }
    }
  }

  res.json({ notifikasi });
});
