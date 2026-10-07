import type { Kehadiran, Peran, StatusDokumen, StatusEvent, StatusRegistrasi, TipePeserta } from '../types';

/** Label tampilan untuk nilai enum dari server. Warna badge dipetakan dari label (lib/warna). */
export const LABEL_STATUS_EVENT: Record<StatusEvent, string> = {
  draft: 'Draft',
  akan_datang: 'Akan Datang',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const STATUS_EVENT = Object.keys(LABEL_STATUS_EVENT) as StatusEvent[];

export const DESKRIPSI_STATUS_EVENT: Record<StatusEvent, string> = {
  draft: 'Event masih dalam perencanaan awal',
  akan_datang: 'Jadwal sudah pasti, persiapan berjalan',
  berlangsung: 'Hari pelaksanaan event',
  selesai: 'Event selesai, laporan dapat dibuat',
  dibatalkan: 'Event tidak dilanjutkan',
};

/** Tahap timeline event, berurutan sesuai kolom `tahap`. */
export const TAHAP = ['Perencanaan', 'Persiapan', 'Pelaksanaan', 'Evaluasi', 'Selesai'];

export const LABEL_STATUS_DOKUMEN: Record<StatusDokumen, string> = {
  draft: 'Draft',
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  final: 'Final',
};

export const LABEL_TIPE_PESERTA: Record<TipePeserta, string> = { anggota: 'Anggota', mitra: 'Mitra', umum: 'Umum' };
export const LABEL_REGISTRASI: Record<StatusRegistrasi, string> = { menunggu: 'Menunggu', terverifikasi: 'Terverifikasi' };
export const LABEL_KEHADIRAN: Record<Kehadiran, string> = { belum: 'Belum', hadir: 'Hadir', tidak_hadir: 'Tidak hadir' };

export const LABEL_PERAN: Record<Peran, string> = {
  admin: 'Admin',
  bendahara: 'Bendahara',
  anggota: 'Anggota Tim',
  peninjau: 'Peninjau',
};

export const DESKRIPSI_PERAN: Record<Peran, string> = {
  admin: 'Akses penuh, termasuk pengguna & pengaturan',
  bendahara: 'Mencatat transaksi dan mengelola event',
  anggota: 'Mengelola event, dokumen, peserta, vendor',
  peninjau: 'Hanya dapat melihat',
};

/** Status pembayaran vendor diturunkan dari nominal terbayar. */
export function statusBayar(nilaiKontrak: number, terbayar: number): string {
  if (nilaiKontrak > 0 && terbayar >= nilaiKontrak) return 'Lunas';
  if (terbayar > 0) return `DP ${Math.round((terbayar / nilaiKontrak) * 100)}%`;
  return 'Belum Bayar';
}
