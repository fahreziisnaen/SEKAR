import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import qrcode from 'qrcode-generator';
import { env } from '../env.js';

/**
 * MFA berbasis TOTP (RFC 6238: HMAC-SHA1, 6 digit, periode 30 detik) — format yang dipakai
 * Google Authenticator, Microsoft Authenticator, Authy, dsb.
 */
export const PERIODE_DETIK = 30;
const DIGIT = 6;
/** Toleransi selisih jam ponsel: satu langkah sebelum & sesudah. */
const JENDELA = 1;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let nilai = 0;
  let hasil = '';
  for (const byte of buf) {
    nilai = (nilai << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      hasil += BASE32[(nilai >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) hasil += BASE32[(nilai << (5 - bits)) & 31];
  return hasil;
}

export function base32Decode(teks: string): Buffer {
  const bersih = teks.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let nilai = 0;
  const bytes: number[] = [];
  for (const c of bersih) {
    const i = BASE32.indexOf(c);
    if (i < 0) throw new Error('Rahasia MFA bukan base32 yang valid.');
    nilai = (nilai << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((nilai >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Rahasia baru 160 bit (panjang yang disarankan RFC 4226), dalam base32. */
export function buatRahasia(): string {
  return base32Encode(randomBytes(20));
}

export function langkahWaktu(waktuMs = Date.now()): number {
  return Math.floor(waktuMs / 1000 / PERIODE_DETIK);
}

/** Kode TOTP untuk satu langkah waktu. */
export function kodeTotp(rahasia: string, langkah: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(langkah));
  const hmac = createHmac('sha1', base32Decode(rahasia)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const angka = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGIT;
  return String(angka).padStart(DIGIT, '0');
}

function samaPersis(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Mencocokkan kode dari aplikasi authenticator. Mengembalikan langkah waktu yang cocok, atau
 * null. Langkah yang sudah pernah dipakai (≤ `langkahTerakhir`) ditolak agar kode yang sama
 * tidak bisa dipakai ulang.
 */
export function cocokkanTotp(rahasia: string, kode: string, langkahTerakhir: number | null, waktuMs = Date.now()): number | null {
  const bersih = kode.replace(/\s/g, '');
  if (!/^\d{6}$/.test(bersih)) return null;
  const kini = langkahWaktu(waktuMs);
  let cocok: number | null = null;
  for (let d = -JENDELA; d <= JENDELA; d++) {
    const langkah = kini + d;
    // Semua langkah tetap dihitung agar waktu respons tidak membocorkan posisi yang cocok.
    if (samaPersis(kodeTotp(rahasia, langkah), bersih) && (langkahTerakhir === null || langkah > langkahTerakhir)) cocok = langkah;
  }
  return cocok;
}

/** URI `otpauth://` yang dibaca aplikasi authenticator dari QR. */
export function uriOtpauth(rahasia: string, akun: string, penerbit: string): string {
  const label = `${encodeURIComponent(penerbit)}:${encodeURIComponent(akun)}`;
  const q = new URLSearchParams({ secret: rahasia, issuer: penerbit, algorithm: 'SHA1', digits: String(DIGIT), period: String(PERIODE_DETIK) });
  return `otpauth://totp/${label}?${q.toString()}`;
}

/** QR sebagai data URL SVG (CSP `img-src` mengizinkan `data:`), tanpa layanan eksternal. */
export function qrDataUrl(teks: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(teks);
  qr.make();
  const n = qr.getModuleCount();
  const tepi = 2;
  let jalur = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) jalur += `M${c + tepi} ${r + tepi}h1v1h-1z`;
  }
  const ukuran = n + tepi * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ukuran} ${ukuran}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${jalur}" fill="#12264A"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/* ---------- Enkripsi rahasia di database (AES-256-GCM) ---------- */

const KUNCI = () => Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');

export function enkripsiRahasia(teks: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KUNCI(), iv);
  const isi = Buffer.concat([cipher.update(teks, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), isi.toString('base64url')].join('.');
}

export function dekripsiRahasia(tersimpan: string): string {
  const [versi, iv, tag, isi] = tersimpan.split('.');
  if (versi !== 'v1' || !iv || !tag || !isi) throw new Error('Format rahasia MFA tidak dikenal.');
  const decipher = createDecipheriv('aes-256-gcm', KUNCI(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(isi, 'base64url')), decipher.final()]).toString('utf8');
}

/* ---------- Kode pemulihan ---------- */

export const JUMLAH_KODE_PEMULIHAN = 10;
/** Tanpa karakter yang mudah tertukar (0/o, 1/l/i). */
const ALFABET_PEMULIHAN = 'abcdefghjkmnpqrstuvwxyz23456789';

export function normalisasiKodePemulihan(kode: string): string {
  return kode.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** `abcde-fghjk`: 10 karakter acak (±49 bit). */
export function buatKodePemulihan(): string[] {
  return Array.from({ length: JUMLAH_KODE_PEMULIHAN }, () => {
    const s = Array.from({ length: 10 }, () => ALFABET_PEMULIHAN[randomInt(ALFABET_PEMULIHAN.length)]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

/** HMAC dengan kunci server: hash yang bocor dari database tidak bisa ditebak secara offline. */
export function hashKodePemulihan(kode: string): string {
  return createHmac('sha256', KUNCI()).update(normalisasiKodePemulihan(kode)).digest('hex');
}

export function bentukKodePemulihan(kode: string): boolean {
  return normalisasiKodePemulihan(kode).length === 10;
}
