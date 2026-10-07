import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createEvent, createMaster, createUser, loginAs, PNG, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);

describe('tanda tangan pengguna', () => {
  it('pengguna mengunggah tanda tangan sendiri; versinya muncul di sesi, daftar pengguna, PIC, dan pencatat transaksi', async () => {
    const admin = await createUser('admin@uji.id');
    const m = await createMaster();
    const sesi = await loginAs('admin@uji.id');

    const naik = await sesi.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', sesi.token).attach('file', PNG, 'ttd.png');
    expect(naik.status).toBe(200);
    const versi = naik.body.tandaTangan as string;
    expect(new Date(versi).toString()).not.toBe('Invalid Date');

    expect((await sesi.agent.get('/api/auth/me')).body.user.tandaTangan).toBe(versi);
    expect((await sesi.agent.get('/api/pengguna')).body.pengguna[0].tandaTangan).toBe(versi);

    const ev = await createEvent(sesi, admin.id);
    expect((await sesi.agent.get(`/api/event/${ev.id}`)).body.event.pic).toEqual({ id: admin.id, nama: 'Pengguna admin', tandaTangan: versi });
    const tx = await sesi.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', sesi.token)
      .send({ tanggal: '2025-04-12', keterangan: 'Sponsor', kategoriId: m.masuk.id, nominal: 1000, metodeId: m.metode.id, pihak: 'PT Uji' });
    expect(tx.body.transaksi.dibuatOleh.tandaTangan).toBe(versi);

    const gambar = await sesi.agent.get(`/api/pengguna/${admin.id}/tanda-tangan`);
    expect(gambar.status).toBe(200);
    expect(gambar.headers['content-type']).toBe('image/png');
    expect(gambar.headers['content-disposition']).toMatch(/^inline/);
    expect((await request(app).get(`/api/pengguna/${admin.id}/tanda-tangan`)).status).toBe(401);
  });

  it('pengguna lain dapat memuat tanda tangan untuk bukti, tetapi tidak bisa menggantinya', async () => {
    const pic = await createUser('pic@uji.id', 'anggota');
    await createUser('bendahara@uji.id', 'bendahara');
    const sesiPic = await loginAs('pic@uji.id');
    await sesiPic.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', sesiPic.token).attach('file', PNG, 'ttd.png');

    const lain = await loginAs('bendahara@uji.id');
    expect((await lain.agent.get(`/api/pengguna/${pic.id}/tanda-tangan`)).status).toBe(200);
    // Endpoint unggah selalu untuk akun sendiri: milik PIC tidak berubah.
    await lain.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', lain.token).attach('file', PNG, 'ttd-lain.png');
    const daftar = (await lain.agent.get('/api/pengguna')).body.pengguna as { email: string; tandaTangan: string | null }[];
    expect(daftar.find((p) => p.email === 'pic@uji.id')!.tandaTangan).toBe((await sesiPic.agent.get('/api/auth/me')).body.user.tandaTangan);
  });

  it('menolak berkas bukan gambar dan menghapus tanda tangan', async () => {
    const admin = await createUser('admin@uji.id');
    const sesi = await loginAs('admin@uji.id');
    const pdf = await sesi.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', sesi.token).attach('file', Buffer.from('%PDF-1.4'), 'ttd.png');
    expect(pdf.status).toBe(400);
    expect(pdf.body.message).toMatch(/JPG, PNG, atau WEBP/);

    const besar = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    expect((await sesi.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', sesi.token).attach('file', besar, 'ttd.png')).status).toBe(400);

    await sesi.agent.put('/api/auth/tanda-tangan').set('x-csrf-token', sesi.token).attach('file', PNG, 'ttd.png');
    expect((await sesi.agent.delete('/api/auth/tanda-tangan').set('x-csrf-token', sesi.token)).status).toBe(204);
    expect((await sesi.agent.get('/api/auth/me')).body.user.tandaTangan).toBeNull();
    expect((await sesi.agent.get(`/api/pengguna/${admin.id}/tanda-tangan`)).status).toBe(404);
  });
});
