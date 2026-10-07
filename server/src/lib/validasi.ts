import type { Request } from 'express';
import { z } from 'zod';

const idSchema = z.coerce.number().int().positive();

/** `:id` di URL. ID tidak valid diperlakukan sebagai data yang tidak ada. */
export function paramId(req: Request, nama = 'id'): number {
  const parsed = idSchema.safeParse(req.params[nama]);
  return parsed.success ? parsed.data : 0;
}

/** Teks wajib dengan batas panjang. */
export function teks(label: string, maks: number) {
  return z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(maks, `${label} maksimal ${maks} karakter.`);
}

/** Teks opsional; string kosong disimpan sebagai null. */
export function teksOpsional(label: string, maks: number) {
  return z
    .string()
    .trim()
    .max(maks, `${label} maksimal ${maks} karakter.`)
    .nullish()
    .transform((v) => (v ? v : null));
}

export function idWajib(label: string) {
  return z.coerce.number({ error: `${label} wajib dipilih.` }).int().positive(`${label} wajib dipilih.`);
}


export const POLA_USERNAME = /^[a-z0-9][a-z0-9._-]*$/;

/** Username login: huruf kecil, angka, titik, garis bawah, tanda hubung; diawali huruf/angka. */
export const username = z
  .string({ error: 'Username wajib diisi.' })
  .trim()
  .toLowerCase()
  .min(3, 'Username minimal 3 karakter.')
  .max(32, 'Username maksimal 32 karakter.')
  .regex(POLA_USERNAME, 'Username hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung, dan diawali huruf/angka.');

/** Email kontak opsional; string kosong disimpan sebagai null. */
export const emailOpsional = z
  .string()
  .trim()
  .max(160, 'Email maksimal 160 karakter.')
  .nullish()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || z.email().safeParse(v).success, 'Format email tidak valid.');
