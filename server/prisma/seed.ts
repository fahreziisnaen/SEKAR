/**
 * Bootstrap instalasi baru — TIDAK membuat data contoh (event, transaksi, peserta, dll.).
 *
 *   1. Profil organisasi (nama dari SEED_ORG_NAME) bila belum ada.
 *   2. Akun admin pertama (SEED_ADMIN_*) bila belum ada admin sama sekali.
 *   3. Daftar awal kategori keuangan, metode pembayaran, dan jenis dokumen bila tabelnya
 *      masih kosong. Setelah itu semuanya dikelola lewat menu Pengaturan.
 *
 * Idempoten: aman dijalankan ulang (npm run db:seed).
 */
import 'dotenv/config';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} wajib diisi di server/.env sebelum menjalankan seed.`);
  return value;
}

/** Daftar awal; dapat diubah/dihapus kapan pun dari menu Pengaturan. */
const KATEGORI_AWAL = {
  // Menjelaskan sumber dana, bukan sekadar "pemasukan event".
  masuk: [
    'Sponsorship',
    'Penjualan Tiket',
    'Pendaftaran Peserta',
    'Donasi',
    'Penjualan Produk',
    'Kerja Sama / Partnership',
    'Kontribusi Internal',
    'Pengembalian Dana',
    'Pemasukan Lainnya',
  ],
  keluar: ['Venue', 'Konsumsi', 'Peralatan', 'Transportasi', 'Dokumentasi', 'Honor', 'Promosi', 'Vendor', 'Lainnya'],
} as const;
const METODE_AWAL = ['Transfer Bank', 'QRIS', 'Tunai', 'E-Wallet'];
const JENIS_DOKUMEN_AWAL = ['Proposal', 'Rundown', 'Surat', 'Invoice', 'Kontrak', 'Bukti pembayaran', 'Dokumen vendor', 'Dokumen lainnya'];

async function main() {
  if (!(await prisma.organisasi.findUnique({ where: { id: 1 } }))) {
    await prisma.organisasi.create({ data: { id: 1, nama: requireEnv('SEED_ORG_NAME') } });
    console.log('[seed] Profil organisasi dibuat.');
  }

  if (!(await prisma.pengguna.count({ where: { peran: 'admin' } }))) {
    const password = requireEnv('SEED_ADMIN_PASSWORD');
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`SEED_ADMIN_PASSWORD minimal ${MIN_PASSWORD_LENGTH} karakter.`);
    const email = requireEnv('SEED_ADMIN_EMAIL').toLowerCase();
    await prisma.pengguna.create({
      data: { nama: requireEnv('SEED_ADMIN_NAME'), email, peran: 'admin', passwordHash: await hashPassword(password) },
    });
    console.log(`[seed] Akun admin ${email} dibuat. Segera ganti kata sandinya setelah masuk.`);
  }

  if (!(await prisma.kategoriKeuangan.count())) {
    await prisma.kategoriKeuangan.createMany({
      data: (['masuk', 'keluar'] as const).flatMap((jenis) => KATEGORI_AWAL[jenis].map((nama, urutan) => ({ nama, jenis, urutan }))),
    });
  }
  if (!(await prisma.metodePembayaran.count())) {
    await prisma.metodePembayaran.createMany({ data: METODE_AWAL.map((nama, urutan) => ({ nama, urutan })) });
  }
  if (!(await prisma.jenisDokumen.count())) {
    await prisma.jenisDokumen.createMany({ data: JENIS_DOKUMEN_AWAL.map((nama, urutan) => ({ nama, urutan })) });
  }
  console.log('[seed] Selesai.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
