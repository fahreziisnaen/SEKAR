import { z } from 'zod';

/** Batas nominal yang masih aman sebagai `number` JavaScript (Rp 10 triliun). */
export const NOMINAL_MAKS = 10_000_000_000_000;

/** Rupiah utuh, tidak negatif. */
export const nominal = z.coerce
  .number({ error: 'Nominal harus berupa angka.' })
  .int('Nominal harus bilangan bulat.')
  .min(0, 'Nominal tidak boleh negatif.')
  .max(NOMINAL_MAKS, 'Nominal terlalu besar.');

export const nominalPositif = nominal.refine((v) => v > 0, 'Nominal harus lebih dari 0.');

/** Kolom BIGINT dari Prisma → number untuk JSON (aman karena dibatasi NOMINAL_MAKS). */
export function keAngka(v: bigint | number | null | undefined): number {
  return v === null || v === undefined ? 0 : Number(v);
}
