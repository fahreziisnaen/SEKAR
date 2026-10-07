import type { JenisTransaksi, KategoriKeuangan, Transaksi } from '../types';

export interface Ringkasan {
  masuk: number;
  keluar: number;
  /** Pemasukan dikurangi pengeluaran. */
  saldo: number;
  /** Transaksi urut tanggal naik. */
  list: Transaksi[];
}

export function ringkas(transaksi: Transaksi[]): Ringkasan {
  const list = [...transaksi].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id - b.id);
  let masuk = 0;
  let keluar = 0;
  for (const x of list) {
    if (x.jenis === 'masuk') masuk += x.nominal;
    else keluar += x.nominal;
  }
  return { masuk, keluar, saldo: masuk - keluar, list };
}

/** Margin keuntungan terhadap pemasukan, dalam persen bulat. */
export function margin(r: Pick<Ringkasan, 'masuk' | 'saldo'>): number {
  return r.masuk ? Math.round((r.saldo / r.masuk) * 100) : 0;
}

export interface BarKategori {
  label: string;
  nilai: number;
  /** Lebar batang relatif terhadap kategori terbesar (0–100). */
  lebar: number;
  /** Porsi terhadap total jenis yang sama (0–100). */
  porsi: number;
}

export function perKategori(list: Transaksi[], jenis: JenisTransaksi): BarKategori[] {
  const m = new Map<string, number>();
  for (const x of list) if (x.jenis === jenis) m.set(x.kategori.nama, (m.get(x.kategori.nama) ?? 0) + x.nominal);
  const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const terbesar = arr[0]?.[1] ?? 1;
  const total = arr.reduce((a, [, v]) => a + v, 0) || 1;
  return arr.map(([label, nilai]) => ({
    label,
    nilai,
    lebar: Math.round((nilai / terbesar) * 100),
    porsi: Math.round((nilai / total) * 100),
  }));
}

export interface BarisBudget {
  kategoriId: number;
  kat: string;
  budget: number;
  realisasi: number;
  lebarBudget: number;
  lebarRealisasi: number;
  /** Realisasi melewati budget — termasuk pengeluaran pada kategori yang tidak dianggarkan. */
  melebihi: boolean;
  /** Realisasi terhadap budget; null bila kategori tidak dianggarkan. */
  pct: number | null;
}

export interface BudgetVsRealisasi {
  rows: BarisBudget[];
  totalBudget: number;
  totalRealisasi: number;
}

/** Bandingkan budget per kategori pengeluaran dengan realisasinya. */
export function budgetVsRealisasi(
  anggaran: { kategoriId: number; nominal: number }[],
  kategori: KategoriKeuangan[],
  list: Transaksi[],
): BudgetVsRealisasi {
  const budget = new Map(anggaran.map((a) => [a.kategoriId, a.nominal]));
  const realisasi = new Map<number, number>();
  for (const x of list) if (x.jenis === 'keluar') realisasi.set(x.kategori.id, (realisasi.get(x.kategori.id) ?? 0) + x.nominal);
  const nama = new Map(kategori.map((k) => [k.id, k.nama]));
  for (const x of list) nama.set(x.kategori.id, x.kategori.nama);

  const ids = [...new Set([...budget.keys(), ...realisasi.keys()])];
  let maks = 1;
  for (const id of ids) maks = Math.max(maks, budget.get(id) ?? 0, realisasi.get(id) ?? 0);
  const urutan = new Map(kategori.map((k, i) => [k.id, i]));
  const rows = ids
    .map((kategoriId) => {
      const b = budget.get(kategoriId) ?? 0;
      const a = realisasi.get(kategoriId) ?? 0;
      return {
        kategoriId,
        kat: nama.get(kategoriId) ?? '—',
        budget: b,
        realisasi: a,
        lebarBudget: Math.round((b / maks) * 100),
        lebarRealisasi: Math.round((a / maks) * 100),
        melebihi: a > b,
        pct: b ? Math.round((a / b) * 100) : null,
      };
    })
    .sort((x, y) => (urutan.get(x.kategoriId) ?? 999) - (urutan.get(y.kategoriId) ?? 999));
  return {
    rows,
    totalBudget: rows.reduce((s, r) => s + r.budget, 0),
    totalRealisasi: rows.reduce((s, r) => s + r.realisasi, 0),
  };
}

export interface BarisLaporan {
  tx: Transaksi;
  /** Saldo berjalan setelah transaksi ini. */
  saldo: number;
}

export function barisLaporan(list: Transaksi[], filter: JenisTransaksi | null): { rows: BarisLaporan[]; saldoAkhir: number } {
  let saldo = 0;
  const rows = list
    .filter((x) => !filter || x.jenis === filter)
    .map((tx) => {
      saldo += tx.jenis === 'masuk' ? tx.nominal : -tx.nominal;
      return { tx, saldo };
    });
  return { rows, saldoAkhir: saldo };
}

export interface CapaianTarget {
  label: string;
  nilai: number;
  acuan: number;
  pct: number;
  lebar: number;
}

/** Pemasukan terhadap target dan pengeluaran terhadap budget event. */
export function capaian(r: Pick<Ringkasan, 'masuk' | 'keluar'>, target: number, budget: number): [CapaianTarget, CapaianTarget] {
  const buat = (label: string, nilai: number, acuan: number) => {
    const pct = Math.round((nilai / (acuan || 1)) * 100);
    return { label, nilai, acuan, pct, lebar: Math.min(100, pct) };
  };
  return [buat('Pemasukan vs target', r.masuk, target), buat('Pengeluaran vs budget', r.keluar, budget)];
}
