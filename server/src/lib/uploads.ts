import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Response } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { HttpError } from './http-error.js';

export type Ekstensi = 'pdf' | 'jpg' | 'png' | 'webp' | 'docx' | 'xlsx';

export const MIME: Record<Ekstensi, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const GAMBAR: Ekstensi[] = ['jpg', 'png', 'webp'];

/** Jenis berkas yang diterima per keperluan. */
export const DITERIMA = {
  bukti: ['pdf', ...GAMBAR] as Ekstensi[],
  dokumen: ['pdf', 'docx', 'xlsx', ...GAMBAR] as Ekstensi[],
  logo: GAMBAR,
  tandaTangan: GAMBAR,
};

/** Menerima satu berkas di field `file`, disimpan di memori untuk divalidasi dulu. */
export const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
}).single('file');

/** Deteksi dari magic bytes — `mimetype` dari klien tidak dipercaya. */
export function detectExtension(buffer: Buffer, originalName: string): Ekstensi | null {
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  // DOCX & XLSX adalah arsip ZIP; bedakan lewat ekstensi asli.
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    const ext = path.extname(originalName).slice(1).toLowerCase();
    if (ext === 'docx' || ext === 'xlsx') return ext;
  }
  return null;
}

function labelJenis(diterima: Ekstensi[]): string {
  const nama = [...new Set(diterima.map((e) => (e === 'jpg' ? 'JPG' : e.toUpperCase())))];
  return nama.length > 1 ? `${nama.slice(0, -1).join(', ')}, atau ${nama.at(-1)}` : nama[0];
}

export interface BerkasTersimpan {
  /** Path relatif terhadap folder upload privat/publik. */
  relPath: string;
  ext: Ekstensi;
  mime: string;
  ukuran: number;
  namaAsli: string;
}

/** Nama asli dibersihkan dari path & karakter kontrol; hanya untuk ditampilkan/diunduh. */
export function bersihkanNama(nama: string): string {
  const dasar = path.basename(nama.replace(/\\/g, '/'));
  return dasar.replace(/[\u0000-\u001f\u007f"]/g, '').slice(0, 200) || 'berkas';
}

async function simpan(root: string, folder: string, file: Express.Multer.File, diterima: Ekstensi[]): Promise<BerkasTersimpan> {
  const ext = detectExtension(file.buffer, file.originalname);
  if (!ext || !diterima.includes(ext)) {
    throw new HttpError(400, `Format berkas harus ${labelJenis(diterima)}.`, 'UPLOAD_INVALID');
  }
  const filename = `${randomUUID()}.${ext}`;
  await mkdir(path.join(root, folder), { recursive: true });
  await writeFile(path.join(root, folder, filename), file.buffer);
  return { relPath: `${folder}/${filename}`, ext, mime: MIME[ext], ukuran: file.size, namaAsli: bersihkanNama(file.originalname) };
}

export function wajibAdaBerkas(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) throw new HttpError(400, 'Pilih berkas terlebih dahulu.', 'UPLOAD_MISSING');
  return file;
}

export function simpanPrivat(folder: 'bukti' | 'dokumen' | 'tanda-tangan', file: Express.Multer.File, diterima: Ekstensi[]) {
  return simpan(env.privateUploadRoot, folder, file, diterima);
}

/** Berkas publik (logo) — dikembalikan sebagai URL `/uploads/...`. */
export async function simpanPublik(folder: 'logo', file: Express.Multer.File, diterima: Ekstensi[]): Promise<string> {
  const berkas = await simpan(env.publicUploadRoot, folder, file, diterima);
  return `/uploads/${berkas.relPath}`;
}

function resolveDalam(root: string, relPath: string): string | null {
  const target = path.resolve(root, relPath);
  return target.startsWith(root + path.sep) ? target : null;
}

export async function hapusPrivat(relPath: string | null | undefined): Promise<void> {
  const target = relPath ? resolveDalam(env.privateUploadRoot, relPath) : null;
  if (target) await rm(target, { force: true });
}

export async function hapusPublik(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl?.startsWith('/uploads/')) return;
  const target = resolveDalam(env.publicUploadRoot, publicUrl.slice('/uploads/'.length));
  if (target) await rm(target, { force: true });
}

/** Header Content-Disposition dengan nama berkas UTF-8 (RFC 6266 / 5987). */
export function disposisi(tipe: 'inline' | 'attachment', nama: string): string {
  const ascii = nama.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${tipe}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nama)}`;
}

/**
 * Mengirim berkas privat. Gambar boleh ditampilkan inline (pratinjau bukti); selain itu selalu
 * sebagai lampiran agar PDF/Office tidak dirender di origin aplikasi.
 */
export function kirimPrivat(res: Response, relPath: string, namaUnduh: string, mime: string, inline: boolean): void {
  const target = resolveDalam(env.privateUploadRoot, relPath);
  if (!target) throw new HttpError(404, 'Berkas tidak ditemukan.', 'NOT_FOUND');
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', disposisi(inline && mime.startsWith('image/') ? 'inline' : 'attachment', namaUnduh));
  res.sendFile(target, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'Berkas tidak ditemukan.', code: 'NOT_FOUND' });
  });
}
