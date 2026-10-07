import { describe, expect, it } from 'vitest';
import { parseCsv, pesertaDariCsv } from './csv';

describe('parseCsv', () => {
  it('membaca kutip ganda, koma di dalam sel, dan baris CRLF', () => {
    expect(parseCsv('nama,catatan\r\n"Andi, S.T.","kata ""uji"""\r\n')).toEqual([
      ['nama', 'catatan'],
      ['Andi, S.T.', 'kata "uji"'],
    ]);
  });

  it('mendeteksi pemisah titik koma (ekspor Excel lokal Indonesia)', () => {
    expect(parseCsv('﻿nama;email\nAndi;andi@mail.id')).toEqual([
      ['nama', 'email'],
      ['Andi', 'andi@mail.id'],
    ]);
  });
});

describe('pesertaDariCsv', () => {
  it('memetakan header & nilai enum dengan longgar', () => {
    const { peserta, dilewati } = pesertaDariCsv('Nama;Email;No HP;Tipe;Registrasi;Kehadiran\nAndi;andi@mail.id;0812;Anggota;Terverifikasi;Tidak hadir\n;x@y.id;;;;\nDewi;;;Mitra;;');
    expect(peserta).toEqual([
      { nama: 'Andi', email: 'andi@mail.id', telepon: '0812', tipe: 'anggota', registrasi: 'terverifikasi', kehadiran: 'tidak_hadir' },
      { nama: 'Dewi', tipe: 'mitra' },
    ]);
    expect(dilewati).toEqual([3]);
  });

  it('menolak CSV tanpa kolom nama', () => {
    expect(() => pesertaDariCsv('email\nandi@mail.id')).toThrow(/nama/);
  });
});
