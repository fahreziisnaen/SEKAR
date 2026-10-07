import type { Prisma } from '../generated/prisma/client.js';
import { keAngka } from '../lib/angka.js';
import { HttpError, tidakDitemukan } from '../lib/http-error.js';
import { prisma, type DbClient } from '../lib/prisma.js';
import { keIso } from '../lib/tanggal.js';
import { denganTandaTangan } from './tandaTangan.js';

export const eventSelect = {
  id: true,
  nama: true,
  tanggal: true,
  waktu: true,
  lokasi: true,
  venue: true,
  deskripsi: true,
  status: true,
  tahap: true,
  budget: true,
  targetPemasukan: true,
  estimasiPengeluaran: true,
  pic: { select: { id: true, nama: true, tandaTanganDiperbarui: true } },
} as const satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof eventSelect }>;

interface Agregat {
  masuk: number;
  keluar: number;
  jumlahTransaksi: number;
  tugasSelesai: number;
  tugasTotal: number;
}

const KOSONG: Agregat = { masuk: 0, keluar: 0, jumlahTransaksi: 0, tugasSelesai: 0, tugasTotal: 0 };

/** Jumlah transaksi & kebutuhan per event dalam dua query agregat. */
export async function agregatEvent(eventIds: number[], db: DbClient = prisma): Promise<Map<number, Agregat>> {
  const hasil = new Map<number, Agregat>(eventIds.map((id) => [id, { ...KOSONG }]));
  if (!eventIds.length) return hasil;
  const [tx, tugas] = await Promise.all([
    db.transaksi.groupBy({ by: ['eventId', 'jenis'], where: { eventId: { in: eventIds } }, _sum: { nominal: true }, _count: { _all: true } }),
    db.tugas.groupBy({ by: ['eventId', 'selesai'], where: { eventId: { in: eventIds } }, _count: { _all: true } }),
  ]);
  for (const r of tx) {
    const a = hasil.get(r.eventId)!;
    a[r.jenis] = keAngka(r._sum.nominal);
    a.jumlahTransaksi += r._count._all;
  }
  for (const r of tugas) {
    const a = hasil.get(r.eventId)!;
    a.tugasTotal += r._count._all;
    if (r.selesai) a.tugasSelesai += r._count._all;
  }
  return hasil;
}

/** Progres = porsi kebutuhan yang selesai; event berstatus selesai selalu 100%. */
export function hitungProgres(status: string, tugasSelesai: number, tugasTotal: number): number {
  if (status === 'selesai') return 100;
  return tugasTotal ? Math.round((tugasSelesai / tugasTotal) * 100) : 0;
}

export function toEventDto(e: EventRow, a: Agregat = KOSONG) {
  return {
    id: e.id,
    nama: e.nama,
    tanggal: keIso(e.tanggal),
    waktu: e.waktu,
    lokasi: e.lokasi,
    venue: e.venue,
    deskripsi: e.deskripsi,
    status: e.status,
    tahap: e.tahap,
    budget: keAngka(e.budget),
    targetPemasukan: keAngka(e.targetPemasukan),
    estimasiPengeluaran: keAngka(e.estimasiPengeluaran),
    pic: denganTandaTangan(e.pic),
    progress: hitungProgres(e.status, a.tugasSelesai, a.tugasTotal),
    ...a,
  };
}

export async function daftarEvent(where: Prisma.EventWhereInput = {}) {
  const rows = await prisma.event.findMany({ where, select: eventSelect, orderBy: [{ tanggal: 'desc' }, { id: 'desc' }] });
  const agregat = await agregatEvent(rows.map((r) => r.id));
  return rows.map((r) => toEventDto(r, agregat.get(r.id)));
}

export const anggotaSelect = {
  id: true,
  nama: true,
  jabatan: true,
  telepon: true,
  tanggungJawab: true,
  aktif: true,
} as const satisfies Prisma.PenggunaSelect;

export async function detailEvent(id: number) {
  const row = await prisma.event.findUnique({
    where: { id },
    select: {
      ...eventSelect,
      anggota: { select: { pengguna: { select: anggotaSelect } }, orderBy: { pengguna: { nama: 'asc' } } },
      anggaran: { select: { kategoriId: true, nominal: true } },
    },
  });
  if (!row) throw tidakDitemukan('Event');
  const agregat = await agregatEvent([id]);
  return {
    ...toEventDto(row, agregat.get(id)),
    anggota: row.anggota.map((a) => a.pengguna),
    anggaran: row.anggaran.map((a) => ({ kategoriId: a.kategoriId, nominal: keAngka(a.nominal) })),
  };
}

/** Memastikan event ada; dipakai sebelum membuat data turunan. */
export async function pastikanEvent(id: number, db: DbClient = prisma): Promise<void> {
  const ada = await db.event.findUnique({ where: { id }, select: { id: true } });
  if (!ada) throw tidakDitemukan('Event');
}

/** PIC & anggota tim harus akun aktif. */
export async function pastikanPenggunaAktif(ids: number[], db: DbClient = prisma): Promise<void> {
  const unik = [...new Set(ids)];
  if (!unik.length) return;
  const jumlah = await db.pengguna.count({ where: { id: { in: unik }, aktif: true } });
  if (jumlah !== unik.length) {
    throw new HttpError(400, 'PIC atau anggota tim harus pengguna yang aktif.', 'PENGGUNA_TIDAK_VALID');
  }
}
