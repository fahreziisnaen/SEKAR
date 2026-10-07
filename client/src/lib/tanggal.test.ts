import { describe, expect, it } from 'vitest';
import { daftarPeriode, hariIni, queryPeriode } from './tanggal';

describe('hariIni', () => {
  it('mengikuti zona waktu yang diberikan', () => {
    const instan = new Date('2025-04-11T18:30:00Z');
    expect(hariIni('Asia/Jakarta', instan)).toBe('2025-04-12');
    expect(hariIni('UTC', instan)).toBe('2025-04-11');
  });
});

describe('daftarPeriode', () => {
  it('menghitung periode relatif terhadap hari ini', () => {
    const p = Object.fromEntries(daftarPeriode('2025-05-20').map((x) => [x.kunci, x]));
    expect(p.semua).toMatchObject({ dari: null, sampai: null });
    expect(p['bulan-ini']).toMatchObject({ dari: '2025-05-01', sampai: '2025-05-31' });
    expect(p['kuartal-ini']).toMatchObject({ label: 'Kuartal 2 2025', dari: '2025-04-01', sampai: '2025-06-30' });
    expect(p['tahun-lalu']).toMatchObject({ label: 'Tahun 2024', dari: '2024-01-01', sampai: '2024-12-31' });
  });

  it('menangani Februari tahun kabisat', () => {
    const bulan = daftarPeriode('2024-02-10').find((x) => x.kunci === 'bulan-ini')!;
    expect(bulan.sampai).toBe('2024-02-29');
  });
});

describe('queryPeriode', () => {
  it('membuat query string hanya dari nilai yang ada', () => {
    expect(queryPeriode({ dari: null, sampai: null })).toBe('');
    expect(queryPeriode({ dari: '2025-01-01', sampai: '2025-03-31' }, { status: 'selesai', kosong: undefined })).toBe('?dari=2025-01-01&sampai=2025-03-31&status=selesai');
  });
});
