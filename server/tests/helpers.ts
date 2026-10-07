import request from 'supertest';
import { createApp } from '../src/app.js';
import type { Peran } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();
export const PASSWORD = 'kata-sandi-uji';

let passwordHash: string | undefined;

export async function resetDatabase() {
  await prisma.transaksi.deleteMany();
  await prisma.anggaran.deleteMany();
  await prisma.tugas.deleteMany();
  await prisma.dokumen.deleteMany();
  await prisma.peserta.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.anggotaEvent.deleteMany();
  await prisma.event.deleteMany();
  await prisma.templateTugas.deleteMany();
  await prisma.templateEvent.deleteMany();
  await prisma.kategoriKeuangan.deleteMany();
  await prisma.metodePembayaran.deleteMany();
  await prisma.jenisDokumen.deleteMany();
  await prisma.kodePemulihan.deleteMany();
  await prisma.pengguna.deleteMany();
  await prisma.organisasi.deleteMany();
}

export async function createUser(username: string, peran: Peran = 'admin', nama = `Pengguna ${username}`) {
  passwordHash ??= await hashPassword(PASSWORD);
  return prisma.pengguna.create({ data: { username, nama, peran, passwordHash } });
}

/** Master data minimum untuk transaksi & dokumen. */
export async function createMaster() {
  const [masuk, keluar, keluar2, metode, jenis] = await Promise.all([
    prisma.kategoriKeuangan.create({ data: { nama: 'Tiket', jenis: 'masuk' } }),
    prisma.kategoriKeuangan.create({ data: { nama: 'Venue', jenis: 'keluar' } }),
    prisma.kategoriKeuangan.create({ data: { nama: 'Konsumsi', jenis: 'keluar' } }),
    prisma.metodePembayaran.create({ data: { nama: 'Transfer Bank' } }),
    prisma.jenisDokumen.create({ data: { nama: 'Proposal' } }),
  ]);
  return { masuk, keluar, keluar2, metode, jenis };
}

/** Agent dengan cookie jar + token CSRF, sudah login. */
export async function loginAs(username: string, password = PASSWORD, ingat = false) {
  const agent = request.agent(app);
  const csrf = await agent.get('/api/auth/csrf');
  const token = csrf.body.csrfToken as string;
  const login = await agent.post('/api/auth/login').set('x-csrf-token', token).send({ username, password, ingat });
  return { agent, token, login };
}

export type Sesi = Awaited<ReturnType<typeof loginAs>>;

/** Membuat event lewat API sebagai pengguna `sesi`. */
export async function createEvent(sesi: Sesi, picId: number, extra: Record<string, unknown> = {}) {
  const res = await sesi.agent
    .post('/api/event')
    .set('x-csrf-token', sesi.token)
    .send({ nama: 'Annual Gathering', tanggal: '2025-04-12', lokasi: 'Surabaya', picId, budget: 1000000, targetPemasukan: 2000000, ...extra });
  if (res.status !== 201) throw new Error(`Gagal membuat event: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.event as { id: number };
}

export const PDF = Buffer.from('%PDF-1.4\n%uji\n');
export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
