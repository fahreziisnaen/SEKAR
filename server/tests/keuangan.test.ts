import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createEvent, createMaster, createUser, loginAs, PDF, PNG, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);

async function siapkan() {
  const admin = await createUser('admin@uji.id');
  const m = await createMaster();
  const sesi = await loginAs('admin@uji.id');
  const ev = await createEvent(sesi, admin.id);
  return { admin, m, sesi, ev };
}

describe('transaksi', () => {
  it('menentukan jenis dari kategori dan menyimpan bukti', async () => {
    const { m, sesi, ev } = await siapkan();
    const res = await sesi.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', sesi.token)
      .field('tanggal', '2025-04-10')
      .field('keterangan', 'Sewa venue')
      .field('kategoriId', String(m.keluar.id))
      .field('nominal', '2500000')
      .field('metodeId', String(m.metode.id))
      .attach('file', PNG, 'nota venue.png');
    expect(res.status).toBe(201);
    expect(res.body.transaksi).toMatchObject({
      jenis: 'keluar',
      nominal: 2500000,
      kategori: { nama: 'Venue' },
      bukti: { nama: 'nota venue.png', gambar: true },
      dibuatOleh: { nama: 'Pengguna admin' },
    });

    const bukti = await sesi.agent.get(`/api/transaksi/${res.body.transaksi.id}/bukti?inline=1`);
    expect(bukti.status).toBe(200);
    expect(bukti.headers['content-type']).toBe('image/png');
    expect(bukti.headers['content-disposition']).toMatch(/^inline/);
    expect((await request(app).get(`/api/transaksi/${res.body.transaksi.id}/bukti`)).status).toBe(401);
  });

  it('menolak berkas bukti yang bukan gambar/PDF berdasarkan isi, bukan nama', async () => {
    const { m, sesi, ev } = await siapkan();
    const res = await sesi.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', sesi.token)
      .field('tanggal', '2025-04-10')
      .field('keterangan', 'Tiket')
      .field('pihak', 'Pemberi Uji')
      .field('kategoriId', String(m.masuk.id))
      .field('nominal', '1000')
      .field('metodeId', String(m.metode.id))
      .attach('file', Buffer.from('<script>alert(1)</script>'), 'nota.png');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UPLOAD_INVALID');
  });

  it('mewajibkan nominal positif dan hanya admin/bendahara yang boleh mencatat', async () => {
    const { m, sesi, ev } = await siapkan();
    const nol = await sesi.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', sesi.token)
      .send({ tanggal: '2025-04-10', keterangan: 'X', kategoriId: m.masuk.id, nominal: 0, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    expect(nol.status).toBe(400);
    await createUser('anggota@uji.id', 'anggota');
    const anggota = await loginAs('anggota@uji.id');
    const res = await anggota.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', anggota.token)
      .send({ tanggal: '2025-04-10', keterangan: 'X', kategoriId: m.masuk.id, nominal: 1000, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    expect(res.status).toBe(403);
  });

  it('memfilter transaksi berdasarkan rentang tanggal dan menghapusnya', async () => {
    const { m, sesi, ev } = await siapkan();
    for (const tanggal of ['2025-01-15', '2025-04-02', '2025-04-30']) {
      await sesi.agent
        .post(`/api/event/${ev.id}/transaksi`)
        .set('x-csrf-token', sesi.token)
        .send({ tanggal, keterangan: `Tx ${tanggal}`, kategoriId: m.masuk.id, nominal: 1000, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    }
    const q2 = await sesi.agent.get(`/api/event/${ev.id}/transaksi?dari=2025-04-01&sampai=2025-06-30`);
    expect(q2.body.transaksi.map((t: { tanggal: string }) => t.tanggal)).toEqual(['2025-04-02', '2025-04-30']);
    const id = q2.body.transaksi[0].id;
    expect((await sesi.agent.delete(`/api/transaksi/${id}`).set('x-csrf-token', sesi.token)).status).toBe(204);
    expect((await sesi.agent.get(`/api/event/${ev.id}/transaksi`)).body.transaksi).toHaveLength(2);
  });
});

describe('bukti penerimaan dana', () => {
  const tambah = (s: Awaited<ReturnType<typeof siapkan>>, body: Record<string, unknown>) =>
    s.sesi.agent
      .post(`/api/event/${s.ev.id}/transaksi`)
      .set('x-csrf-token', s.sesi.token)
      .send({ tanggal: '2025-04-12', keterangan: 'Sponsor Utama', kategoriId: s.m.masuk.id, nominal: 5000000, metodeId: s.m.metode.id, ...body });

  it('mewajibkan pemberi dana untuk pemasukan, tetapi tidak untuk pengeluaran', async () => {
    const s = await siapkan();
    const tanpa = await tambah(s, { pihak: '' });
    expect(tanpa.status).toBe(400);
    expect(tanpa.body.details).toEqual([{ path: 'pihak', message: 'Pemberi dana wajib diisi untuk pemasukan.' }]);
    const keluar = await tambah(s, { kategoriId: s.m.keluar.id });
    expect(keluar.status).toBe(201);
    expect(keluar.body.transaksi).toMatchObject({ jenis: 'keluar', pihak: null, nomorBukti: null });
  });

  it('memberi nomor BPD-YYYYMMDD-XXX berurutan per tanggal transaksi beserta data penerimaan', async () => {
    const s = await siapkan();
    const a = await tambah(s, {
      pihak: 'PT. Maju Bersama Sejahtera',
      pihakKeterangan: 'Sponsor Event',
      bank: 'Bank Mandiri',
      nomorRekening: '1234567890',
      nomorReferensi: 'TRX-001',
    });
    expect(a.status).toBe(201);
    expect(a.body.transaksi).toMatchObject({
      nomorBukti: 'BPD-20250412-001',
      pihak: 'PT. Maju Bersama Sejahtera',
      pihakKeterangan: 'Sponsor Event',
      bank: 'Bank Mandiri',
      nomorRekening: '1234567890',
      nomorReferensi: 'TRX-001',
      dibuatOleh: { nama: 'Pengguna admin', peran: 'admin', jabatan: null },
    });
    expect((await tambah(s, { pihak: 'Donatur' })).body.transaksi.nomorBukti).toBe('BPD-20250412-002');
    expect((await tambah(s, { pihak: 'Donatur', tanggal: '2025-04-13' })).body.transaksi.nomorBukti).toBe('BPD-20250413-001');
  });

  it('tetap unik saat beberapa pemasukan disimpan bersamaan', async () => {
    const s = await siapkan();
    const hasil = await Promise.all(Array.from({ length: 4 }, (_, i) => tambah(s, { pihak: `Pemberi ${i}` })));
    expect(hasil.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(hasil.map((r) => r.body.transaksi.nomorBukti)).size).toBe(4);
  });
});

describe('laporan & notifikasi', () => {
  it('merekap untung/rugi per event dalam periode', async () => {
    const { admin, m, sesi, ev } = await siapkan();
    const ev2 = await createEvent(sesi, admin.id, { nama: 'Family Day', tanggal: '2024-12-10' });
    await sesi.agent.put(`/api/event/${ev2.id}`).set('x-csrf-token', sesi.token).send({ nama: 'Family Day', tanggal: '2024-12-10', lokasi: 'Batu', picId: admin.id, status: 'selesai', tahap: 4 });
    const tx = (eventId: number, kategoriId: number, nominal: number, tanggal: string) =>
      sesi.agent.post(`/api/event/${eventId}/transaksi`).set('x-csrf-token', sesi.token).send({ tanggal, keterangan: 'X', kategoriId, nominal, metodeId: m.metode.id, pihak: 'Pemberi Uji' });
    await tx(ev.id, m.masuk.id, 3000000, '2025-04-01');
    await tx(ev2.id, m.masuk.id, 4800000, '2024-11-20');
    await tx(ev2.id, m.keluar.id, 5150000, '2024-12-10');

    const semua = await sesi.agent.get('/api/laporan/rekap');
    expect(semua.body.rekap.find((r: { event: { id: number } }) => r.event.id === ev2.id)).toMatchObject({ masuk: 4800000, keluar: 5150000, jumlahTransaksi: 2 });

    const selesai2024 = await sesi.agent.get('/api/laporan/rekap?status=selesai&dari=2024-12-01&sampai=2024-12-31');
    expect(selesai2024.body.rekap).toHaveLength(1);
    expect(selesai2024.body.rekap[0]).toMatchObject({ masuk: 0, keluar: 5150000 });
  });

  it('memberi notifikasi tenggat dan pengeluaran mendekati budget sesuai pengaturan', async () => {
    const { admin, m, sesi, ev } = await siapkan();
    const { prisma } = await import('../src/lib/prisma.js');
    await prisma.organisasi.create({ data: { id: 1, nama: 'Org Uji' } });
    await sesi.agent.post(`/api/event/${ev.id}/tugas`).set('x-csrf-token', sesi.token).send({ label: 'Urus izin', picId: admin.id, tenggat: '2020-01-01' });
    await sesi.agent.post(`/api/event/${ev.id}/tugas`).set('x-csrf-token', sesi.token).send({ label: 'Jauh', tenggat: '2099-01-01' });
    await sesi.agent
      .post(`/api/event/${ev.id}/transaksi`)
      .set('x-csrf-token', sesi.token)
      .send({ tanggal: '2025-04-01', keterangan: 'Venue', kategoriId: m.keluar.id, nominal: 950000, metodeId: m.metode.id, pihak: 'Pemberi Uji' });

    const res = await sesi.agent.get('/api/notifikasi');
    expect(res.body.notifikasi).toEqual([
      expect.objectContaining({ tipe: 'tenggat', judul: 'Urus izin', lewat: true, pic: 'Pengguna admin' }),
      expect.objectContaining({ tipe: 'keuangan', persen: 95 }),
    ]);

    await sesi.agent.patch('/api/organisasi/notifikasi').set('x-csrf-token', sesi.token).send({ notifPengingatTenggat: false });
    const off = await sesi.agent.get('/api/notifikasi');
    expect(off.body.notifikasi.map((n: { tipe: string }) => n.tipe)).toEqual(['keuangan']);
  });
});

describe('dokumen', () => {
  it('mengunggah, mengubah status, dan mengunduh dokumen', async () => {
    const { m, sesi, ev } = await siapkan();
    const up = await sesi.agent
      .post(`/api/event/${ev.id}/dokumen`)
      .set('x-csrf-token', sesi.token)
      .field('nama', 'Proposal Gathering')
      .field('jenisId', String(m.jenis.id))
      .attach('file', PDF, 'Proposal Gathering.pdf');
    expect(up.body.dokumen).toMatchObject({ status: 'draft', jenis: { nama: 'Proposal' }, file: { ext: 'pdf', nama: 'Proposal Gathering.pdf' } });
    const id = up.body.dokumen.id;
    const patch = await sesi.agent.patch(`/api/dokumen/${id}`).set('x-csrf-token', sesi.token).send({ status: 'disetujui' });
    expect(patch.body.dokumen.status).toBe('disetujui');
    const unduh = await sesi.agent.get(`/api/dokumen/${id}/unduh`);
    expect(unduh.status).toBe(200);
    expect(unduh.headers['content-disposition']).toMatch(/^attachment/);
    expect(Buffer.from(unduh.body).toString()).toContain('%PDF');
  });

  it('mewajibkan berkas', async () => {
    const { m, sesi, ev } = await siapkan();
    const res = await sesi.agent.post(`/api/event/${ev.id}/dokumen`).set('x-csrf-token', sesi.token).field('nama', 'X').field('jenisId', String(m.jenis.id));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UPLOAD_MISSING');
  });
});
