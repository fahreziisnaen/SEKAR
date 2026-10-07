import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../env.js';

export const ACCESS_COOKIE = 'sk_access';
export const REFRESH_COOKIE = 'sk_refresh';
export const CSRF_COOKIE = 'sk_csrf';
/** Tiket singkat antara kata sandi benar dan kode MFA; belum berupa sesi. */
export const MFA_COOKIE = 'sk_mfa';
const MFA_TTL_DETIK = 10 * 60;

const ISSUER = 'sekar';

interface TokenSubject {
  id: number;
  tokenVersion: number;
}

export interface VerifiedToken {
  userId: number;
  tokenVersion: number;
  /** Sesi "Ingat saya": cookie refresh bertahan setelah browser ditutup. */
  ingat: boolean;
}

export type AccessTokenResult = VerifiedToken | 'expired' | 'invalid';

function baseCookie(): CookieOptions {
  return { httpOnly: true, secure: env.cookieSecure, sameSite: 'strict' };
}

function sign(user: TokenSubject, ingat: boolean, secret: string, audience: string, expiresInSeconds: number): string {
  return jwt.sign({ tv: user.tokenVersion, rm: ingat }, secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    issuer: ISSUER,
    audience,
    expiresIn: expiresInSeconds,
  });
}

function verify(token: string, secret: string, audience: string, ignoreExpiration = false): AccessTokenResult {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience, ignoreExpiration });
    if (typeof payload === 'string' || typeof payload.tv !== 'number') return 'invalid';
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return 'invalid';
    return { userId, tokenVersion: payload.tv, ingat: payload.rm === true };
  } catch (err) {
    return err instanceof jwt.TokenExpiredError ? 'expired' : 'invalid';
  }
}

export function verifyAccessToken(token: string, { ignoreExpiration = false } = {}): AccessTokenResult {
  return verify(token, env.JWT_ACCESS_SECRET, 'access', ignoreExpiration);
}

export function verifyRefreshToken(token: string): VerifiedToken | null {
  const result = verify(token, env.JWT_REFRESH_SECRET, 'refresh');
  return typeof result === 'object' ? result : null;
}

export function setAuthCookies(res: Response, user: TokenSubject, ingat: boolean): void {
  const accessTtl = env.ACCESS_TOKEN_TTL_MINUTES * 60;
  const refreshTtl = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  res.cookie(ACCESS_COOKIE, sign(user, ingat, env.JWT_ACCESS_SECRET, 'access', accessTtl), { ...baseCookie(), path: '/' });
  res.cookie(REFRESH_COOKIE, sign(user, ingat, env.JWT_REFRESH_SECRET, 'refresh', refreshTtl), {
    ...baseCookie(),
    path: '/api/auth',
    // Tanpa maxAge cookie hilang saat browser ditutup.
    ...(ingat ? { maxAge: refreshTtl * 1000 } : {}),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: '/api/auth' });
}

export function csrfCookieOptions(): CookieOptions {
  // Sengaja tidak httpOnly: client membaca nilainya lalu mengirim ulang di header (double-submit).
  return { httpOnly: false, secure: env.cookieSecure, sameSite: 'strict', path: '/' };
}

/** `verifikasi`: pengguna sudah punya MFA. `pasang`: organisasi mewajibkan MFA, pengguna belum memasang. */
export type TujuanMfa = 'verifikasi' | 'pasang';

export interface TiketMfa extends VerifiedToken {
  tujuan: TujuanMfa;
}

export function setMfaCookie(res: Response, user: TokenSubject, ingat: boolean, tujuan: TujuanMfa): void {
  const token = jwt.sign({ tv: user.tokenVersion, rm: ingat, tj: tujuan }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: String(user.id),
    issuer: ISSUER,
    audience: 'mfa',
    expiresIn: MFA_TTL_DETIK,
  });
  res.cookie(MFA_COOKIE, token, { ...baseCookie(), path: '/api/auth', maxAge: MFA_TTL_DETIK * 1000 });
}

export function verifyMfaToken(token: unknown): TiketMfa | null {
  if (typeof token !== 'string' || !token) return null;
  const hasil = verify(token, env.JWT_ACCESS_SECRET, 'mfa');
  if (typeof hasil !== 'object') return null;
  const tujuan = (jwt.decode(token) as { tj?: unknown } | null)?.tj;
  return tujuan === 'verifikasi' || tujuan === 'pasang' ? { ...hasil, tujuan } : null;
}

export function clearMfaCookie(res: Response): void {
  res.clearCookie(MFA_COOKIE, { ...baseCookie(), path: '/api/auth' });
}
