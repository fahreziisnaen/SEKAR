import { beforeEach, describe, expect, it } from 'vitest';
import { createEvent, createMaster, createUser, loginAs, PASSWORD, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);

describe('pengguna', () => {
  it('admin membuat pengguna; selain admin ditolak', async () => {
    await createUser('admin@uji.id');
    await createUser('anggota@uji.id', 'anggota');
    const admin = await loginAs('admin@uji.id');
    const res = await admin.agent
      .post('/api/pengguna')
      .set('x-csrf-token', admin.token)
      .send({ nama: 'Fajar', email: 'fajar@uji.id', peran: 'bendahara', jabatan: 'Finance', kataSandi: 'sandi-awal-123' });
    expect(res.status).toBe(201);
    expect(res.body.pengguna).toMatchObject({ email: 'fajar@uji.id', peran: 'bendahara', aktif: true, jabatan: 'Finance' });
    expect(res.body.pengguna.passwordHash).toBeUndefined();

    const dobel = await admin.agent.post('/api/pengguna').set('x-csrf-token', admin.token).send({ nama: 'F', email: 'FAJAR@uji.id', peran: 'anggota', kataSandi: 'sandi-awal-123' });
    expect(dobel.status).toBe(409);

    const anggota = await loginAs('anggota@uji.id');
    const tolak = await anggota.agent.post('/api/pengguna').set('x-csrf-token', anggota.token).send({ nama: 'X', email: 'x@uji.id', peran: 'admin', kataSandi: 'sandi-awal-123' });
    expect(tolak.status).toBe(403);
  });

  it('menonaktifkan pengguna mencabut sesinya dan melindungi admin terakhir', async () => {
    const a = await createUser('admin@uji.id');
    const b = await createUser('anggota@uji.id', 'anggota');
    const admin = await loginAs('admin@uji.id');
    const anggota = await loginAs('anggota@uji.id');
    expect((await anggota.agent.get('/api/event')).status).toBe(200);

    const nonaktif = await admin.agent
      .put(`/api/pengguna/${b.id}`)
      .set('x-csrf-token', admin.token)
      .send({ nama: b.nama, email: b.email, peran: 'anggota', aktif: false });
    expect(nonaktif.status).toBe(200);
    expect((await anggota.agent.get('/api/event')).status).toBe(401);

    const diriSendiri = await admin.agent.put(`/api/pengguna/${a.id}`).set('x-csrf-token', admin.token).send({ nama: a.nama, email: a.email, peran: 'anggota', aktif: true });
    expect(diriSendiri.status).toBe(400);
  });

  it('mereset kata sandi pengguna lain', async () => {
    await createUser('admin@uji.id');
    const b = await createUser('b@uji.id', 'anggota');
    const admin = await loginAs('admin@uji.id');
    await admin.agent.put(`/api/pengguna/${b.id}`).set('x-csrf-token', admin.token).send({ nama: b.nama, email: b.email, peran: 'anggota', aktif: true, kataSandi: 'reset-sandi-123' });
    expect((await loginAs('b@uji.id', PASSWORD)).login.status).toBe(401);
    expect((await loginAs('b@uji.id', 'reset-sandi-123')).login.status).toBe(200);
  });
});

describe('master data', () => {
  it('menambah kategori, menolak duplikat, dan tidak menghapus kategori yang dipakai', async () => {
    const admin = await createUser('admin@uji.id');
    const m = await createMaster();
    const sesi = await loginAs('admin@uji.id');
    const baru = await sesi.agent.post('/api/master/kategori').set('x-csrf-token', sesi.token).send({ nama: 'Merchandise', jenis: 'masuk' });
    expect(baru.status).toBe(201);
    expect((await sesi.agent.post('/api/master/kategori').set('x-csrf-token', sesi.token).send({ nama: 'Merchandise', jenis: 'masuk' })).status).toBe(409);

    const ev = await createEvent(sesi, admin.id);
    await sesi.agent.post(`/api/event/${ev.id}/transaksi`).set('x-csrf-token', sesi.token).send({ tanggal: '2025-04-01', keterangan: 'X', kategoriId: m.masuk.id, nominal: 1000, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    const dipakai = await sesi.agent.delete(`/api/master/kategori/${m.masuk.id}`).set('x-csrf-token', sesi.token);
    expect(dipakai.status).toBe(409);
    expect((await sesi.agent.delete(`/api/master/kategori/${baru.body.kategori.id}`).set('x-csrf-token', sesi.token)).status).toBe(204);

    const master = await sesi.agent.get('/api/master');
    expect(master.body.kategori.map((k: { nama: string }) => k.nama)).toEqual(['Konsumsi', 'Tiket', 'Venue']);
  });
});

describe('peserta & vendor', () => {
  it('menambah, mengimpor, dan memperbarui kehadiran peserta', async () => {
    const admin = await createUser('admin@uji.id');
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const satu = await sesi.agent.post(`/api/event/${ev.id}/peserta`).set('x-csrf-token', sesi.token).send({ nama: 'Andi', email: 'ANDI@mail.id', tipe: 'anggota' });
    expect(satu.body.peserta).toMatchObject({ email: 'andi@mail.id', registrasi: 'menunggu', kehadiran: 'belum' });
    const impor = await sesi.agent
      .post(`/api/event/${ev.id}/peserta/impor`)
      .set('x-csrf-token', sesi.token)
      .send({ peserta: Array.from({ length: 1500 }, (_, i) => ({ nama: `Peserta ${i}`, tipe: 'umum', registrasi: 'terverifikasi' })) });
    expect(impor.status).toBe(201);
    expect(impor.body.jumlah).toBe(1500);
    const hadir = await sesi.agent.patch(`/api/peserta/${satu.body.peserta.id}`).set('x-csrf-token', sesi.token).send({ kehadiran: 'hadir' });
    expect(hadir.body.peserta.kehadiran).toBe('hadir');
    expect((await sesi.agent.get(`/api/event/${ev.id}/peserta`)).body.peserta).toHaveLength(1501);
  });

  it('memvalidasi pembayaran vendor', async () => {
    const admin = await createUser('admin@uji.id');
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const lebih = await sesi.agent.post(`/api/event/${ev.id}/vendor`).set('x-csrf-token', sesi.token).send({ nama: 'Katering', kategori: 'Catering', nilaiKontrak: 1000, terbayar: 2000 });
    expect(lebih.status).toBe(400);
    const ok = await sesi.agent.post(`/api/event/${ev.id}/vendor`).set('x-csrf-token', sesi.token).send({ nama: 'Katering', kategori: 'Catering', nilaiKontrak: 1500000, terbayar: 750000 });
    expect(ok.body.vendor).toMatchObject({ nilaiKontrak: 1500000, terbayar: 750000 });
  });
});
