import { describe, expect, it } from 'vitest';
import { keCsv, namaFileCsv } from './ekspor';

describe('keCsv', () => {
  it('memisahkan kolom dengan titik koma dan baris dengan CRLF', () => {
    expect(keCsv([['A', 'B'], [1, 2]])).toBe('A;B\r\n1;2');
  });

  it('mengutip sel yang mengandung pemisah, kutip, atau baris baru', () => {
    expect(keCsv([['Banner; ID card', 'Kata "final"', 'a\nb']])).toBe('"Banner; ID card";"Kata ""final""";"a\nb"');
  });
});

describe('namaFileCsv', () => {
  it('membuat nama file aman', () => {
    expect(namaFileCsv('Laporan Keuangan', 'Slekoors Annual Gathering')).toBe('laporan-keuangan-slekoors-annual-gathering.csv');
    expect(namaFileCsv('Keuntungan / Kerugian', 'semua event')).toBe('keuntungan-kerugian-semua-event.csv');
  });
});
