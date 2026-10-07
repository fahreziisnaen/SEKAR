import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, cocokkanTotp, dekripsiRahasia, enkripsiRahasia, kodeTotp, langkahWaktu } from '../src/lib/mfa.js';
import { prisma } from '../src/lib/prisma.js';
import { app, createUser, loginAs, PASSWORD, resetDatabase, type Sesi } from './helpers.js';

beforeEach(resetDatabase);

/** Rahasia RFC 6238 Lampiran B ("12345678901234567890"). */
const RAHASIA_RFC = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it('sesuai vektor uji RFC 6238 (SHA1, 6 digit terakhir)', () => {
    const vektor: [number, string][] = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ];
    for (const [detik, kode] of vektor) expect(kodeTotp(RAHASIA_RFC, Math.floor(detik / 30))).toBe(kode);
  });

  it('base32 bolak-balik dan menerima spasi/huruf kecil', () => {
    expect(base32Decode(RAHASIA_RFC.toLowerCase().replace(/(.{4})/g, '$1 ')).toString()).toBe('12345678901234567890');
  });

  it('menerima selisih satu langkah dan menolak langkah yang sudah dipakai', () => {
    const t = 1_234_567_890_000;
    const kini = langkahWaktu(t);
    expect(cocokkanTotp(RAHASIA_RFC, kodeTotp(RAHASIA_RFC, kini - 1), null, t)).toBe(kini - 1);
    expect(cocokkanTotp(RAHASIA_RFC, kodeTotp(RAHASIA_RFC, kini + 1), null, t)).toBe(kini + 1);
    expect(cocokkanTotp(RAHASIA_RFC, kodeTotp(RAHASIA_RFC, kini - 2), null, t)).toBeNull();
    expect(cocokkanTotp(RAHASIA_RFC, kodeTotp(RAHASIA_RFC, kini), kini, t)).toBeNull();
    expect(cocokkanTotp(RAHASIA_RFC, 'abcdef', null, t)).toBeNull();
  });

  it('rahasia di database terenkripsi dan tidak bisa diubah diam-diam', () => {
    const tersimpan = enkripsiRahasia(RAHASIA_RFC);
    expect(tersimpan).not.toContain(RAHASIA_RFC);
    expect(dekripsiRahasia(tersimpan)).toBe(RAHASIA_RFC);
    const [v, iv, tag, isi] = tersimpan.split('.');
    const dirusak = [v, iv, tag, (isi!.startsWith('A') ? 'B' : 'A') + isi!.slice(1)].join('.');
    expect(() => dekripsiRahasia(dirusak)).toThrow();
  });
});

/** Kode untuk langkah berikutnya: masih dalam jendela toleransi & belum pernah dipakai. */
const kodeBerikut = (rahasia: string, geser = 1) => kodeTotp(rahasia.replace(/\s/g, ''), langkahWaktu() + geser);

async function aktifkanMfa(sesi: Sesi) {
  const pasang = await sesi.agent.post('/api/auth/mfa/pasang').set('x-csrf-token', sesi.token);
  expect(pasang.status).toBe(200);
  expect(pasang.body.qr).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(pasang.body.uri).toMatch(/^otpauth:\/\/totp\/SEKAR:/);
  const rahasia = pasang.body.rahasia as string;
  const salah = await sesi.agent.post('/api/auth/mfa/aktifkan').set('x-csrf-token', sesi.token).send({ kode: '000000' });
  expect(salah.status).toBe(400);
  const ok = await sesi.agent.post('/api/auth/mfa/aktifkan').set('x-csrf-token', sesi.token).send({ kode: kodeTotp(rahasia.replace(/\s/g, ''), langkahWaktu()) });
  expect(ok.status).toBe(200);
  expect(ok.body.kodePemulihan).toHaveLength(10);
  return { rahasia, kodePemulihan: ok.body.kodePemulihan as string[] };
}

async function kirimKode(sesi: Sesi, path: string, kode: string) {
  return sesi.agent.post(path).set('x-csrf-token', sesi.token).send({ kode });
}

describe('login dengan MFA', () => {
  it('mengaktifkan MFA, lalu login butuh kode authenticator yang belum pernah dipakai', async () => {
    await createUser('admin');
    const sesi = await loginAs('admin');
    const { rahasia } = await aktifkanMfa(sesi);
    // Sesi saat ini tetap berlaku setelah MFA diaktifkan.
    expect((await sesi.agent.get('/api/auth/me')).body.user.mfa).toEqual({ aktif: true, wajib: false });
    const tersimpan = await prisma.pengguna.findFirstOrThrow({ where: { username: 'admin' }, select: { mfaRahasia: true } });
    expect(tersimpan.mfaRahasia).not.toContain(rahasia.replace(/\s/g, ''));

    const baru = await loginAs('admin');
    expect(baru.login.status).toBe(200);
    expect(baru.login.body).toEqual({ langkah: 'mfa' });
    // Kata sandi saja belum membuat sesi.
    expect((await baru.agent.get('/api/event')).status).toBe(401);
    expect((await kirimKode(baru, '/api/auth/login/mfa', '123456')).status).toBe(400);

    const kode = kodeBerikut(rahasia);
    const masuk = await kirimKode(baru, '/api/auth/login/mfa', kode);
    expect(masuk.status).toBe(200);
    expect(masuk.body.user).toMatchObject({ username: 'admin', mfa: { aktif: true, wajib: false } });
    expect((await baru.agent.get('/api/event')).status).toBe(200);

    // Kode yang sama tidak bisa dipakai ulang di login lain.
    const lagi = await loginAs('admin');
    expect((await kirimKode(lagi, '/api/auth/login/mfa', kode)).status).toBe(400);
  });

  it('kode pemulihan hanya bisa dipakai sekali', async () => {
    await createUser('admin');
    const { kodePemulihan } = await aktifkanMfa(await loginAs('admin'));

    const a = await loginAs('admin');
    const masuk = await kirimKode(a, '/api/auth/login/mfa', kodePemulihan[0]!.toUpperCase());
    expect(masuk.status).toBe(200);
    expect(masuk.body.sisaKodePemulihan).toBe(9);

    const b = await loginAs('admin');
    expect((await kirimKode(b, '/api/auth/login/mfa', kodePemulihan[0]!)).status).toBe(400);
  });

  it('tanpa tiket dari langkah kata sandi, verifikasi MFA ditolak', async () => {
    const agent = request.agent(app);
    const token = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
    const res = await agent.post('/api/auth/login/mfa').set('x-csrf-token', token).send({ kode: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MFA_TIKET_TIDAK_VALID');
  });

  it('menonaktifkan MFA butuh kata sandi dan kode', async () => {
    await createUser('admin');
    const sesi = await loginAs('admin');
    const { rahasia } = await aktifkanMfa(sesi);
    const salahSandi = await sesi.agent.post('/api/auth/mfa/nonaktifkan').set('x-csrf-token', sesi.token).send({ kataSandi: 'keliru', kode: kodeBerikut(rahasia) });
    expect(salahSandi.status).toBe(400);
    const ok = await sesi.agent.post('/api/auth/mfa/nonaktifkan').set('x-csrf-token', sesi.token).send({ kataSandi: PASSWORD, kode: kodeBerikut(rahasia) });
    expect(ok.status).toBe(204);
    expect((await loginAs('admin')).login.body.user.mfa.aktif).toBe(false);
    expect(await prisma.kodePemulihan.count()).toBe(0);
  });

  it('admin mereset MFA pengguna lain (ponsel hilang)', async () => {
    await createUser('admin');
    const b = await createUser('budi', 'anggota');
    await aktifkanMfa(await loginAs('budi'));
    const admin = await loginAs('admin');
    const reset = await admin.agent.delete(`/api/pengguna/${b.id}/mfa`).set('x-csrf-token', admin.token);
    expect(reset.status).toBe(200);
    expect(reset.body.pengguna.mfaAktif).toBe(false);
    expect((await loginAs('budi')).login.body.user).toMatchObject({ username: 'budi' });

    const diriSendiri = await admin.agent.delete(`/api/pengguna/${(await prisma.pengguna.findFirstOrThrow({ where: { username: 'admin' } })).id}/mfa`).set('x-csrf-token', admin.token);
    expect(diriSendiri.status).toBe(400);
  });
});

describe('MFA wajib', () => {
  it('admin harus memakai MFA sebelum mewajibkannya; pengguna lain wajib memasang saat login', async () => {
    await createUser('admin');
    await createUser('anggota', 'anggota');
    const admin = await loginAs('admin');
    const anggotaLama = await loginAs('anggota');

    const ditolak = await admin.agent.patch('/api/organisasi/keamanan').set('x-csrf-token', admin.token).send({ wajibMfa: true });
    expect(ditolak.status).toBe(400);
    expect(ditolak.body.code).toBe('MFA_ADMIN_BELUM');

    await prisma.organisasi.create({ data: { id: 1, nama: 'Uji' } });
    await aktifkanMfa(admin);
    const wajib = await admin.agent.patch('/api/organisasi/keamanan').set('x-csrf-token', admin.token).send({ wajibMfa: true });
    expect(wajib.status).toBe(200);
    expect(wajib.body.organisasi.wajibMfa).toBe(true);

    // Sesi lama tanpa MFA hanya bisa dipakai untuk memasang MFA.
    const blokir = await anggotaLama.agent.get('/api/event');
    expect(blokir.status).toBe(403);
    expect(blokir.body.code).toBe('MFA_WAJIB');
    expect((await anggotaLama.agent.get('/api/auth/me')).body.user.mfa).toEqual({ aktif: false, wajib: true });

    // Login baru: diarahkan memasang MFA sebelum mendapat sesi.
    const baru = await loginAs('anggota');
    expect(baru.login.body).toEqual({ langkah: 'pasang-mfa' });
    expect((await baru.agent.get('/api/auth/me')).body.user).toBeNull();
    const pasang = await baru.agent.post('/api/auth/login/mfa/pasang').set('x-csrf-token', baru.token);
    expect(pasang.status).toBe(200);
    const aktif = await kirimKode(baru, '/api/auth/login/mfa/aktifkan', kodeTotp((pasang.body.rahasia as string).replace(/\s/g, ''), langkahWaktu()));
    expect(aktif.status).toBe(200);
    expect(aktif.body.kodePemulihan).toHaveLength(10);
    expect(aktif.body.user.mfa).toEqual({ aktif: true, wajib: true });
    expect((await baru.agent.get('/api/event')).status).toBe(200);

    // Selama wajib, MFA tidak bisa dimatikan sendiri.
    const matikan = await baru.agent.post('/api/auth/mfa/nonaktifkan').set('x-csrf-token', baru.token).send({ kataSandi: PASSWORD, kode: '123456' });
    expect(matikan.status).toBe(400);
    expect(matikan.body.code).toBe('MFA_WAJIB');
  });
});
