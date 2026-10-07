import { IKON, LOGO_SEKAR, type NamaIkon } from '../../components/icons';
import { rupiah } from '../../lib/format';
import type { DataBukti } from './data';

/**
 * Mesin tata letak Bukti Penerimaan Dana.
 *
 * Template (latar statis + posisi elemen) dipisahkan dari data. Hasilnya daftar operasi gambar
 * dalam milimeter yang dipakai bersama oleh pratinjau/cetak (SVG), PNG (Canvas), dan PDF (pdf-lib),
 * sehingga ketiganya identik — termasuk pemotongan baris yang dihitung sekali di sini.
 */

/** A4 landscape, mm. */
export const HALAMAN = { lebar: 297, tinggi: 210 } as const;

/** Latar visual statis; tidak pernah diubah atau ditulisi. */
export const TEMPLATE = { src: '/templates/sekar/bukti-penerimaan-background.png', lebarPx: 1536, tinggiPx: 1024 } as const;

export type KeluargaFont = 'sans' | 'display';
export interface Font {
  keluarga: KeluargaFont;
  berat: 400 | 500 | 600 | 700 | 800;
  /** Ukuran huruf dalam mm. */
  ukuran: number;
}

export type Op =
  | { t: 'latar'; x: number; y: number; w: number; h: number }
  /** Gambar dimuat utuh di dalam kotak (rasio dipertahankan). `rata` mengatur posisi horizontal. */
  | { t: 'gambar'; src: string; x: number; y: number; w: number; h: number; rata?: 'kiri' | 'tengah'; campur?: 'multiply' }
  | { t: 'kotak'; x: number; y: number; w: number; h: number; r: number; isi: string; opasitas?: number; garis?: string; tebal?: number }
  | { t: 'lingkaran'; cx: number; cy: number; r: number; isi: string }
  | { t: 'garis'; x1: number; y1: number; x2: number; y2: number; warna: string; tebal: number }
  | { t: 'ikon'; d: string; x: number; y: number; ukuran: number; warna: string; tebal: number }
  /** `y` adalah garis dasar (baseline) teks. */
  | { t: 'teks'; x: number; y: number; teks: string; font: Font; warna: string; rata: 'kiri' | 'kanan' | 'tengah' };

export interface Halaman {
  lebar: number;
  tinggi: number;
  ops: Op[];
}

/** Lebar teks (mm) untuk font tertentu. */
export type Ukur = (teks: string, font: Font) => number;

export const WARNA = {
  navy: '#12264A',
  biru: '#2F6FED',
  biruTua: '#1F5BD6',
  emas: '#F5B800',
  slate: '#64748B',
  muted: '#7A869A',
  label: '#33415C',
  garis: '#E3EAF4',
  garisLembut: '#E9EEF6',
  kartu: '#FFFFFF',
  band: '#F2F6FC',
  nominal: '#EAF1FC',
  lingkaran: '#E4EDFF',
} as const;

const f = (keluarga: KeluargaFont, berat: Font['berat'], ukuran: number): Font => ({ keluarga, berat, ukuran });

/** Perkecil huruf sampai muat; bila tetap tidak muat di ukuran minimum, potong dengan elipsis. */
export function pas(ukur: Ukur, teks: string, font: Font, maks: number, min = font.ukuran * 0.7): { teks: string; font: Font } {
  let ukuran = font.ukuran;
  while (ukuran > min && ukur(teks, { ...font, ukuran }) > maks) ukuran = Math.max(min, ukuran - 0.1);
  const akhir = { ...font, ukuran };
  if (ukur(teks, akhir) <= maks) return { teks, font: akhir };
  let potong = teks;
  while (potong.length > 1 && ukur(potong + '…', akhir) > maks) potong = potong.slice(0, -1);
  return { teks: potong.trimEnd() + '…', font: akhir };
}

/** Bungkus per kata menjadi maksimal `maksBaris`; baris terakhir diberi elipsis bila terpotong. */
export function bungkus(ukur: Ukur, teks: string, font: Font, maks: number, maksBaris: number): string[] {
  const kata = teks.trim().split(/\s+/).filter(Boolean);
  const baris: string[] = [];
  let kini = '';
  for (const k of kata) {
    const coba = kini ? `${kini} ${k}` : k;
    if (!kini || ukur(coba, font) <= maks) kini = coba;
    else {
      baris.push(kini);
      kini = k;
    }
  }
  if (kini) baris.push(kini);
  if (baris.length <= maksBaris) return baris.map((b) => (ukur(b, font) > maks ? pas(ukur, b, font, maks, font.ukuran).teks : b));
  const hasil = baris.slice(0, maksBaris);
  hasil[maksBaris - 1] = pas(ukur, `${hasil[maksBaris - 1]} ${baris.slice(maksBaris).join(' ')}`, font, maks, font.ukuran).teks;
  return hasil;
}

/** Ukuran gambar latar agar memenuhi halaman tanpa distorsi (seperti `background-size: cover`). */
export function latarCover(): Extract<Op, { t: 'latar' }> {
  const skala = Math.max(HALAMAN.lebar / TEMPLATE.lebarPx, HALAMAN.tinggi / TEMPLATE.tinggiPx);
  const w = TEMPLATE.lebarPx * skala;
  const h = TEMPLATE.tinggiPx * skala;
  return { t: 'latar', x: (HALAMAN.lebar - w) / 2, y: (HALAMAN.tinggi - h) / 2, w, h };
}

export function tataLetakBukti(d: DataBukti, ukur: Ukur): Halaman {
  const ops: Op[] = [];
  const teks = (x: number, y: number, isi: string, font: Font, warna: string, rata: 'kiri' | 'kanan' | 'tengah' = 'kiri') =>
    ops.push({ t: 'teks', x, y, teks: isi, font, warna, rata });
  const teksPas = (x: number, y: number, isi: string, font: Font, warna: string, maks: number, rata: 'kiri' | 'kanan' | 'tengah' = 'kiri') => {
    const p = pas(ukur, isi, font, maks);
    teks(x, y, p.teks, p.font, warna, rata);
  };
  const ikon = (nama: NamaIkon, cx: number, cy: number, r: number, latar: string = WARNA.lingkaran) => {
    ops.push({ t: 'lingkaran', cx, cy, r, isi: latar });
    const ukuran = r * 1.05;
    ops.push({ t: 'ikon', d: IKON[nama], x: cx - ukuran / 2, y: cy - ukuran / 2, ukuran, warna: WARNA.navy, tebal: 1.9 });
  };

  // Latar putih di bawah template: bagian tengah template transparan.
  ops.push({ t: 'kotak', x: 0, y: 0, w: HALAMAN.lebar, h: HALAMAN.tinggi, r: 0, isi: '#FFFFFF' });
  ops.push(latarCover());

  /* ---------- Kepala: logo + wordmark SEKAR ---------- */
  ops.push({ t: 'gambar', src: LOGO_SEKAR, x: 5.5, y: 11.8, w: 19.5, h: 18.5, rata: 'tengah' });
  teks(27, 21.5, 'SEKAR', f('display', 800, 10.5), WARNA.navy);
  teks(27.3, 26.6, 'Sistem Event, Keuangan, dan', f('sans', 500, 2.7), WARNA.label);
  teks(27.3, 30, 'Administrasi Terintegrasi', f('sans', 500, 2.7), WARNA.label);
  ops.push({ t: 'garis', x1: 80, y1: 12.5, x2: 80, y2: 34, warna: '#C9D6EA', tebal: 0.35 });

  teksPas(87, 21.5, 'Bukti Penerimaan Dana', f('display', 800, 9.2), WARNA.navy, 112);
  teks(87.3, 28.6, 'Penerimaan Dana Event', f('sans', 600, 4.3), WARNA.biruTua);
  teks(87.3, 34.2, 'Terima kasih atas dukungan Anda untuk kesuksesan acara kami.', f('sans', 400, 2.9), WARNA.slate);

  // Organisasi pemilik di kanan atas, di sisi kiri ornamen gelombang template.
  if (d.organizationName) {
    const kanan = 251;
    const nama = pas(ukur, d.organizationName.toUpperCase(), f('display', 800, 4.2), d.organizationLogoUrl ? 36 : 46);
    const lebarNama = ukur(nama.teks, nama.font);
    teks(kanan, 20.5, nama.teks, nama.font, WARNA.navy, 'kanan');
    if (d.organizationLogoUrl) ops.push({ t: 'gambar', src: d.organizationLogoUrl, x: kanan - lebarNama - 10, y: 14, w: 8, h: 8, rata: 'tengah' });
    ops.push({ t: 'garis', x1: kanan - Math.min(lebarNama, 30), y1: 23.6, x2: kanan, y2: 23.6, warna: WARNA.emas, tebal: 0.7 });
  }

  /* ---------- Informasi bukti ---------- */
  const yBand = 41;
  ops.push({ t: 'kotak', x: 14, y: yBand, w: 269, h: 20, r: 3.5, isi: WARNA.band, opasitas: 0.94, garis: WARNA.garis, tebal: 0.3 });
  const meta: [NamaIkon, string, string][] = [
    ['doc', 'No. Bukti', d.receiptNumber],
    ['cal', 'Tanggal Transaksi', d.transactionDate],
    ['cal', 'Event', d.eventName],
  ];
  meta.forEach(([nama, label, nilai], i) => {
    const x0 = 14 + i * 89.7;
    if (i > 0) ops.push({ t: 'garis', x1: x0, y1: yBand + 4.5, x2: x0, y2: yBand + 15.5, warna: '#D5DFEE', tebal: 0.3 });
    ikon(nama, x0 + 10, yBand + 10, 4.6, '#FFFFFF');
    teks(x0 + 18, yBand + 8.4, label, f('sans', 500, 2.9), WARNA.slate);
    teksPas(x0 + 18, yBand + 14.6, nilai, f('sans', 700, 4.1), WARNA.navy, 67);
  });

  /* ---------- Kolom kiri: pemberi dana & nominal ---------- */
  const xKiri = 14;
  const wKiri = 129;
  const yKartu = 67;
  const opsKartuKiri = ops.length;
  let y = yKartu + 9.5;
  ikon('user', xKiri + 10, y + 1.2, 5.2);
  teks(xKiri + 19, y - 1.2, 'Diterima dari', f('sans', 500, 3.1), WARNA.biruTua);
  const fontPihak = f('sans', 700, 5);
  const barisPihak = bungkus(ukur, d.payerName, fontPihak, wKiri - 24, 2);
  barisPihak.forEach((b, i) => teks(xKiri + 19, y + 5.4 + i * 5.8, b, fontPihak, WARNA.navy));
  y += 5.4 + (barisPihak.length - 1) * 5.8;
  if (d.payerDescription) {
    teksPas(xKiri + 19, y + 5, d.payerDescription, f('sans', 500, 3.1), WARNA.slate, wKiri - 24);
    y += 5;
  }

  // Nominal: elemen paling menonjol.
  const yNominal = y + 5.5;
  const fontTerbilang = f('sans', 500, 3);
  const barisTerbilang = bungkus(ukur, `(${d.amountInWords})`, fontTerbilang, wKiri - 26, 2);
  const hNominal = 29 + (barisTerbilang.length - 1) * 4;
  ops.push({ t: 'kotak', x: xKiri + 4, y: yNominal, w: wKiri - 8, h: hNominal, r: 3, isi: WARNA.nominal, opasitas: 0.96 });
  ikon('wallet', xKiri + 12.5, yNominal + 8.5, 4.8, '#D6E4FB');
  teks(xKiri + 20.5, yNominal + 9.6, 'Jumlah Diterima', f('sans', 700, 3.7), WARNA.navy);
  const nominal = pas(ukur, rupiah(d.amount), f('display', 800, 11), wKiri - 30, 6);
  teks(xKiri + 20.5, yNominal + 21, nominal.teks, nominal.font, WARNA.navy);
  barisTerbilang.forEach((b, i) => teks(xKiri + 20.5, yNominal + 26.2 + i * 4, b, fontTerbilang, WARNA.slate));
  y = yNominal + hNominal;

  // Catatan opsional: tidak menyisakan ruang kosong bila tidak diisi.
  if (d.notes?.trim()) {
    teks(xKiri + 5, y + 6.5, 'Catatan', f('sans', 700, 3), WARNA.navy);
    const barisCatatan = bungkus(ukur, d.notes, f('sans', 400, 3), wKiri - 10, 2);
    barisCatatan.forEach((b, i) => teks(xKiri + 5, y + 11 + i * 4.1, b, f('sans', 400, 3), WARNA.label));
    y += 11 + (barisCatatan.length - 1) * 4.1;
  }
  const hKiri = y + 5 - yKartu;
  ops.splice(opsKartuKiri, 0, { t: 'kotak', x: xKiri, y: yKartu, w: wKiri, h: hKiri, r: 4, isi: WARNA.kartu, opasitas: 0.9, garis: WARNA.garis, tebal: 0.3 });

  /* ---------- Kolom kanan: detail penerimaan ---------- */
  const xKanan = 150;
  const wKanan = 133;
  const opsKartuKanan = ops.length;
  ikon('doc', xKanan + 10, yKartu + 9.5, 5.2);
  teks(xKanan + 19, yKartu + 11.2, 'Detail Penerimaan', f('sans', 700, 4.6), WARNA.navy);
  const baris: [string, string | null][] = [
    ['Jenis Transaksi', d.transactionType],
    ['Kategori', d.category],
    ['Metode Pembayaran', d.paymentMethod],
    ['Bank', d.bankName],
    ['Nomor Rekening', d.accountNumber],
    ['Nomor Referensi', d.referenceNumber],
    ['Keterangan', d.description],
  ];
  const xNilai = xKanan + 50;
  const wNilai = wKanan - 54;
  const fontNilai = f('sans', 600, 3.3);
  let yb = yKartu + 21.5;
  const terisi = baris.filter(([, v]) => v?.trim());
  terisi.forEach(([label, nilai], i) => {
    teks(xKanan + 6, yb, label, f('sans', 400, 3.2), WARNA.slate);
    teks(xKanan + 45, yb, ':', f('sans', 400, 3.2), WARNA.slate);
    const lines = label === 'Keterangan' ? bungkus(ukur, nilai!, fontNilai, wNilai, 2) : [pas(ukur, nilai!, fontNilai, wNilai).teks];
    lines.forEach((l, j) => teks(xNilai, yb + j * 4.3, l, fontNilai, WARNA.navy));
    yb += (lines.length - 1) * 4.3;
    if (i < terisi.length - 1) ops.push({ t: 'garis', x1: xKanan + 6, y1: yb + 2.9, x2: xKanan + wKanan - 6, y2: yb + 2.9, warna: WARNA.garisLembut, tebal: 0.25 });
    yb += 7.4;
  });
  const hKanan = yb - 3 - yKartu;
  ops.splice(opsKartuKanan, 0, { t: 'kotak', x: xKanan, y: yKartu, w: wKanan, h: hKanan, r: 4, isi: WARNA.kartu, opasitas: 0.9, garis: WARNA.garis, tebal: 0.3 });

  /* ---------- Tanda tangan ---------- */
  // Diletakkan di bawah detail; dibatasi agar tidak melewati garis bingkai bawah template.
  const yTtd = Math.min(yKartu + hKanan + 9, 158);
  const ttd = (x: number, judul: string, nama: string, peran: string, tandaTangan: string | null) => {
    teks(x, yTtd + 5, judul, f('sans', 400, 3), WARNA.slate);
    // Tanda tangan unggahan pengguna di atas garis; latar putih gambar menyatu (multiply).
    if (tandaTangan) ops.push({ t: 'gambar', src: tandaTangan, x, y: yTtd + 7.5, w: 50, h: 16.5, rata: 'tengah', campur: 'multiply' });
    ops.push({ t: 'garis', x1: x, y1: yTtd + 25, x2: x + 50, y2: yTtd + 25, warna: '#9FB3D1', tebal: 0.3 });
    teksPas(x, yTtd + 30, nama, f('sans', 700, 3.4), WARNA.navy, 50);
    teksPas(x, yTtd + 34.4, peran, f('sans', 500, 2.9), WARNA.muted, 50);
  };
  teksPas(226, yTtd, d.place, f('sans', 500, 3), WARNA.label, 52);
  ttd(156, 'Dibuat oleh,', d.createdBy, d.createdByRole, d.createdBySignature);
  ttd(226, 'Mengetahui,', d.approvedBy, d.approvedByRole, d.approvedBySignature);

  /* ---------- Kaki ---------- */
  const merek = `SEKAR · Sistem Event, Keuangan, dan Administrasi Terintegrasi${d.organizationName ? ` · ${d.organizationName}` : ''}`;
  teksPas(193, 202, merek, f('sans', 600, 2.5), WARNA.navy, 140, 'tengah');
  teks(193, 205.6, 'Kelola Event, Catat Keuangan, Tertata.', f('sans', 500, 2.4), WARNA.biruTua, 'tengah');

  return { ...HALAMAN, ops };
}
