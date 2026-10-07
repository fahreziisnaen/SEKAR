import { HttpError } from '../lib/http-error.js';
import {
  bentukKodePemulihan,
  buatKodePemulihan,
  buatRahasia,
  cocokkanTotp,
  dekripsiRahasia,
  enkripsiRahasia,
  hashKodePemulihan,
  qrDataUrl,
  uriOtpauth,
} from '../lib/mfa.js';
import { prisma } from '../lib/prisma.js';

/** Nama yang tampil di aplikasi authenticator. */
const PENERBIT = 'SEKAR';

export function kodeSalah(): HttpError {
  const pesan = 'Kode verifikasi salah atau sudah kedaluwarsa.';
  return new HttpError(400, pesan, 'MFA_KODE_SALAH', [{ path: 'kode', message: pesan }]);
}

/** Langkah 1 pemasangan: rahasia baru disimpan sementara sampai kode pertama dikonfirmasi. */
export async function mulaiPasangMfa(penggunaId: number, username: string) {
  const rahasia = buatRahasia();
  await prisma.pengguna.update({ where: { id: penggunaId }, data: { mfaRahasiaBaru: enkripsiRahasia(rahasia) } });
  const uri = uriOtpauth(rahasia, username, PENERBIT);
  return {
    /** Untuk diketik manual bila QR tidak bisa dipindai; dikelompokkan per 4 karakter. */
    rahasia: rahasia.match(/.{1,4}/g)!.join(' '),
    uri,
    qr: qrDataUrl(uri),
  };
}

async function simpanKodePemulihan(penggunaId: number): Promise<string[]> {
  const kode = buatKodePemulihan();
  await prisma.$transaction([
    prisma.kodePemulihan.deleteMany({ where: { penggunaId } }),
    prisma.kodePemulihan.createMany({ data: kode.map((k) => ({ penggunaId, hash: hashKodePemulihan(k) })) }),
  ]);
  return kode;
}

/** Langkah 2 pemasangan: kode pertama membuktikan aplikasi sudah tersambung. Mengembalikan kode pemulihan. */
export async function aktifkanMfa(penggunaId: number, kode: string): Promise<string[]> {
  const row = await prisma.pengguna.findUniqueOrThrow({ where: { id: penggunaId }, select: { mfaRahasiaBaru: true } });
  if (!row.mfaRahasiaBaru) throw new HttpError(400, 'Mulai pemasangan MFA terlebih dahulu.', 'MFA_BELUM_DIMULAI');
  const langkah = cocokkanTotp(dekripsiRahasia(row.mfaRahasiaBaru), kode, null);
  if (langkah === null) throw kodeSalah();
  await prisma.pengguna.update({
    where: { id: penggunaId },
    data: { mfaRahasia: row.mfaRahasiaBaru, mfaRahasiaBaru: null, mfaAktifSejak: new Date(), mfaLangkahTerakhir: langkah },
  });
  return simpanKodePemulihan(penggunaId);
}

export type HasilVerifikasi = { metode: 'totp' } | { metode: 'pemulihan'; sisa: number };

/** Kode dari aplikasi authenticator atau salah satu kode pemulihan (sekali pakai). */
export async function verifikasiMfa(penggunaId: number, kode: string): Promise<HasilVerifikasi | null> {
  const row = await prisma.pengguna.findUnique({ where: { id: penggunaId }, select: { mfaRahasia: true, mfaLangkahTerakhir: true } });
  if (!row?.mfaRahasia) return null;

  if (/^\d{6}$/.test(kode.replace(/\s/g, ''))) {
    const langkah = cocokkanTotp(dekripsiRahasia(row.mfaRahasia), kode, row.mfaLangkahTerakhir);
    if (langkah === null) return null;
    // Bersyarat agar dua permintaan bersamaan dengan kode yang sama tidak sama-sama lolos.
    const { count } = await prisma.pengguna.updateMany({
      where: { id: penggunaId, OR: [{ mfaLangkahTerakhir: null }, { mfaLangkahTerakhir: { lt: langkah } }] },
      data: { mfaLangkahTerakhir: langkah },
    });
    return count ? { metode: 'totp' } : null;
  }

  if (!bentukKodePemulihan(kode)) return null;
  const { count } = await prisma.kodePemulihan.updateMany({
    where: { penggunaId, hash: hashKodePemulihan(kode), dipakaiPada: null },
    data: { dipakaiPada: new Date() },
  });
  if (!count) return null;
  return { metode: 'pemulihan', sisa: await prisma.kodePemulihan.count({ where: { penggunaId, dipakaiPada: null } }) };
}

export async function wajibKodeBenar(penggunaId: number, kode: string): Promise<HasilVerifikasi> {
  const hasil = await verifikasiMfa(penggunaId, kode);
  if (!hasil) throw kodeSalah();
  return hasil;
}

export function buatUlangKodePemulihan(penggunaId: number): Promise<string[]> {
  return simpanKodePemulihan(penggunaId);
}

/** Mematikan MFA (oleh pemilik akun, atau direset admin bila ponsel hilang). */
export async function hapusMfa(penggunaId: number, cabutSesi: boolean): Promise<void> {
  await prisma.$transaction([
    prisma.kodePemulihan.deleteMany({ where: { penggunaId } }),
    prisma.pengguna.update({
      where: { id: penggunaId },
      data: {
        mfaRahasia: null,
        mfaRahasiaBaru: null,
        mfaAktifSejak: null,
        mfaLangkahTerakhir: null,
        ...(cabutSesi ? { tokenVersion: { increment: 1 } } : {}),
      },
    }),
  ]);
}

export function sisaKodePemulihan(penggunaId: number): Promise<number> {
  return prisma.kodePemulihan.count({ where: { penggunaId, dipakaiPada: null } });
}
