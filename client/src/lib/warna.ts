/** Pasangan [latar, teks] untuk badge status. */
export type PasanganWarna = readonly [bg: string, fg: string];

const HIJAU: PasanganWarna = ['#E1F4EA', '#157347'];
const KUNING: PasanganWarna = ['#FFF4D1', '#8A6100'];
const BIRU: PasanganWarna = ['#E4EDFF', '#1F5BD6'];
const MERAH: PasanganWarna = ['#FDE7E7', '#BE3530'];
const NETRAL: PasanganWarna = ['#EEF1F6', '#55627A'];

const BADGE: Record<string, PasanganWarna> = {
  Draft: NETRAL,
  'Akan Datang': KUNING,
  Berlangsung: BIRU,
  Selesai: HIJAU,
  Dibatalkan: MERAH,
  Disetujui: HIJAU,
  Final: BIRU,
  Menunggu: KUNING,
  Lunas: HIJAU,
  'Belum Bayar': MERAH,
  Aktif: HIJAU,
  Nonaktif: NETRAL,
  Terverifikasi: HIJAU,
  Hadir: HIJAU,
  'Tidak hadir': MERAH,
  Belum: NETRAL,
  Pemasukan: HIJAU,
  Pengeluaran: MERAH,
  Anggota: NETRAL,
  Mitra: KUNING,
  Umum: BIRU,
};

export function warnaBadge(status: string): PasanganWarna {
  // Status vendor "DP xx%" bersifat dinamis.
  if (status.startsWith('DP ')) return KUNING;
  return BADGE[status] ?? NETRAL;
}

/** Warna thumbnail event, bergilir mengikuti urutan event. */
const THUMB: PasanganWarna[] = [
  ['#12264A', '#F5B800'],
  ['#2F6FED', '#FFFFFF'],
  ['#F5B800', '#12264A'],
  ['#1E9E63', '#FFFFFF'],
  ['#E4EDFF', '#1F5BD6'],
  ['#FFF4D1', '#8A6100'],
];

export function warnaThumb(indeks: number): PasanganWarna {
  return THUMB[Math.max(0, indeks) % THUMB.length];
}

/** Warna avatar anggota tim / pengguna. */
const AVATAR = ['#12264A', '#2F6FED', '#F5B800', '#1E9E63', '#7A5AF8'];

export function warnaAvatar(indeks: number): PasanganWarna {
  const bg = AVATAR[indeks % AVATAR.length];
  return [bg, bg === '#F5B800' ? '#12264A' : '#FFFFFF'];
}

/** Warna ikon ekstensi file dokumen. */
const EKSTENSI: Record<string, PasanganWarna> = {
  pdf: ['#FDE7E7', '#BE3530'],
  xlsx: ['#E1F4EA', '#157347'],
  jpg: ['#E4EDFF', '#1F5BD6'],
  docx: ['#E4EDFF', '#1F5BD6'],
};

export function warnaEkstensi(ext: string): PasanganWarna {
  return EKSTENSI[ext] ?? EKSTENSI.pdf;
}
