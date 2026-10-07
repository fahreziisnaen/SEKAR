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
  email: true,
  peran: true,
  aktif: true,
  jabatan: true,
  tokenVersion: true,
  tandaTanganDiperbarui: true,
} as const;

export interface SessionUser {
  id: number;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  jabatan: string | null;
  tokenVersion: number;
  tandaTanganDiperbarui: Date | null;
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
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== 'string' || !token) throw new HttpError(401, SESSION_ENDED, 'UNAUTHENTICATED');
  const result = verifyAccessToken(token);
  if (result === 'expired') throw new HttpError(401, SESSION_ENDED, 'TOKEN_EXPIRED');
  if (result === 'invalid') throw new HttpError(401, SESSION_ENDED, 'UNAUTHENTICATED');

  const user = await prisma.pengguna.findUnique({ where: { id: result.userId }, select: sessionUserSelect });
  if (!user || !user.aktif || user.tokenVersion !== result.tokenVersion) {
    throw new HttpError(401, SESSION_ENDED, 'SESSION_REVOKED');
  }
  req.user = user;
  next();
}

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
    email: user.email,
    peran: user.peran,
    jabatan: user.jabatan,
    izin: daftarIzin(user.peran),
    tandaTangan: versiTandaTangan(user.tandaTanganDiperbarui),
  };
}
