import { vi } from 'vitest';
import type { EventDetail, Master, SessionUser, Transaksi } from '../types';

type Handler = (req: { method: string; path: string; body: unknown }) => { status?: number; json?: unknown } | undefined;

/**
 * Kendali unggahan palsu: bila `tahan` true, unggahan berhenti di 50% sampai `lepas()`
 * dipanggil — agar tes bisa memeriksa tampilan progres.
 */
export const kendaliUnggah = {
  tahan: false,
  lepas: () => {},
};

/**
 * Pengganti `fetch` (dan XHR untuk unggahan berkas) di tes komponen: mencocokkan
 * "METHOD /path" ke handler. Rute yang tidak didaftarkan menghasilkan 404 agar tes gagal jelas.
 */
export function pasangApiPalsu(routes: Record<string, Handler>) {
  const panggilan: { method: string; path: string; body: unknown }[] = [];
  const jawab = (method: string, alamat: string, mentah: unknown) => {
    const url = new URL(alamat, 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '') + url.search;
    let body = mentah;
    if (typeof body === 'string') body = JSON.parse(body);
    if (body instanceof FormData) body = Object.fromEntries(body.entries());
    panggilan.push({ method, path, body });
    const kunci = Object.keys(routes).find((k) => {
      const [m, pola] = k.split(' ');
      return m === method && new RegExp(`^${pola.replace(/:\w+/g, '[^/?]+')}(\\?.*)?$`).test(path);
    });
    const hasil = kunci ? routes[kunci]({ method, path, body }) : { status: 404, json: { message: `Tidak ada rute ${method} ${path}` } };
    const status = hasil?.status ?? 200;
    return { status, teks: status === 204 ? '' : JSON.stringify(hasil?.json ?? {}) };
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, teks } = jawab((init?.method ?? 'GET').toUpperCase(), String(input), init?.body);
    return new Response(status === 204 ? null : teks, { status, headers: { 'Content-Type': 'application/json' } });
  });

  class XhrPalsu {
    status = 0;
    responseText = '';
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    private method = 'GET';
    private url = '';
    open(method: string, url: string) {
      this.method = method.toUpperCase();
      this.url = url;
    }
    setRequestHeader() {}
    send(body: unknown) {
      void (async () => {
        await Promise.resolve();
        this.upload.onprogress?.({ lengthComputable: true, loaded: 500, total: 1000 });
        if (kendaliUnggah.tahan) await new Promise<void>((r) => (kendaliUnggah.lepas = r));
        this.upload.onprogress?.({ lengthComputable: true, loaded: 1000, total: 1000 });
        const { status, teks } = jawab(this.method, this.url, body);
        this.status = status;
        this.responseText = teks;
        this.onload?.();
      })();
    }
  }

  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('XMLHttpRequest', XhrPalsu);
  kendaliUnggah.tahan = false;
  document.cookie = 'sk_csrf=token-uji-csrf-0123456789abcdef0123456789';
  return panggilan;
}

export const USER_ADMIN: SessionUser = {
  id: 1,
  nama: 'Admin Uji',
  username: 'admin',
  email: 'admin@uji.id',
  mfa: { aktif: false, wajib: false },
  peran: 'admin',
  jabatan: 'Event Manager',
  izin: ['kelolaPengguna', 'kelolaPengaturan', 'tulisKeuangan', 'tulisEvent', 'hapusEvent'],
  tandaTangan: null,
};

export const USER_PENINJAU: SessionUser = {
  id: 2,
  nama: 'Peninjau Uji',
  username: 'peninjau',
  email: null,
  peran: 'peninjau',
  jabatan: null,
  izin: [],
  tandaTangan: null,
  mfa: { aktif: false, wajib: false },
};

export const MASTER: Master = {
  kategori: [
    { id: 1, nama: 'Tiket', jenis: 'masuk' },
    { id: 2, nama: 'Venue', jenis: 'keluar' },
  ],
  metode: [{ id: 1, nama: 'Transfer Bank' }],
  jenisDokumen: [{ id: 1, nama: 'Proposal' }],
  template: [],
};

export function buatEvent(patch: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 7,
    nama: 'Gathering Uji',
    tanggal: '2025-04-12',
    waktu: '08.00 – 17.00 WIB',
    lokasi: 'Surabaya',
    venue: 'Hall Uji',
    deskripsi: 'Event untuk pengujian.',
    status: 'berlangsung',
    tahap: 2,
    budget: 5_000_000,
    targetPemasukan: 6_000_000,
    estimasiPengeluaran: 4_000_000,
    pic: { id: 1, nama: 'Admin Uji', tandaTangan: null },
    progress: 50,
    masuk: 3_000_000,
    keluar: 1_000_000,
    jumlahTransaksi: 2,
    tugasSelesai: 1,
    tugasTotal: 2,
    anggota: [],
    anggaran: [],
    ...patch,
  };
}

export function buatTransaksi(id: number, jenis: 'masuk' | 'keluar', nominal: number, keterangan: string): Transaksi {
  return {
    id,
    eventId: 7,
    tanggal: '2025-04-01',
    keterangan,
    jenis,
    nominal,
    kategori: jenis === 'masuk' ? { id: 1, nama: 'Tiket' } : { id: 2, nama: 'Venue' },
    metode: { id: 1, nama: 'Transfer Bank' },
    catatan: null,
    pihak: jenis === 'masuk' ? 'PT. Uji Sponsor' : null,
    pihakKeterangan: jenis === 'masuk' ? 'Sponsor Event' : null,
    bank: null,
    nomorRekening: null,
    nomorReferensi: null,
    nomorBukti: jenis === 'masuk' ? `BPD-20250401-${String(id).padStart(3, '0')}` : null,
    bukti: null,
    dibuatOleh: { id: 1, nama: 'Admin Uji', jabatan: 'Bendahara Event', peran: 'bendahara', tandaTangan: null },
    dibuatPada: '2025-04-01T03:00:00.000Z',
  };
}

/** Rute dasar yang dipakai hampir setiap halaman. */
export function ruteDasar(user: SessionUser | null, events: EventDetail[]): Record<string, Handler> {
  return {
    'GET /auth/me': () => ({ json: { user } }),
    'GET /info': () => ({ json: { versi: '1.0.0', zonaWaktu: 'Asia/Jakarta', maksUnggahMb: 10 } }),
    'GET /organisasi/publik': () => ({ json: { organisasi: { nama: 'Komunitas Uji', logoUrl: null } } }),
    'GET /organisasi': () => ({
      json: {
        organisasi: { nama: 'Komunitas Uji', email: null, telepon: null, kota: 'Surabaya', logoUrl: null, notifPengingatTenggat: true, notifPeringatanKeuangan: true, wajibMfa: false },
      },
    }),
    'GET /master': () => ({ json: MASTER }),
    'GET /notifikasi': () => ({ json: { notifikasi: [] } }),
    'GET /pengguna': () => ({ json: { pengguna: [] } }),
    'GET /event': () => ({ json: { event: events } }),
    'GET /event/:id': ({ path }) => {
      const e = events.find((x) => x.id === Number(path.split('/')[2]));
      return e ? { json: { event: e } } : { status: 404, json: { message: 'Event tidak ditemukan.' } };
    },
    'GET /event/:id/tugas': () => ({ json: { tugas: [] } }),
  };
}
