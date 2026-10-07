import { describe, expect, it } from 'vitest';
import type { JenisTransaksi, KategoriKeuangan, Transaksi } from '../types';
import { barisLaporan, budgetVsRealisasi, capaian, margin, perKategori, ringkas } from './keuangan';

const KATEGORI: KategoriKeuangan[] = [
  { id: 1, nama: 'Tiket', jenis: 'masuk' },
  { id: 2, nama: 'Sponsorship', jenis: 'masuk' },
  { id: 3, nama: 'Venue', jenis: 'keluar' },
  { id: 4, nama: 'Konsumsi', jenis: 'keluar' },
];

let seq = 0;
function tx(tanggal: string, kategoriId: number, nominal: number): Transaksi {
  const k = KATEGORI.find((x) => x.id === kategoriId)!;
  return {
    id: ++seq,
    eventId: 1,
    tanggal,
    keterangan: `${k.nama} ${tanggal}`,
    jenis: k.jenis as JenisTransaksi,
    nominal,
    kategori: { id: k.id, nama: k.nama },
    metode: { id: 1, nama: 'Transfer Bank' },
    catatan: null,
    pihak: null,
    pihakKeterangan: null,
    bank: null,
    nomorRekening: null,
    nomorReferensi: null,
    nomorBukti: null,
    bukti: null,
    dibuatOleh: { id: 1, nama: 'Penguji', jabatan: null, peran: 'admin', tandaTangan: null },
    dibuatPada: `${tanggal}T03:00:00.000Z`,
  };
}

const LIST = [
  tx('2025-04-02', 1, 3_000_000),
  tx('2025-02-20', 2, 5_000_000),
  tx('2025-03-01', 3, 2_500_000),
  tx('2025-04-11', 4, 2_300_000),
  tx('2025-03-10', 1, 4_500_000),
];

describe('ringkas', () => {
  it('menjumlah pemasukan, pengeluaran, saldo dan mengurutkan per tanggal', () => {
    const r = ringkas(LIST);
    expect(r).toMatchObject({ masuk: 12_500_000, keluar: 4_800_000, saldo: 7_700_000 });
    expect(r.list.map((x) => x.tanggal)).toEqual(['2025-02-20', '2025-03-01', '2025-03-10', '2025-04-02', '2025-04-11']);
    expect(margin(r)).toBe(62);
  });

  it('mengembalikan nol tanpa transaksi', () => {
    const r = ringkas([]);
    expect(r).toMatchObject({ masuk: 0, keluar: 0, saldo: 0 });
    expect(margin(r)).toBe(0);
  });
});

describe('perKategori', () => {
  it('mengelompokkan dan mengurutkan dari nilai terbesar', () => {
    const bars = perKategori(LIST, 'masuk');
    expect(bars.map((b) => b.label)).toEqual(['Tiket', 'Sponsorship']);
    expect(bars[0]).toMatchObject({ nilai: 7_500_000, lebar: 100, porsi: 60 });
    expect(bars[1]).toMatchObject({ nilai: 5_000_000, lebar: 67, porsi: 40 });
  });
});

describe('budgetVsRealisasi', () => {
  it('menandai kategori yang melebihi budget dan pengeluaran tanpa budget', () => {
    const b = budgetVsRealisasi([{ kategoriId: 3, nominal: 3_000_000 }], KATEGORI, LIST);
    expect(b.rows).toEqual([
      expect.objectContaining({ kat: 'Venue', budget: 3_000_000, realisasi: 2_500_000, melebihi: false, pct: 83 }),
      expect.objectContaining({ kat: 'Konsumsi', budget: 0, realisasi: 2_300_000, melebihi: true, pct: null }),
    ]);
    expect(b.totalBudget).toBe(3_000_000);
    expect(b.totalRealisasi).toBe(4_800_000);
  });

  it('tidak mengarang budget bila belum diatur', () => {
    const b = budgetVsRealisasi([], KATEGORI, []);
    expect(b.rows).toEqual([]);
  });
});

describe('barisLaporan', () => {
  it('menghitung saldo berjalan', () => {
    const { rows, saldoAkhir } = barisLaporan(ringkas(LIST).list, null);
    expect(rows.map((r) => r.saldo)).toEqual([5_000_000, 2_500_000, 7_000_000, 10_000_000, 7_700_000]);
    expect(saldoAkhir).toBe(7_700_000);
  });

  it('hanya memuat jenis yang diminta', () => {
    const { rows, saldoAkhir } = barisLaporan(ringkas(LIST).list, 'keluar');
    expect(rows.every((r) => r.tx.jenis === 'keluar')).toBe(true);
    expect(saldoAkhir).toBe(-4_800_000);
  });
});

describe('capaian', () => {
  it('membandingkan pemasukan dengan target dan pengeluaran dengan budget', () => {
    const [masuk, keluar] = capaian({ masuk: 12_750_000, keluar: 8_230_000 }, 12_000_000, 8_600_000);
    expect(masuk).toMatchObject({ pct: 106, lebar: 100 });
    expect(keluar).toMatchObject({ pct: 96, lebar: 96 });
  });
});
