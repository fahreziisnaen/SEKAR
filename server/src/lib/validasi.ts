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

export const email = z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase().email('Format email tidak valid.').max(160);
