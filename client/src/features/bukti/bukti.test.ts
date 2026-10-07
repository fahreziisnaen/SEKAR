import { describe, expect, it } from 'vitest';
import { LOGO_SEKAR } from '../../components/icons';
import { buatTransaksi } from '../../test/fakeApi';
import type { Transaksi } from '../../types';
import { dataBukti, kekuranganBukti, samarkanRekening, type DataBukti } from './data';
import { ukurPerkiraan } from './font';
import { HALAMAN, TEMPLATE, bungkus, latarCover, pas, tataLetakBukti, type Op } from './tataLetak';

const EVENT = { nama: 'Slekoors Annual Gathering', pic: { id: 9, nama: 'Andi Pratama', tandaTangan: null } };
const ORG = { nama: 'Slekoors', logoUrl: null, kota: 'Surabaya, Jawa Timur' };

function tx(patch: Partial<Transaksi> = {}): Transaksi {
  return {
    ...buatTransaksi(1, 'masuk', 5_000_000, 'Sponsor Utama'),
    tanggal: '2025-04-12',
    kategori: { id: 1, nama: 'Sponsorship' },
    pihak: 'PT. Maju Bersama Sejahtera',
    pihakKeterangan: 'Sponsor Event',
    bank: 'Bank Mandiri',
    nomorRekening: '123-456-7890',
    nomorReferensi: 'MDR-88213',
    nomorBukti: 'BPD-20250412-001',
    ...patch,
  };
}

const teksDi = (ops: Op[]) => ops.flatMap((o) => (o.t === 'teks' ? [o.teks] : []));

describe('data bukti', () => {
  it('memetakan transaksi ke variabel template tanpa nilai tetap', () => {
    const d = dataBukti(tx(), EVENT, ORG);
    expect(d).toMatchObject<Partial<DataBukti>>({
      receiptNumber: 'BPD-20250412-001',
      transactionDate: '12 April 2025',
      eventName: 'Slekoors Annual Gathering',
      transactionType: 'Pemasukan',
      category: 'Sponsorship',
      payerName: 'PT. Maju Bersama Sejahtera',
      payerDescription: 'Sponsor Event',
      amount: 5_000_000,
      amountInWords: 'Lima Juta Rupiah',
      bankName: 'Bank Mandiri',
      accountNumber: '****-****-7890',
      referenceNumber: 'MDR-88213',
      createdBy: 'Admin Uji',
      createdByRole: 'Bendahara Event',
      approvedBy: 'Andi Pratama',
      approvedByRole: 'PIC Event',
      place: 'Surabaya, 12 April 2025',
      organizationName: 'Slekoors',
    });
  });

  it('memakai label peran bila pembuat tidak punya jabatan', () => {
    const d = dataBukti(tx({ dibuatOleh: { id: 2, nama: 'Fajar', jabatan: null, peran: 'bendahara', tandaTangan: null } }), EVENT, { ...ORG, kota: null });
    expect(d.createdByRole).toBe('Bendahara');
    expect(d.place).toBe('12 April 2025');
  });

  it('menyamarkan nomor rekening', () => {
    expect(samarkanRekening('1234567890')).toBe('****-****-7890');
    expect(samarkanRekening('123-456-7890')).toBe('****-****-7890');
    expect(samarkanRekening('')).toBeNull();
    expect(samarkanRekening(null)).toBeNull();
  });

  it('menyebut data yang kurang sebelum bukti bisa dibuat', () => {
    expect(kekuranganBukti(tx())).toEqual([]);
    expect(kekuranganBukti(tx({ pihak: null, nomorBukti: null }))).toEqual(['Nomor bukti', 'Pemberi dana (Diterima dari)']);
    expect(kekuranganBukti(buatTransaksi(2, 'keluar', 1000, 'Venue'))[0]).toMatch(/hanya untuk transaksi pemasukan/);
  });
});

describe('tata letak bukti', () => {
  it('menempatkan latar template tanpa distorsi dan seluruh teks dari data', () => {
    const h = tataLetakBukti(dataBukti(tx(), EVENT, ORG), ukurPerkiraan);
    expect(h).toMatchObject({ lebar: 297, tinggi: 210 });
    const latar = latarCover();
    expect(latar.w / latar.h).toBeCloseTo(TEMPLATE.lebarPx / TEMPLATE.tinggiPx, 6);
    expect(latar.h).toBeCloseTo(HALAMAN.tinggi, 6);
    expect(latar.x).toBeLessThan(0);

    const teks = teksDi(h.ops);
    for (const isi of ['Bukti Penerimaan Dana', 'Penerimaan Dana Event', 'BPD-20250412-001', '12 April 2025', 'PT. Maju Bersama Sejahtera', 'Rp 5.000.000', '(Lima Juta Rupiah)', 'Sponsorship', '****-****-7890', 'Andi Pratama', 'PIC Event', 'Surabaya, 12 April 2025']) {
      expect(teks).toContain(isi);
    }
    // Nomor rekening asli tidak pernah dirender.
    expect(teks.join(' ')).not.toContain('123-456-7890');
  });

  it('menempelkan tanda tangan pencatat & PIC di atas garis tanda tangan', () => {
    const d = dataBukti(tx(), EVENT, ORG, { 1: 'blob:ttd-pencatat', 9: 'blob:ttd-pic' });
    expect(d.createdBySignature).toBe('blob:ttd-pencatat');
    expect(d.approvedBySignature).toBe('blob:ttd-pic');
    const tandaTangan = (ops: Op[]) => ops.filter((o) => o.t === 'gambar' && o.src !== LOGO_SEKAR);
    expect(tandaTangan(tataLetakBukti(d, ukurPerkiraan).ops)).toEqual([
      expect.objectContaining({ src: 'blob:ttd-pencatat', x: 156, w: 50, campur: 'multiply' }),
      expect.objectContaining({ src: 'blob:ttd-pic', x: 226, w: 50, campur: 'multiply' }),
    ]);
    // Tanpa tanda tangan: hanya garis, tidak ada gambar tanda tangan.
    expect(tandaTangan(tataLetakBukti(dataBukti(tx(), EVENT, ORG), ukurPerkiraan).ops)).toEqual([]);
  });

  it('merender logo SEKAR di kepala bukti (template tidak memuat logo)', () => {
    const logo = tataLetakBukti(dataBukti(tx(), EVENT, ORG), ukurPerkiraan).ops.filter((o) => o.t === 'gambar' && o.src === LOGO_SEKAR);
    expect(logo).toEqual([expect.objectContaining({ x: 5.5, y: 11.8, rata: 'tengah' })]);
    expect(logo[0]).not.toHaveProperty('campur');
  });

  it('menghilangkan baris & catatan opsional yang kosong', () => {
    const h = tataLetakBukti(dataBukti(tx({ bank: null, nomorRekening: null, nomorReferensi: null, catatan: null, pihakKeterangan: null }), EVENT, ORG), ukurPerkiraan);
    const teks = teksDi(h.ops);
    expect(teks).not.toContain('Bank');
    expect(teks).not.toContain('Nomor Rekening');
    expect(teks).not.toContain('Catatan');
    expect(teks).toContain('Keterangan');
  });

  it('semua elemen tetap di dalam halaman walau isinya panjang', () => {
    const panjang = tx({
      pihak: 'Perkumpulan Pengusaha Muda Kreatif dan Industri Ekonomi Digital Jawa Timur Bersatu',
      keterangan: 'Dukungan dana untuk panggung utama, dokumentasi, konsumsi panitia, dan hadiah lomba komunitas sepanjang acara',
      catatan: 'Dana diterima penuh melalui transfer bank dan sudah dicocokkan dengan mutasi rekening bendahara pada hari yang sama.',
      nominal: 999_999_999_999,
    });
    const h = tataLetakBukti(dataBukti(panjang, { ...EVENT, nama: 'Festival Musik dan Kuliner Komunitas Kreatif Se-Jawa Timur 2025' }, ORG), ukurPerkiraan);
    for (const o of h.ops) {
      if (o.t === 'teks') {
        const w = ukurPerkiraan(o.teks, o.font);
        const kiri = o.rata === 'kiri' ? o.x : o.rata === 'kanan' ? o.x - w : o.x - w / 2;
        expect(kiri).toBeGreaterThanOrEqual(0);
        expect(kiri + w).toBeLessThanOrEqual(HALAMAN.lebar);
        expect(o.y).toBeLessThanOrEqual(HALAMAN.tinggi);
      }
    }
  });
});

describe('utilitas teks', () => {
  const f = { keluarga: 'sans' as const, berat: 400 as const, ukuran: 4 };
  it('memperkecil lalu memotong teks agar muat', () => {
    expect(pas(ukurPerkiraan, 'pendek', f, 100)).toEqual({ teks: 'pendek', font: f });
    const kecil = pas(ukurPerkiraan, 'x'.repeat(40), f, 70);
    expect(kecil.font.ukuran).toBeLessThan(4);
    expect(kecil.teks).toBe('x'.repeat(40));
    const potong = pas(ukurPerkiraan, 'x'.repeat(200), f, 70);
    expect(potong.teks.endsWith('…')).toBe(true);
    expect(ukurPerkiraan(potong.teks, potong.font)).toBeLessThanOrEqual(70);
  });

  it('membungkus per kata dengan batas baris', () => {
    expect(bungkus(ukurPerkiraan, 'satu dua tiga empat lima', f, 25, 5)).toEqual(['satu dua', 'tiga empat', 'lima']);
    const dua = bungkus(ukurPerkiraan, 'satu dua tiga empat lima enam tujuh', f, 25, 2);
    expect(dua).toHaveLength(2);
    expect(dua[1].endsWith('…')).toBe(true);
  });
});
