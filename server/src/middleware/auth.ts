import type { NextFunction, Request, Response } from 'express';
import type { Peran } from '../generated/prisma/client.js';
import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import { ACCESS_COOKIE, verifyAccessToken } from '../lib/tokens.js';
import { daftarIzin, punyaIzin, type Izin } from '../services/izin.js';
import { versiTandaTangan } from '../services/tandaTangan.js';

export const sessionUserSelect = {
  id: true,
  nama: true,
  username: true,
  email: true,
  peran: true,
  aktif: true,
  jabatan: true,
  tokenVersion: true,
  tandaTanganDiperbarui: true,
  mfaAktifSejak: true,
} as const;

type BarisSesi = {
  id: number;
  nama: string;
  username: string;
  email: string | null;
  peran: Peran;
  aktif: boolean;
  jabatan: string | null;
  tokenVersion: number;
  tandaTanganDiperbarui: Date | null;
  mfaAktifSejak: Date | null;
};

export interface SessionUser extends BarisSesi {
  /** Pengaturan organisasi: semua pengguna wajib MFA. */
  wajibMfa: boolean;
}

/** Pengaturan "wajib MFA" organisasi (satu baris, id 1). */
export async function ambilWajibMfa(): Promise<boolean> {
  const org = await prisma.organisasi.findUnique({ where: { id: 1 }, select: { wajibMfa: true } });
  return org?.wajibMfa ?? false;
}

export function denganWajibMfa(user: BarisSesi, wajibMfa: boolean): SessionUser {
  return { ...user, wajibMfa };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const SESSION_ENDED = 'Sesi Anda telah berakhir. Silakan masuk kembali.';

/**
 * Memvalidasi JWT dari cookie, lalu memuat ulang pengguna dari database — sehingga peran
 * dan status aktif selalu berasal dari server, bukan dari token/klien.
 */
function buatRequireAuth(izinkanTanpaMfa: boolean) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token: unknown = req.cookies?.[ACCESS_COOKIE];
    if (typeof token !== 'string' || !token) throw new HttpError(401, SESSION_ENDED, 'UNAUTHENTICATED');
    const result = verifyAccessToken(token);
    if (result === 'expired') throw new HttpError(401, SESSION_ENDED, 'TOKEN_EXPIRED');
    if (result === 'invalid') throw new HttpError(401, SESSION_ENDED, 'UNAUTHENTICATED');

    const [user, wajibMfa] = await Promise.all([
      prisma.pengguna.findUnique({ where: { id: result.userId }, select: sessionUserSelect }),
      ambilWajibMfa(),
    ]);
    if (!user || !user.aktif || user.tokenVersion !== result.tokenVersion) {
      throw new HttpError(401, SESSION_ENDED, 'SESSION_REVOKED');
    }
    // Sesi lama yang dibuat sebelum MFA diwajibkan hanya boleh dipakai untuk memasang MFA.
    if (wajibMfa && !user.mfaAktifSejak && !izinkanTanpaMfa) {
      throw new HttpError(403, 'Organisasi mewajibkan verifikasi dua langkah. Pasang Google Authenticator terlebih dahulu.', 'MFA_WAJIB');
    }
    req.user = denganWajibMfa(user, wajibMfa);
    next();
  };
}

export const requireAuth = buatRequireAuth(false);

/** Untuk `/auth/me` & pemasangan MFA: tetap bisa dipakai walau MFA wajib belum dipasang. */
export const requireAuthTanpaMfa = buatRequireAuth(true);

export function requireIzin(izin: Izin) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = currentUser(req);
    if (!punyaIzin(user.peran, izin)) {
      throw new HttpError(403, 'Anda tidak memiliki akses untuk tindakan ini.', 'FORBIDDEN');
    }
    next();
  };
}

/** Dipakai setelah `requireAuth`. */
export function currentUser(req: Request): SessionUser {
  if (!req.user) throw new HttpError(401, SESSION_ENDED, 'UNAUTHENTICATED');
  return req.user;
}

export function toSessionDto(user: SessionUser) {
  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    email: user.email,
    peran: user.peran,
    jabatan: user.jabatan,
    izin: daftarIzin(user.peran),
    tandaTangan: versiTandaTangan(user.tandaTanganDiperbarui),
    mfa: { aktif: user.mfaAktifSejak !== null, wajib: user.wajibMfa },
  };
}
