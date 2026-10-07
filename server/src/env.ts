import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET minimal 32 karakter'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET minimal 32 karakter'),
    /** Kunci AES-256 untuk rahasia MFA di database: 64 karakter hex (openssl rand -hex 32). */
    MFA_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'MFA_ENCRYPTION_KEY wajib 64 karakter hex (buat dengan: openssl rand -hex 32)'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    /** Masa berlaku sesi "Ingat saya". Tanpa centang, sesi berakhir saat browser ditutup. */
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
    COOKIE_SECURE: booleanString.default(true),
    TRUST_PROXY: z.string().default('false'),
    UPLOAD_DIR: z.string().default('uploads'),
    MAX_UPLOAD_MB: z.coerce.number().positive().max(100).default(10),
    CLIENT_DIST_DIR: z.string().default('../client/dist'),
    /** Zona waktu acuan "hari ini" (tenggat, notifikasi). */
    APP_TIMEZONE: z
      .string()
      .default('Asia/Jakarta')
      .refine((tz) => {
        try {
          new Intl.DateTimeFormat('en-CA', { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, 'APP_TIMEZONE bukan zona waktu IANA yang valid'),
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET harus berbeda',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((e) => ![e.JWT_ACCESS_SECRET, e.JWT_REFRESH_SECRET].includes(e.MFA_ENCRYPTION_KEY), {
    message: 'MFA_ENCRYPTION_KEY harus berbeda dari rahasia JWT',
    path: ['MFA_ENCRYPTION_KEY'],
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Konfigurasi environment tidak valid (lihat server/.env.example):\n${problems}`);
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false' || value === '') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

/** Folder `server/` — sama untuk `src/` (tsx) maupun `dist/` (build). */
export const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const uploadRoot = path.resolve(serverRoot, parsed.data.UPLOAD_DIR);

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  // Wajib true bila diakses lewat HTTPS. false hanya untuk akses http (uji coba / jaringan lokal):
  // browser tidak menyimpan cookie `Secure` di origin http selain localhost.
  cookieSecure: parsed.data.COOKIE_SECURE,
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
  /** Berkas yang boleh diakses tanpa login (logo organisasi), disajikan di /uploads. */
  publicUploadRoot: path.join(uploadRoot, 'publik'),
  /** Bukti transaksi & dokumen event — hanya lewat endpoint API yang memeriksa sesi. */
  privateUploadRoot: path.join(uploadRoot, 'privat'),
  maxUploadBytes: Math.round(parsed.data.MAX_UPLOAD_MB * 1024 * 1024),
  clientDistDir: path.resolve(serverRoot, parsed.data.CLIENT_DIST_DIR),
};
