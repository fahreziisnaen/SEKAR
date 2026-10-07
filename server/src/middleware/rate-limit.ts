import type { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { MFA_COOKIE, verifyMfaToken } from '../lib/tokens.js';

function limited(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ message, code: 'RATE_LIMITED' });
  };
}

const common = { standardHeaders: 'draft-8', legacyHeaders: false } as const;
const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? '0.0.0.0');

/** Percobaan masuk gagal per (IP + username). */
export const loginAttemptLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase().slice(0, 64) : '';
    return `${clientIp(req)}|${username}`;
  },
  handler: limited('Terlalu banyak percobaan masuk yang gagal. Coba lagi dalam 15 menit.'),
});

/** Batas longgar per IP untuk menahan brute force massal. */
export const loginIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: clientIp,
  handler: limited('Terlalu banyak permintaan masuk dari jaringan ini. Coba lagi beberapa menit lagi.'),
});

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 1200,
  keyGenerator: clientIp,
  handler: limited('Server sedang sibuk. Coba lagi sebentar lagi.'),
});

/**
 * Kode MFA salah per akun (bukan per IP): 6 digit hanya 1 juta kemungkinan, jadi tebakan dari
 * banyak IP sekaligus pun dibatasi. Kunci diambil dari tiket MFA bila ada.
 */
export const mfaLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const tiket = verifyMfaToken(req.cookies?.[MFA_COOKIE]);
    const userId = tiket?.userId ?? req.user?.id;
    return userId ? `mfa|${userId}` : `mfa-ip|${clientIp(req)}`;
  },
  handler: limited('Terlalu banyak kode verifikasi yang salah. Coba lagi dalam 15 menit.'),
});
