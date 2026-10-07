import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { app, createUser, loginAs, PASSWORD, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);

describe('autentikasi', () => {
  it('menolak permintaan tulis tanpa token CSRF', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.id', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_INVALID');
  });

  it('masuk dengan email & kata sandi yang benar lalu mengembalikan izin sesuai peran', async () => {
    await createUser('bendahara@uji.id', 'bendahara');
    const { agent, login } = await loginAs('Bendahara@Uji.id');
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ email: 'bendahara@uji.id', peran: 'bendahara' });
    expect(login.body.user.izin).toEqual(['tulisKeuangan', 'tulisEvent']);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user.email).toBe('bendahara@uji.id');
  });

  it('menolak kata sandi salah dengan pesan yang sama seperti email tidak dikenal', async () => {
    await createUser('admin@uji.id');
    const salah = await loginAs('admin@uji.id', 'salah-sandi');
    const tidakAda = await loginAs('tidak-ada@uji.id');
    expect(salah.login.status).toBe(401);
    expect(tidakAda.login.status).toBe(401);
    expect(salah.login.body.message).toBe(tidakAda.login.body.message);
  });

  it('menolak akun nonaktif', async () => {
    const u = await createUser('nonaktif@uji.id', 'anggota');
    await prisma.pengguna.update({ where: { id: u.id }, data: { aktif: false } });
    const { login } = await loginAs('nonaktif@uji.id');
    expect(login.status).toBe(403);
  });

  it('cookie refresh hanya persisten bila "Ingat saya" dicentang', async () => {
    await createUser('admin@uji.id');
    const tanpa = await loginAs('admin@uji.id', PASSWORD, false);
    const dengan = await loginAs('admin@uji.id', PASSWORD, true);
    const refreshCookie = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('sk_refresh='))!;
    expect(refreshCookie(tanpa.login)).not.toMatch(/Max-Age/i);
    expect(refreshCookie(dengan.login)).toMatch(/Max-Age/i);
  });

  it('mengembalikan user null tanpa cookie sesi', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('logout mencabut sesi', async () => {
    await createUser('admin@uji.id');
    const { agent, token } = await loginAs('admin@uji.id');
    expect((await agent.post('/api/auth/logout').set('x-csrf-token', token)).status).toBe(204);
    expect((await agent.get('/api/event')).status).toBe(401);
  });

  it('mengganti kata sandi sendiri dan tetap masuk di sesi saat ini', async () => {
    await createUser('admin@uji.id');
    const { agent, token } = await loginAs('admin@uji.id');
    const salah = await agent.put('/api/auth/kata-sandi').set('x-csrf-token', token).send({ lama: 'keliru', baru: 'sandi-baru-123' });
    expect(salah.status).toBe(400);
    const ok = await agent.put('/api/auth/kata-sandi').set('x-csrf-token', token).send({ lama: PASSWORD, baru: 'sandi-baru-123' });
    expect(ok.status).toBe(204);
    expect((await agent.get('/api/event')).status).toBe(200);
    expect((await loginAs('admin@uji.id')).login.status).toBe(401);
    expect((await loginAs('admin@uji.id', 'sandi-baru-123')).login.status).toBe(200);
  });
});
