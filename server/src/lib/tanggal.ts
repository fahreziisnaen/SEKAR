import { z } from 'zod';

/** Kolom `@db.Date` disimpan sebagai tengah malam UTC; formatkan kembali tanpa geser zona waktu. */
export function keIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dariIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Tanggal `YYYY-MM-DD` yang benar-benar ada di kalender. */
export const tanggalIso = z
  .string({ error: 'Tanggal wajib diisi.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.')
  .refine((v) => keIso(dariIso(v)) === v, 'Tanggal tidak valid.');

/** Tanggal hari ini (`YYYY-MM-DD`) menurut zona waktu tertentu. */
export function hariIni(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function tambahHari(iso: string, hari: number): string {
  const d = dariIso(iso);
  d.setUTCDate(d.getUTCDate() + hari);
  return keIso(d);
}
