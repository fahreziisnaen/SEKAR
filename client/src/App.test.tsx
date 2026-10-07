import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ToastProvider } from './components/Toast';
import { buatEvent, buatTransaksi, pasangApiPalsu, ruteDasar, USER_ADMIN, USER_PENINJAU } from './test/fakeApi';
import type { SessionUser } from './types';

function renderApp(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sesi', () => {
  it('mengarahkan ke login tanpa sesi, lalu masuk lewat API', async () => {
    let user: SessionUser | null = null;
    const panggilan = pasangApiPalsu({
      ...ruteDasar(null, [buatEvent()]),
      'GET /auth/me': () => ({ json: { user } }),
      'POST /auth/login': ({ body }) => {
        user = USER_ADMIN;
        expect(body).toEqual({ email: 'admin@uji.id', password: 'rahasia-123', ingat: true });
        return { json: { user } };
      },
      'GET /event/:id/transaksi': () => ({ json: { transaksi: [] } }),
    });
    const u = userEvent.setup();
    renderApp('/keuangan');

    expect(await screen.findByRole('heading', { name: 'Masuk ke SEKAR' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(await screen.findByText('Gunakan akun tim Komunitas Uji kamu.')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Email'), 'admin@uji.id');
    await u.type(screen.getByLabelText('Kata sandi'), 'rahasia-123');
    await u.click(screen.getByLabelText('Ingat saya'));
    await u.click(screen.getByRole('button', { name: 'Masuk' }));

    // Kembali ke halaman yang diminta sebelum login.
    expect(await screen.findByRole('heading', { name: 'Keuangan' })).toBeInTheDocument();
    expect(panggilan.find((p) => p.path === '/auth/login')).toBeTruthy();
  });

  it('setelah Keluar, pengguna berikutnya mendarat di beranda — bukan halaman sesi sebelumnya', async () => {
    let user: SessionUser | null = USER_ADMIN;
    pasangApiPalsu({
      ...ruteDasar(null, [buatEvent()]),
      'GET /auth/me': () => ({ json: { user } }),
      'POST /auth/logout': () => {
        user = null;
        return { status: 204 };
      },
      'POST /auth/login': () => {
        user = USER_PENINJAU;
        return { json: { user } };
      },
      'GET /laporan/rekap': () => ({ json: { rekap: [] } }),
    });
    const u = userEvent.setup();
    renderApp('/laporan?jenis=rekap');
    await u.click((await screen.findAllByRole('button', { name: 'Keluar' }))[0]);
    await u.type(await screen.findByLabelText('Email'), 'lihat@uji.id');
    await u.type(screen.getByLabelText('Kata sandi'), 'sandi-uji-123');
    await u.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByRole('heading', { name: 'Selamat Datang di SEKAR' })).toBeInTheDocument();
  });

  it('menampilkan pesan dari server saat login gagal', async () => {
    pasangApiPalsu({
      ...ruteDasar(null, []),
      'POST /auth/login': () => ({ status: 401, json: { message: 'Email atau kata sandi salah.' } }),
    });
    const u = userEvent.setup();
    renderApp('/login');
    await u.type(await screen.findByLabelText('Email'), 'x@uji.id');
    await u.type(screen.getByLabelText('Kata sandi'), 'salah');
    await u.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau kata sandi salah.');
  });
});

describe('beranda', () => {
  it('menampilkan keadaan kosong bila belum ada event', async () => {
    pasangApiPalsu(ruteDasar(USER_ADMIN, []));
    renderApp('/');
    expect(await screen.findByText('Belum ada event')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Buat Event' })).toBeInTheDocument();
  });

  it('merangkum seluruh event dari data server', async () => {
    pasangApiPalsu(ruteDasar(USER_ADMIN, [buatEvent(), buatEvent({ id: 8, nama: 'Workshop Uji', status: 'selesai', masuk: 2_000_000, keluar: 2_500_000 })]));
    renderApp('/');
    expect(await screen.findByText('2 Event')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 5.000.000').length).toBeGreaterThan(0);
    // Saldo gabungan (5.000.000 − 3.500.000) tampil di kartu & ringkasan donat.
    expect(screen.getAllByText('Rp 1.500.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rp 3.500.000').length).toBeGreaterThan(0);
  });
});

describe('hak akses', () => {
  it('peninjau tidak melihat tombol tulis', async () => {
    pasangApiPalsu({ ...ruteDasar(USER_PENINJAU, [buatEvent()]), 'GET /event/:id/transaksi': () => ({ json: { transaksi: [] } }) });
    renderApp('/keuangan');
    expect(await screen.findByRole('heading', { name: 'Keuangan' })).toBeInTheDocument();
    expect(await screen.findByText('Belum ada transaksi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Tambah Transaksi' })).not.toBeInTheDocument();
  });

  it('pengaturan hanya menampilkan Akun Saya untuk non-admin', async () => {
    pasangApiPalsu(ruteDasar(USER_PENINJAU, [buatEvent()]));
    renderApp('/pengaturan');
    expect(await screen.findByRole('heading', { name: 'Akun Saya' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pengguna/ })).not.toBeInTheDocument();
  });
});

describe('bukti penerimaan dana', () => {
  it('pemasukan wajib pemberi dana; setelah disimpan bukti bisa langsung dibuka', async () => {
    let daftar: ReturnType<typeof buatTransaksi>[] = [];
    const panggilan = pasangApiPalsu({
      ...ruteDasar(USER_ADMIN, [buatEvent()]),
      'GET /event/:id/transaksi': () => ({ json: { transaksi: daftar } }),
      'POST /event/:id/transaksi': ({ body }) => {
        const b = body as Record<string, string>;
        const tx = { ...buatTransaksi(5, 'masuk', Number(b.nominal), b.keterangan), pihak: b.pihak, pihakKeterangan: b.pihakKeterangan, nomorBukti: 'BPD-20250401-005' };
        daftar = [tx];
        return { status: 201, json: { transaksi: tx } };
      },
    });
    const u = userEvent.setup();
    renderApp('/keuangan');
    await u.click((await screen.findAllByRole('button', { name: '+ Tambah Transaksi' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Tambah Transaksi' });
    await u.type(within(dialog).getByLabelText('Nominal'), '5000000');
    await u.type(within(dialog).getByPlaceholderText('Contoh: Pelunasan dekorasi panggung'), 'Sponsor Utama');
    await u.click(within(dialog).getByRole('button', { name: 'Simpan Pemasukan' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pemberi dana (Diterima dari) wajib diisi');

    await u.type(within(dialog).getByLabelText('Diterima dari *'), 'PT. Maju Bersama Sejahtera');
    await u.type(within(dialog).getByLabelText('Keterangan pemberi'), 'Sponsor Event');
    await u.click(within(dialog).getByRole('button', { name: 'Simpan Pemasukan' }));

    const toast = await screen.findByRole('status');
    await waitFor(() => expect(toast).toHaveTextContent('Pemasukan berhasil dicatat.'));
    expect(panggilan.find((p) => p.method === 'POST')!.body).toMatchObject({ pihak: 'PT. Maju Bersama Sejahtera', pihakKeterangan: 'Sponsor Event' });

    await u.click(within(toast).getByRole('button', { name: 'Lihat Bukti Penerimaan' }));
    const bukti = await screen.findByRole('dialog', { name: 'Bukti Penerimaan Dana' });
    const gambar = await within(bukti).findByRole('img', { name: 'Bukti Penerimaan Dana BPD-20250401-005' });
    expect(gambar).toHaveTextContent('PT. Maju Bersama Sejahtera');
    expect(gambar).toHaveTextContent('Rp 5.000.000');
    expect(gambar).toHaveTextContent('(Lima Juta Rupiah)');
    expect(gambar).toHaveTextContent('Gathering Uji');
    for (const tombol of ['Cetak Bukti', 'Unduh PNG', 'Unduh PDF']) expect(within(bukti).getByRole('button', { name: tombol })).toBeEnabled();
  });
});

describe('tanda tangan', () => {
  it('pengguna mengunggah tanda tangan sendiri dari Akun Saya', async () => {
    let user: SessionUser = USER_ADMIN;
    const panggilan = pasangApiPalsu({
      ...ruteDasar(USER_ADMIN, [buatEvent()]),
      'GET /auth/me': () => ({ json: { user } }),
      'PUT /auth/tanda-tangan': () => {
        user = { ...USER_ADMIN, tandaTangan: '2025-04-12T03:00:00.000Z' };
        return { json: { tandaTangan: user.tandaTangan } };
      },
      'GET /pengguna/:id/tanda-tangan': () => ({ json: {} }),
    });
    const u = userEvent.setup();
    const { container } = renderApp('/pengaturan?tab=akun');
    expect(await screen.findByText('Belum ada tanda tangan')).toBeInTheDocument();
    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type=file][accept^="image/png"]')!;
    await u.upload(input, new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'ttd.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Tanda tangan disimpan'));
    expect(panggilan.some((p) => p.method === 'PUT' && p.path === '/auth/tanda-tangan')).toBe(true);
    expect(await screen.findByRole('button', { name: 'Ganti Tanda Tangan' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Tanda tangan Admin Uji' })).toBeInTheDocument();
    expect(panggilan.some((p) => p.path.startsWith('/pengguna/1/tanda-tangan?v='))).toBe(true);
  });
});

describe('transaksi', () => {
  it('mengirim transaksi ke server lalu memuat ulang daftar', async () => {
    let daftar = [buatTransaksi(1, 'masuk', 3_000_000, 'Penjualan tiket')];
    const panggilan = pasangApiPalsu({
      ...ruteDasar(USER_ADMIN, [buatEvent()]),
      'GET /event/:id/transaksi': () => ({ json: { transaksi: daftar } }),
      'POST /event/:id/transaksi': () => {
        daftar = [...daftar, buatTransaksi(2, 'keluar', 750_000, 'DP dekorasi')];
        return { status: 201, json: { transaksi: daftar[1] } };
      },
    });
    const u = userEvent.setup();
    renderApp('/keuangan');
    expect((await screen.findAllByText('Penjualan tiket')).length).toBeGreaterThan(0);

    await u.click(screen.getAllByRole('button', { name: '+ Tambah Transaksi' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Tambah Transaksi' });
    await u.click(within(dialog).getByRole('button', { name: 'Pengeluaran' }));
    await u.click(within(dialog).getByRole('button', { name: 'Simpan Pengeluaran' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Deskripsi dan nominal wajib diisi.');

    await u.type(within(dialog).getByLabelText('Nominal'), '750000');
    expect(within(dialog).getByLabelText('Nominal')).toHaveValue('750.000');
    await u.type(within(dialog).getByPlaceholderText('Contoh: Pelunasan dekorasi panggung'), 'DP dekorasi');
    await u.click(within(dialog).getByRole('button', { name: 'Simpan Pengeluaran' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Pengeluaran Rp 750.000 tercatat');
    expect((await screen.findAllByText('DP dekorasi')).length).toBeGreaterThan(0);
    const post = panggilan.find((p) => p.method === 'POST' && p.path === '/event/7/transaksi')!;
    expect(post.body).toMatchObject({ keterangan: 'DP dekorasi', kategoriId: '2', nominal: '750000', metodeId: '1' });
  });
});
