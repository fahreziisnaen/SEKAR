import { formatTanggalPanjang } from '../../lib/format';
import { LABEL_PERAN } from '../../lib/label';
import { terbilang } from '../../lib/terbilang';
import type { EventDetail, Organisasi, OrganisasiPublik, Transaksi } from '../../types';

/** Variabel template Bukti Penerimaan Dana — seluruhnya berasal dari data aplikasi. */
export interface DataBukti {
  receiptNumber: string;
  transactionDate: string;
  eventName: string;
  transactionType: string;
  category: string;
  payerName: string;
  payerDescription: string | null;
  amount: number;
  amountInWords: string;
  paymentMethod: string;
  bankName: string | null;
  /** Sudah disamarkan, hanya 4 digit terakhir terlihat. */
  accountNumber: string | null;
  referenceNumber: string | null;
  description: string;
  notes: string | null;
  createdBy: string;
  createdByRole: string;
  /** URL gambar tanda tangan pencatat, null bila belum ada. */
  createdBySignature: string | null;
  approvedBy: string;
  approvedByRole: string;
  approvedBySignature: string | null;
  /** Kota & tanggal penandatanganan, mis. "Surabaya, 12 April 2025". */
  place: string;
  organizationName: string | null;
  organizationLogoUrl: string | null;
}

/** `1234567890` → `****-****-7890`; nomor pendek tetap hanya memperlihatkan 4 digit terakhir. */
export function samarkanRekening(nomor: string | null): string | null {
  const digit = nomor?.replace(/\D/g, '') ?? '';
  if (!digit) return null;
  return `****-****-${digit.slice(-4)}`;
}

/**
 * Data yang belum lengkap untuk membuat bukti. Pemasukan lama (sebelum fitur ini) bisa
 * belum memiliki pemberi dana.
 */
export function kekuranganBukti(tx: Transaksi): string[] {
  const kurang: string[] = [];
  if (tx.jenis !== 'masuk') kurang.push('Bukti penerimaan hanya untuk transaksi pemasukan');
  if (!tx.nomorBukti) kurang.push('Nomor bukti');
  if (!tx.pihak?.trim()) kurang.push('Pemberi dana (Diterima dari)');
  if (!(tx.nominal > 0)) kurang.push('Nominal lebih dari 0');
  if (!tx.kategori?.nama) kurang.push('Kategori');
  if (!tx.metode?.nama) kurang.push('Metode pembayaran');
  if (!tx.tanggal) kurang.push('Tanggal');
  return kurang;
}

/** URL gambar tanda tangan yang sudah dimuat, per id pengguna. */
export type TandaTanganTermuat = Partial<Record<number, string>>;

export function dataBukti(
  tx: Transaksi,
  event: Pick<EventDetail, 'nama' | 'pic'>,
  org: Partial<Pick<Organisasi, 'kota'>> & OrganisasiPublik,
  ttd: TandaTanganTermuat = {},
): DataBukti {
  const tanggal = formatTanggalPanjang(tx.tanggal);
  return {
    receiptNumber: tx.nomorBukti ?? '',
    transactionDate: tanggal,
    eventName: event.nama,
    transactionType: 'Pemasukan',
    category: tx.kategori.nama,
    payerName: tx.pihak ?? '',
    payerDescription: tx.pihakKeterangan,
    amount: tx.nominal,
    amountInWords: terbilang(tx.nominal),
    paymentMethod: tx.metode.nama,
    bankName: tx.bank,
    accountNumber: samarkanRekening(tx.nomorRekening),
    referenceNumber: tx.nomorReferensi,
    description: tx.keterangan,
    notes: tx.catatan,
    createdBy: tx.dibuatOleh.nama,
    createdByRole: tx.dibuatOleh.jabatan ?? LABEL_PERAN[tx.dibuatOleh.peran],
    createdBySignature: ttd[tx.dibuatOleh.id] ?? null,
    approvedBy: event.pic.nama,
    approvedByRole: 'PIC Event',
    approvedBySignature: ttd[event.pic.id] ?? null,
    place: org.kota ? `${org.kota.split(',')[0].trim()}, ${tanggal}` : tanggal,
    organizationName: org.nama,
    organizationLogoUrl: org.logoUrl,
  };
}
