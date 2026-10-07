import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ToastProvider } from './components/Toast';
import { buatEvent, buatTransaksi, kendaliUnggah, pasangApiPalsu, ruteDasar, USER_ADMIN, USER_PENINJAU } from './test/fakeApi';
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
        expect(body).toEqual({ username: 'admin', password: 'rahasia-123', ingat: true });
        return { json: { user } };
      },
      'GET /event/:id/transaksi': () => ({ json: { transaksi: [] } }),
    });
    const u = userEvent.setup();
    renderApp('/keuangan');

    expect(await screen.findByRole('heading', { name: 'Masuk ke SEKAR' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('');
    expect(await screen.findByText('Gunakan akun tim Komunitas Uji kamu.')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Username'), 'admin');
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
    await u.type(await screen.findByLabelText('Username'), 'peninjau');
    await u.type(screen.getByLabelText('Kata sandi'), 'sandi-uji-123');
    await u.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByRole('heading', { name: 'Selamat Datang di SEKAR' })).toBeInTheDocument();
  });

  it('menampilkan pesan dari server saat login gagal', async () => {
    pasangApiPalsu({
      ...ruteDasar(null, []),
      'POST /auth/login': () => ({ status: 401, json: { message: 'Username atau kata sandi salah.' } }),
    });
    const u = userEvent.setup();
    renderApp('/login');
    await u.type(await screen.findByLabelText('Username'), 'tidak-ada');
    await u.type(screen.getByLabelText('Kata sandi'), 'salah');
    await u.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Username atau kata sandi salah.');
  });

  it('akun ber-MFA diminta kode Google Authenticator setelah kata sandi', async () => {
    let user: SessionUser | null = null;
    const panggilan = pasangApiPalsu({
      ...ruteDasar(null, [buatEvent()]),
      'GET /auth/me': () => ({ json: { user } }),
      'POST /auth/login': () => ({ json: { langkah: 'mfa' } }),
      'POST /auth/login/mfa': ({ body }) => {
        if ((body as { kode: string }).kode !== '246810') return { status: 400, json: { message: 'Kode verifikasi salah atau sudah kedaluwarsa.' } };
        user = { ...USER_ADMIN, mfa: { aktif: true, wajib: false } };
        return { json: { user } };
      },
    });
    const u = userEvent.setup();
    renderApp('/login');
    await u.type(await screen.findByLabelText('Username'), 'admin');
    await u.type(screen.getByLabelText('Kata sandi'), 'rahasia-123');
    await u.click(screen.getByRole('button', { name: 'Masuk' }));

    const dialog = await screen.findByRole('dialog', { name: 'Verifikasi dua langkah' });
    const kotakPertama = within(dialog).getByLabelText('Kode verifikasi, digit 1 dari 6');
    // Hanya angka; digit keenam langsung mengirim kode tanpa perlu menekan tombol.
    await u.type(kotakPertama, '13a579');
    expect(within(dialog).getAllByRole('textbox').map((el) => (el as HTMLInputElement).value)).toEqual(['1', '3', '5', '7', '9', '']);
    await u.keyboard('2');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Kode verifikasi salah');
    expect(within(dialog).getByRole('heading', { name: 'Kode tidak cocok' })).toBeInTheDocument();
    expect(panggilan.find((p) => p.path === '/auth/login/mfa')!.body).toEqual({ kode: '135792' });
    // Setelah animasi gagal, kotak dikosongkan untuk percobaan berikutnya.
    await waitFor(() => expect(within(dialog).getByLabelText('Kode verifikasi, digit 1 dari 6')).toHaveValue(''), { timeout: 2500 });

    await u.click(within(dialog).getByRole('button', { name: /Pakai kode pemulihan/ }));
    expect(within(dialog).getByLabelText('Kode pemulihan')).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Pakai kode dari aplikasi' }));

    await u.type(within(dialog).getByLabelText('Kode verifikasi, digit 1 dari 6'), '246810');
    expect(await within(dialog).findByRole('heading', { name: 'Verifikasi berhasil' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Selamat Datang di SEKAR' }, { timeout: 4000 })).toBeInTheDocument();
    expect(panggilan.filter((p) => p.path === '/auth/login/mfa')).toHaveLength(2);
  });

  it('MFA wajib: pengguna lama harus memasang Google Authenticator sebelum memakai aplikasi', async () => {
    let user: SessionUser = { ...USER_ADMIN, mfa: { aktif: false, wajib: true } };
    pasangApiPalsu({
      ...ruteDasar(null, [buatEvent()]),
      'GET /auth/me': () => ({ json: { user } }),
      'POST /auth/mfa/pasang': () => ({ json: { rahasia: 'ABCD EFGH IJKL MNOP', uri: 'otpauth://totp/SEKAR:admin', qr: 'data:image/svg+xml;base64,PHN2Zy8+' } }),
      'POST /auth/mfa/aktifkan': () => {
        user = { ...USER_ADMIN, mfa: { aktif: true, wajib: true } };
        return { json: { kodePemulihan: ['abcde-fghjk', 'mnpqr-stuvw'] } };
      },
      'GET /auth/mfa': () => ({ json: { aktif: true, aktifSejak: null, wajib: true, sisaKodePemulihan: 10 } }),
    });
    const u = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Pasang verifikasi dua langkah' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Kode QR untuk Google Authenticator' })).toBeInTheDocument();
    expect(screen.getByText('ABCD EFGH IJKL MNOP')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Kode dari aplikasi, digit 1 dari 6'), '123456');
    expect(await screen.findByText('Verifikasi dua langkah aktif!')).toBeInTheDocument();
    const kode = await screen.findByRole('list', { name: 'Kode pemulihan' }, { timeout: 3000 });
    expect(within(kode).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['abcde-fghjk', 'mnpqr-stuvw']);

    const lanjut = screen.getByRole('button', { name: 'Lanjut ke SEKAR' });
    expect(lanjut).toBeDisabled();
    await u.click(screen.getByLabelText('Saya sudah menyimpan kode pemulihan ini'));
    await u.click(lanjut);
    expect(await screen.findByRole('heading', { name: 'Selamat Datang di SEKAR' })).toBeInTheDocument();
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

describe('unggah berkas', () => {
  afterEach(() => {
    kendaliUnggah.tahan = false;
  });

  it('menampilkan persentase progres saat dokumen diunggah', async () => {
    let dokumen: unknown[] = [];
    pasangApiPalsu({
      ...ruteDasar(USER_ADMIN, [buatEvent()]),
      'GET /event/:id/dokumen': () => ({ json: { dokumen } }),
      'POST /event/:id/dokumen': () => {
        dokumen = [
          {
            id: 1,
            nama: 'Proposal Sponsor',
            jenis: { id: 1, nama: 'Proposal' },
            status: 'draft',
            file: { nama: 'proposal.pdf', ext: 'pdf', ukuran: 2048 },
            diunggahOleh: { id: 1, nama: 'Admin Uji' },
            diunggahPada: '2025-04-12T03:00:00.000Z',
          },
        ];
        return { status: 201, json: { dokumen: dokumen[0] } };
      },
    });
    const u = userEvent.setup();
    renderApp('/administrasi');
    await u.click(await screen.findByRole('button', { name: 'Upload Dokumen' }));
    const dialog = screen.getByRole('dialog', { name: 'Upload Dokumen' });
    const input = dialog.querySelector<HTMLInputElement>('input[type=file]')!;
    await u.upload(input, new File(['%PDF-1.4'], 'proposal.pdf', { type: 'application/pdf' }));
    expect(within(dialog).getByLabelText('Nama dokumen')).toHaveValue('proposal');

    kendaliUnggah.tahan = true;
    await u.click(within(dialog).getByRole('button', { name: 'Unggah' }));
    const progres = await within(dialog).findByRole('progressbar', { name: 'Unggah proposal.pdf' });
    await waitFor(() => expect(progres).toHaveAttribute('aria-valuenow', '50'));
    expect(within(dialog).getByRole('button', { name: 'Mengunggah 50%' })).toBeDisabled();

    kendaliUnggah.lepas();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Proposal Sponsor')).toBeInTheDocument();
  });

  it('menolak berkas di atas batas unggah server sebelum dikirim', async () => {
    const panggilan = pasangApiPalsu({ ...ruteDasar(USER_ADMIN, [buatEvent()]), 'GET /event/:id/dokumen': () => ({ json: { dokumen: [] } }) });
    const u = userEvent.setup();
    renderApp('/administrasi');
    await u.click(await screen.findByRole('button', { name: 'Upload Dokumen' }));
    const dialog = screen.getByRole('dialog', { name: 'Upload Dokumen' });
    const besar = new File(['x'], 'video.pdf', { type: 'application/pdf' });
    Object.defineProperty(besar, 'size', { value: 11 * 1024 * 1024 });
    await u.upload(dialog.querySelector<HTMLInputElement>('input[type=file]')!, besar);
    await u.click(within(dialog).getByRole('button', { name: 'Unggah' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Ukuran berkas maksimal 10 MB');
    expect(panggilan.some((p) => p.method === 'POST')).toBe(false);
  });
});

describe('impor peserta', () => {
  it('modal impor menjelaskan format, menampilkan pratinjau, lalu mengirim peserta', async () => {
    const panggilan = pasangApiPalsu({
      ...ruteDasar(USER_ADMIN, [buatEvent()]),
      'GET /event/:id/peserta': () => ({ json: { peserta: [] } }),
      'POST /event/:id/peserta/impor': ({ body }) => ({ status: 201, json: { jumlah: (body as { peserta: unknown[] }).peserta.length } }),
    });
    const u = userEvent.setup();
    renderApp('/administrasi?tab=peserta');
    await u.click(await screen.findByRole('button', { name: 'Impor CSV' }));
    const dialog = screen.getByRole('dialog', { name: 'Impor peserta dari CSV' });
    expect(within(dialog).getByText('kehadiran')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Impor' })).toBeDisabled();

    const csv = 'nama;email;tipe\nBudi Santoso;budi@contoh.id;umum\n;tanpa-nama@contoh.id;mitra\nSari Dewi;sari@contoh.id;mitra\n';
    await u.upload(dialog.querySelector<HTMLInputElement>('input[type=file]')!, new File([csv], 'peserta.csv', { type: 'text/csv' }));
    expect(await within(dialog).findByText('2 peserta')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('1 baris tanpa nama akan dilewati');

    await u.click(within(dialog).getByRole('button', { name: 'Impor 2 Peserta' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(panggilan.find((p) => p.path === '/event/7/peserta/impor')!.body).toMatchObject({
      peserta: [expect.objectContaining({ nama: 'Budi Santoso', tipe: 'umum' }), expect.objectContaining({ nama: 'Sari Dewi', tipe: 'mitra' })],
    });
  });
});
