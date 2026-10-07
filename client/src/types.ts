// Bentuk data dari API server (lihat server/src/routes). Tanggal: string `YYYY-MM-DD`.

export type Peran = 'admin' | 'bendahara' | 'anggota' | 'peninjau';
export type Izin = 'kelolaPengguna' | 'kelolaPengaturan' | 'tulisKeuangan' | 'tulisEvent' | 'hapusEvent';
export type StatusEvent = 'draft' | 'akan_datang' | 'berlangsung' | 'selesai' | 'dibatalkan';
export type JenisTransaksi = 'masuk' | 'keluar';
export type StatusDokumen = 'draft' | 'menunggu' | 'disetujui' | 'final';
export type TipePeserta = 'anggota' | 'mitra' | 'umum';
export type StatusRegistrasi = 'menunggu' | 'terverifikasi';
export type Kehadiran = 'belum' | 'hadir' | 'tidak_hadir';

export interface SessionUser {
  id: number;
  nama: string;
  email: string;
  peran: Peran;
  jabatan: string | null;
  izin: Izin[];
  /** Versi tanda tangan (cap waktu unggah) atau null bila belum mengunggah. */
  tandaTangan: string | null;
}

/** Pengguna ringkas beserta versi tanda tangannya (PIC, pencatat transaksi). */
export interface RefTtd extends Ref {
  tandaTangan: string | null;
}

export interface Ref {
  id: number;
  nama: string;
}

export interface Organisasi {
  nama: string;
  email: string | null;
  telepon: string | null;
  kota: string | null;
  logoUrl: string | null;
  notifPengingatTenggat: boolean;
  notifPeringatanKeuangan: boolean;
}

export interface OrganisasiPublik {
  nama: string | null;
  logoUrl: string | null;
}

export interface InfoAplikasi {
  versi: string;
  zonaWaktu: string;
}

export interface Pengguna {
  id: number;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  jabatan: string | null;
  telepon: string | null;
  tanggungJawab: string | null;
  tandaTangan: string | null;
}

export interface AnggotaTim {
  id: number;
  nama: string;
  jabatan: string | null;
  telepon: string | null;
  tanggungJawab: string | null;
  aktif: boolean;
}

export interface KategoriKeuangan extends Ref {
  jenis: JenisTransaksi;
}

export interface TemplateEvent extends Ref {
  deskripsi: string | null;
  tugas: string[];
}

export interface Master {
  kategori: KategoriKeuangan[];
  metode: Ref[];
  jenisDokumen: Ref[];
  template: TemplateEvent[];
}

export interface EventRingkas {
  id: number;
  nama: string;
  tanggal: string;
  waktu: string | null;
  lokasi: string;
  venue: string | null;
  deskripsi: string | null;
  status: StatusEvent;
  /** 0 Perencanaan … 4 Selesai. */
  tahap: number;
  budget: number;
  targetPemasukan: number;
  estimasiPengeluaran: number;
  pic: RefTtd;
  progress: number;
  masuk: number;
  keluar: number;
  jumlahTransaksi: number;
  tugasSelesai: number;
  tugasTotal: number;
}

export interface EventDetail extends EventRingkas {
  anggota: AnggotaTim[];
  anggaran: { kategoriId: number; nominal: number }[];
}

export interface Transaksi {
  id: number;
  eventId: number;
  tanggal: string;
  keterangan: string;
  jenis: JenisTransaksi;
  nominal: number;
  kategori: Ref;
  metode: Ref;
  catatan: string | null;
  /** Pemberi dana (pemasukan) atau penerima pembayaran (pengeluaran). */
  pihak: string | null;
  pihakKeterangan: string | null;
  bank: string | null;
  nomorRekening: string | null;
  nomorReferensi: string | null;
  /** Nomor Bukti Penerimaan Dana `BPD-YYYYMMDD-XXX`; hanya pemasukan. */
  nomorBukti: string | null;
  bukti: { nama: string; gambar: boolean } | null;
  dibuatOleh: RefTtd & { jabatan: string | null; peran: Peran };
  /** ISO datetime. */
  dibuatPada: string;
}

export interface Tugas {
  id: number;
  eventId: number;
  label: string;
  tenggat: string | null;
  selesai: boolean;
  pic: Ref | null;
}

export interface Dokumen {
  id: number;
  eventId: number;
  nama: string;
  status: StatusDokumen;
  jenis: Ref;
  file: { nama: string; ukuran: number; ext: string };
  diunggahOleh: Ref;
  diunggahPada: string;
}

export interface Peserta {
  id: number;
  nama: string;
  email: string | null;
  telepon: string | null;
  tipe: TipePeserta;
  registrasi: StatusRegistrasi;
  kehadiran: Kehadiran;
}

export interface Vendor {
  id: number;
  nama: string;
  kategori: string;
  picNama: string | null;
  kontak: string | null;
  nilaiKontrak: number;
  terbayar: number;
  catatan: string | null;
}

export interface BarisRekap {
  event: { id: number; nama: string; tanggal: string; status: StatusEvent };
  masuk: number;
  keluar: number;
  jumlahTransaksi: number;
}

export type Notifikasi =
  | { tipe: 'tenggat'; id: string; event: Ref; judul: string; pic: string | null; tanggal: string; lewat: boolean }
  | { tipe: 'keuangan'; id: string; event: Ref; persen: number };
