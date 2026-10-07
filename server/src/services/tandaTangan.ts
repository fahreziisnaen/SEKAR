/** Batas ukuran gambar tanda tangan (lebih kecil dari batas unggahan umum). */
export const MAKS_TANDA_TANGAN_BYTES = 2 * 1024 * 1024;

/**
 * Versi tanda tangan untuk client: `null` bila belum ada, selain itu cap waktu unggah yang
 * dipakai sebagai `?v=` agar gambar lama tidak tertahan di cache.
 */
export function versiTandaTangan(diperbarui: Date | null | undefined): string | null {
  return diperbarui ? diperbarui.toISOString() : null;
}

/** Bentuk ringkas pengguna + versi tanda tangan, untuk relasi seperti PIC & pencatat transaksi. */
export function denganTandaTangan<T extends { tandaTanganDiperbarui: Date | null }>({ tandaTanganDiperbarui, ...sisa }: T) {
  return { ...sisa, tandaTangan: versiTandaTangan(tandaTanganDiperbarui) };
}
