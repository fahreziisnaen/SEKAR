import type { InputPeserta } from '../hooks/queries';
import type { Kehadiran, StatusRegistrasi, TipePeserta } from '../types';

/** Parser CSV sederhana (RFC 4180): kutip ganda, koma/titik koma terdeteksi otomatis. */
export function parseCsv(teks: string): string[][] {
  const bersih = teks.replace(/^﻿/, '');
  const barisPertama = bersih.split(/\r?\n/, 1)[0] ?? '';
  const pemisah = (barisPertama.match(/;/g)?.length ?? 0) > (barisPertama.match(/,/g)?.length ?? 0) ? ';' : ',';
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i];
    if (kutip) {
      if (c === '"' && bersih[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) {
      baris.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && bersih[i + 1] === '\n') i++;
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = '';
    } else sel += c;
  }
  if (sel || baris.length) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil.filter((b) => b.some((s) => s.trim()));
}

const KOLOM: Record<string, keyof InputPeserta> = {
  nama: 'nama',
  'nama lengkap': 'nama',
  email: 'email',
  'e-mail': 'email',
  telepon: 'telepon',
  telp: 'telepon',
  'nomor telepon': 'telepon',
  'no hp': 'telepon',
  hp: 'telepon',
  tipe: 'tipe',
  status: 'tipe',
  registrasi: 'registrasi',
  kehadiran: 'kehadiran',
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function nilaiEnum<T extends string>(v: string, peta: Record<string, T>): T | undefined {
  return peta[norm(v).replace(/ /g, '_')];
}

const TIPE: Record<string, TipePeserta> = { anggota: 'anggota', mitra: 'mitra', umum: 'umum' };
const REGISTRASI: Record<string, StatusRegistrasi> = { menunggu: 'menunggu', terverifikasi: 'terverifikasi', verified: 'terverifikasi' };
const KEHADIRAN: Record<string, Kehadiran> = { belum: 'belum', hadir: 'hadir', tidak_hadir: 'tidak_hadir', 'tidak-hadir': 'tidak_hadir' };

export interface HasilImpor {
  peserta: Partial<InputPeserta>[];
  /** Nomor baris (1 = header) yang dilewati karena nama kosong. */
  dilewati: number[];
}

/** Baris pertama wajib header; kolom `nama` wajib ada, kolom lain opsional. */
export function pesertaDariCsv(teks: string): HasilImpor {
  const [header, ...rows] = parseCsv(teks);
  if (!header) throw new Error('Berkas CSV kosong.');
  const peta = header.map((h) => KOLOM[norm(h)]);
  if (!peta.includes('nama')) throw new Error('Kolom "nama" tidak ditemukan di baris pertama CSV.');
  const peserta: Partial<InputPeserta>[] = [];
  const dilewati: number[] = [];
  rows.forEach((row, i) => {
    const p: Partial<InputPeserta> = {};
    row.forEach((sel, j) => {
      const k = peta[j];
      const v = sel.trim();
      if (!k || !v) return;
      if (k === 'tipe') p.tipe = nilaiEnum(v, TIPE);
      else if (k === 'registrasi') p.registrasi = nilaiEnum(v, REGISTRASI);
      else if (k === 'kehadiran') p.kehadiran = nilaiEnum(v, KEHADIRAN);
      else p[k] = v;
    });
    if (p.nama) peserta.push(p);
    else dilewati.push(i + 2);
  });
  return { peserta, dilewati };
}
