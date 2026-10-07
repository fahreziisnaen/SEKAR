import type { Peran } from '../generated/prisma/client.js';

/**
 * Matriks hak akses per peran — satu-satunya sumber kebenaran. Daftar izin pengguna dikirim
 * ke client lewat `/api/auth/me` sehingga tombol yang tidak diizinkan ikut disembunyikan.
 * Peninjau hanya bisa membaca.
 */
export const IZIN = {
  kelolaPengguna: ['admin'],
  kelolaPengaturan: ['admin'],
  tulisKeuangan: ['admin', 'bendahara'],
  tulisEvent: ['admin', 'bendahara', 'anggota'],
  hapusEvent: ['admin'],
} as const satisfies Record<string, readonly Peran[]>;

export type Izin = keyof typeof IZIN;

export function punyaIzin(peran: Peran, izin: Izin): boolean {
  return (IZIN[izin] as readonly Peran[]).includes(peran);
}

export function daftarIzin(peran: Peran): Izin[] {
  return (Object.keys(IZIN) as Izin[]).filter((k) => punyaIzin(peran, k));
}
