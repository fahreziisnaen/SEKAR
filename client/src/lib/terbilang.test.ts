import { describe, expect, it } from 'vitest';
import { terbilang } from './terbilang';

describe('terbilang', () => {
  it.each([
    [5_000_000, 'Lima Juta Rupiah'],
    [1_500_000, 'Satu Juta Lima Ratus Ribu Rupiah'],
    [250_000, 'Dua Ratus Lima Puluh Ribu Rupiah'],
    [10_000_000, 'Sepuluh Juta Rupiah'],
    [1, 'Satu Rupiah'],
    [11, 'Sebelas Rupiah'],
    [12, 'Dua Belas Rupiah'],
    [19, 'Sembilan Belas Rupiah'],
    [100, 'Seratus Rupiah'],
    [110, 'Seratus Sepuluh Rupiah'],
    [1_000, 'Seribu Rupiah'],
    [1_100, 'Seribu Seratus Rupiah'],
    [11_000, 'Sebelas Ribu Rupiah'],
    [101_000, 'Seratus Satu Ribu Rupiah'],
    [1_000_001, 'Satu Juta Satu Rupiah'],
    [2_001_000, 'Dua Juta Seribu Rupiah'],
    [12_750_000, 'Dua Belas Juta Tujuh Ratus Lima Puluh Ribu Rupiah'],
    [1_000_000_000, 'Satu Miliar Rupiah'],
    [3_250_000_500, 'Tiga Miliar Dua Ratus Lima Puluh Juta Lima Ratus Rupiah'],
    [1_000_000_000_000, 'Satu Triliun Rupiah'],
    [0, 'Nol Rupiah'],
  ])('%i → %s', (n, kata) => {
    expect(terbilang(n)).toBe(kata);
  });

  it('menolak nilai tidak valid', () => {
    expect(() => terbilang(-1)).toThrow(RangeError);
    expect(() => terbilang(1.5)).toThrow(RangeError);
    expect(() => terbilang(1e15)).toThrow(RangeError);
  });
});
