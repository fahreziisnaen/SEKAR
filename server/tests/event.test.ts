import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/env.js';
import { prisma } from '../src/lib/prisma.js';
import { createEvent, createMaster, createUser, loginAs, PDF, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);

describe('event', () => {
  it('membuat event dengan tim dan kebutuhan dari template', async () => {
    const admin = await createUser('admin@uji.id');
    const anggota = await createUser('anggota@uji.id', 'anggota');
    const sesi = await loginAs('admin@uji.id');
    const tpl = await sesi.agent
      .post('/api/master/template')
      .set('x-csrf-token', sesi.token)
      .send({ nama: 'Gathering', deskripsi: 'Template uji', tugas: ['Konfirmasi venue', '', 'Cetak ID card'] });
    expect(tpl.status).toBe(201);
    expect(tpl.body.template.tugas).toEqual(['Konfirmasi venue', 'Cetak ID card']);

    const ev = await createEvent(sesi, admin.id, { anggotaIds: [anggota.id], templateId: tpl.body.template.id });
    const detail = await sesi.agent.get(`/api/event/${ev.id}`);
    expect(detail.body.event).toMatchObject({ nama: 'Annual Gathering', tanggal: '2025-04-12', status: 'akan_datang', tugasTotal: 2, progress: 0, budget: 1000000 });
    expect(detail.body.event.anggota.map((a: { id: number }) => a.id)).toEqual([anggota.id]);

    const tugas = await sesi.agent.get(`/api/event/${ev.id}/tugas`);
    expect(tugas.body.tugas.map((t: { label: string }) => t.label)).toEqual(['Konfirmasi venue', 'Cetak ID card']);
    expect(tugas.body.tugas[0]).toMatchObject({ tenggat: '2025-04-12', pic: { id: admin.id } });
  });

  it('memvalidasi input dan menolak PIC nonaktif', async () => {
    const admin = await createUser('admin@uji.id');
    const nonaktif = await createUser('lama@uji.id', 'anggota');
    await prisma.pengguna.update({ where: { id: nonaktif.id }, data: { aktif: false } });
    const sesi = await loginAs('admin@uji.id');
    const kosong = await sesi.agent.post('/api/event').set('x-csrf-token', sesi.token).send({ tanggal: '2025-02-30', picId: admin.id });
    expect(kosong.status).toBe(400);
    const pic = await sesi.agent
      .post('/api/event')
      .set('x-csrf-token', sesi.token)
      .send({ nama: 'X', tanggal: '2025-04-12', lokasi: 'Malang', picId: nonaktif.id });
    expect(pic.status).toBe(400);
    expect(pic.body.code).toBe('PENGGUNA_TIDAK_VALID');
  });

  it('peninjau hanya dapat membaca', async () => {
    const admin = await createUser('admin@uji.id');
    await createUser('peninjau@uji.id', 'peninjau');
    const ev = await createEvent(await loginAs('admin@uji.id'), admin.id);
    const sesi = await loginAs('peninjau@uji.id');
    expect((await sesi.agent.get(`/api/event/${ev.id}`)).status).toBe(200);
    const buat = await sesi.agent.post('/api/event').set('x-csrf-token', sesi.token).send({ nama: 'X', tanggal: '2025-04-12', lokasi: 'Malang', picId: admin.id });
    expect(buat.status).toBe(403);
  });

  it('menghitung ringkasan keuangan dan progres dari kebutuhan', async () => {
    const admin = await createUser('admin@uji.id');
    const m = await createMaster();
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const tx = (kategoriId: number, nominal: number) =>
      sesi.agent.post(`/api/event/${ev.id}/transaksi`).set('x-csrf-token', sesi.token).send({ tanggal: '2025-04-01', keterangan: 'Uji', kategoriId, nominal, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    await tx(m.masuk.id, 5000000);
    await tx(m.keluar.id, 1200000);
    await tx(m.keluar2.id, 300000);
    const t1 = await sesi.agent.post(`/api/event/${ev.id}/tugas`).set('x-csrf-token', sesi.token).send({ label: 'A' });
    await sesi.agent.post(`/api/event/${ev.id}/tugas`).set('x-csrf-token', sesi.token).send({ label: 'B' });
    await sesi.agent.patch(`/api/tugas/${t1.body.tugas.id}`).set('x-csrf-token', sesi.token).send({ selesai: true });

    const list = await sesi.agent.get('/api/event');
    expect(list.body.event[0]).toMatchObject({ masuk: 5000000, keluar: 1500000, jumlahTransaksi: 3, tugasSelesai: 1, tugasTotal: 2, progress: 50 });
  });

  it('mengubah status, tahap, dan tim event', async () => {
    const admin = await createUser('admin@uji.id');
    const b = await createUser('b@uji.id', 'anggota');
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const res = await sesi.agent
      .put(`/api/event/${ev.id}`)
      .set('x-csrf-token', sesi.token)
      .send({ nama: 'Gathering 2025', tanggal: '2025-04-13', lokasi: 'Surabaya', picId: b.id, anggotaIds: [admin.id, b.id], status: 'selesai', tahap: 4 });
    expect(res.status).toBe(200);
    expect(res.body.event).toMatchObject({ nama: 'Gathering 2025', status: 'selesai', tahap: 4, progress: 100, pic: { id: b.id } });
    expect(res.body.event.anggota).toHaveLength(2);
  });

  it('menyimpan budget per kategori pengeluaran saja', async () => {
    const admin = await createUser('admin@uji.id');
    const m = await createMaster();
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const salah = await sesi.agent.put(`/api/event/${ev.id}/anggaran`).set('x-csrf-token', sesi.token).send({ items: [{ kategoriId: m.masuk.id, nominal: 1000 }] });
    expect(salah.status).toBe(400);
    const ok = await sesi.agent
      .put(`/api/event/${ev.id}/anggaran`)
      .set('x-csrf-token', sesi.token)
      .send({ items: [{ kategoriId: m.keluar.id, nominal: 2500000 }, { kategoriId: m.keluar2.id, nominal: 0 }] });
    expect(ok.body.event.anggaran).toEqual([{ kategoriId: m.keluar.id, nominal: 2500000 }]);
  });

  it('menghapus event beserta berkas unggahannya (admin saja)', async () => {
    const admin = await createUser('admin@uji.id');
    await createUser('anggota@uji.id', 'anggota');
    const m = await createMaster();
    const sesi = await loginAs('admin@uji.id');
    const ev = await createEvent(sesi, admin.id);
    const dok = await sesi.agent
      .post(`/api/event/${ev.id}/dokumen`)
      .set('x-csrf-token', sesi.token)
      .field('nama', 'Proposal')
      .field('jenisId', String(m.jenis.id))
      .attach('file', PDF, 'proposal.pdf');
    expect(dok.status).toBe(201);
    const row = await prisma.dokumen.findUniqueOrThrow({ where: { id: dok.body.dokumen.id } });
    const file = path.join(env.privateUploadRoot, row.filePath);
    expect(existsSync(file)).toBe(true);

    const anggota = await loginAs('anggota@uji.id');
    expect((await anggota.agent.delete(`/api/event/${ev.id}`).set('x-csrf-token', anggota.token)).status).toBe(403);
    expect((await sesi.agent.delete(`/api/event/${ev.id}`).set('x-csrf-token', sesi.token)).status).toBe(204);
    expect(existsSync(file)).toBe(false);
    expect(await prisma.dokumen.count()).toBe(0);
  });
});
