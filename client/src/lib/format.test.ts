import { describe, expect, it } from 'vitest';
import { angka, formatHariTanggal, formatTanggal, formatTanggalPanjang, hanyaDigit, inisial, persen, rupiah, rupiahBertanda, tanpaAwalan } from './format';

describe('format tanggal', () => {
  it('memformat tanggal pendek dan panjang tanpa nol di depan', () => {
    expect(formatTanggal('2025-04-05')).toBe('5 Apr 2025');
    expect(formatTanggalPanjang('2024-12-10')).toBe('10 Desember 2024');
    expect(formatTanggal('')).toBe('-');
  });

  it('menghitung nama hari dengan benar', () => {
    expect(formatHariTanggal('2025-04-12')).toBe('Sabtu, 12 April 2025');
    expect(formatHariTanggal('2025-04-14')).toBe('Senin, 14 April 2025');
  });
});

describe('format rupiah', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(angka(12750000)).toBe('12.750.000');
    expect(rupiah(8600000)).toBe('Rp 8.600.000');
    expect(rupiah(0)).toBe('Rp 0');
    expect(rupiah(950)).toBe('Rp 950');
  });

  it('menandai nilai negatif', () => {
    expect(rupiah(-350000)).toBe('- Rp 350.000');
    expect(rupiahBertanda(-350000)).toBe('− Rp 350.000');
    expect(rupiahBertanda(4520000)).toBe('+ Rp 4.520.000');
  });
});

describe('utilitas', () => {
  it('membuat inisial dan melewati nama organisasi', () => {
    expect(inisial('Slekoors Annual Gathering', 'Slekoors')).toBe('AG');
    expect(inisial('Slekoors Annual Gathering')).toBe('SA');
    expect(inisial('Family Day', 'slekoors')).toBe('FD');
  });

  it('menghapus awalan nama organisasi dari label', () => {
    expect(tanpaAwalan('Slekoors Charity Run', 'Slekoors')).toBe('Charity Run');
    expect(tanpaAwalan('Family Day', 'Slekoors')).toBe('Family Day');
    expect(tanpaAwalan('Slekoors', 'Slekoors')).toBe('Slekoors');
    expect(tanpaAwalan('Music Night', null)).toBe('Music Night');
  });

  it('menghitung persen aman terhadap pembagi nol', () => {
    expect(persen(186, 212)).toBe(88);
    expect(persen(5, 0)).toBe(0);
  });

  it('menyaring digit', () => {
    expect(hanyaDigit('Rp 1.250.000')).toBe('1250000');
  });
});
