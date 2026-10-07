import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { IkonStatus, InputPemulihan, DURASI_GAGAL_MS, jeda, KodeOtp, kodeLengkap, PesanKode, TimerTotp, type StatusKode } from './KodeMfa';

/** Lama animasi sukses sebelum dialog menyerahkan hasil ke pemanggil. */
export const DURASI_SUKSES_MS = 1400;

interface Props<T> {
  /** Mengirim kode ke server; melempar galat bila ditolak. */
  verifikasi: (kode: string) => Promise<T>;
  /** Dipanggil setelah animasi sukses selesai. */
  onBerhasil: (hasil: T) => void;
  onBatal: () => void;
  /** Galat yang membatalkan langkah ini (mis. tiket login kedaluwarsa); kembalikan true bila sudah ditangani. */
  tanganiGalat?: (galat: unknown) => boolean;
  judul?: string;
  /** Teks di bawah judul saat menunggu kode dari aplikasi. */
  keterangan?: string;
  /** Boleh memakai kode pemulihan sebagai ganti kode aplikasi. */
  bolehPemulihan?: boolean;
  labelBerhasil?: string;
}

const JUDUL: Record<Exclude<StatusKode, 'diam'>, string> = {
  memeriksa: 'Memeriksa kode…',
  gagal: 'Kode tidak cocok',
  berhasil: 'Verifikasi berhasil',
};

/**
 * Dialog verifikasi dua langkah: enam kotak kode yang otomatis terkirim saat lengkap, kotak
 * bergelombang selama diperiksa, goyang merah bila ditolak, dan centang hijau dengan percikan
 * bila diterima sebelum melanjutkan.
 */
export function VerifikasiMfa<T>({
  verifikasi,
  onBerhasil,
  onBatal,
  tanganiGalat,
  judul = 'Verifikasi dua langkah',
  keterangan = 'Buka Google Authenticator di ponsel Anda, lalu masukkan 6 digit kode untuk SEKAR.',
  bolehPemulihan = true,
  labelBerhasil = 'Mengalihkan ke SEKAR…',
}: Props<T>) {
  const [pemulihan, setPemulihan] = useState(false);
  const [kode, setKode] = useState('');
  const [status, setStatus] = useState<StatusKode>('diam');
  const [pesan, setPesan] = useState('');
  const [getar, setGetar] = useState(0);

  const tolak = (teks: string, bersihkan: boolean) => {
    setStatus('gagal');
    setPesan(teks);
    setGetar((g) => g + 1);
    // Biarkan merah & goyang terlihat sebentar, lalu kosongkan untuk percobaan berikutnya.
    setTimeout(() => {
      if (bersihkan) setKode('');
      setStatus('diam');
    }, DURASI_GAGAL_MS);
  };

  const kirim = async (k: string = kode) => {
    if (status === 'memeriksa' || status === 'berhasil') return;
    if (!kodeLengkap(k, pemulihan)) return tolak(pemulihan ? 'Masukkan kode pemulihan 10 karakter.' : 'Masukkan 6 digit kode dari aplikasi.', false);
    setStatus('memeriksa');
    setPesan('');
    const [hasil] = await Promise.allSettled([verifikasi(k), jeda(450)]);
    if (hasil.status === 'fulfilled') {
      setStatus('berhasil');
      setTimeout(() => onBerhasil(hasil.value), DURASI_SUKSES_MS);
      return;
    }
    if (tanganiGalat?.(hasil.reason)) return;
    tolak(errorMessage(hasil.reason), true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void kirim();
  };

  const gantiMode = () => {
    setPemulihan(!pemulihan);
    setKode('');
    setPesan('');
    setStatus('diam');
  };

  const subjudul =
    status === 'berhasil'
      ? 'Identitas Anda sudah terverifikasi.'
      : pemulihan
        ? 'Masukkan salah satu kode pemulihan yang Anda simpan saat memasang verifikasi dua langkah. Setiap kode hanya bisa dipakai sekali.'
        : keterangan;

  return (
    <Modal onClose={status === 'berhasil' || status === 'memeriksa' ? () => {} : onBatal} className="max-w-[440px] overflow-hidden rounded-[28px] shadow-modal">
      {(titleId) => (
        <div className="flex flex-col">
          <div className="relative flex flex-col items-center gap-4 bg-[linear-gradient(180deg,#EEF4FF_0%,#FFFFFF_100%)] px-7 pt-9 pb-6 text-center">
            <span aria-hidden="true" className="absolute -top-16 -right-14 size-40 rounded-full bg-accent/15" />
            <span aria-hidden="true" className="absolute -bottom-10 -left-12 size-28 rounded-full bg-primary/10" />
            <IkonStatus status={status} getar={getar} />
            <div className="relative flex flex-col gap-1.5" aria-live="polite">
              <h2 id={titleId} key={status} className="m-0 animate-fade-up-quick font-display text-[24px] font-bold tracking-[-.01em] text-navy">
                {status === 'diam' ? judul : JUDUL[status]}
              </h2>
              <p className="m-0 text-[13px] leading-normal text-ink-slate">{subjudul}</p>
            </div>
          </div>

          {status === 'berhasil' ? (
            <div className="flex flex-col items-center gap-3 px-7 pt-2 pb-8">
              <span className="text-sm font-semibold text-success-ink">{labelBerhasil}</span>
              <span className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-success-bg">
                <span className="block h-full origin-left animate-isi rounded-full bg-success" style={{ animationDuration: `${DURASI_SUKSES_MS}ms` }} />
              </span>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-7 pt-2 pb-7">
              {pemulihan ? (
                <InputPemulihan
                  autoFocus
                  value={kode}
                  status={status}
                  getar={getar}
                  onChange={(v) => {
                    setKode(v);
                    setPesan('');
                  }}
                />
              ) : (
                <KodeOtp
                  autoFocus
                  value={kode}
                  status={status}
                  getar={getar}
                  onChange={(v) => {
                    setKode(v);
                    setPesan('');
                  }}
                  onLengkap={(k) => void kirim(k)}
                />
              )}
              {!pemulihan && <TimerTotp />}
              <PesanKode pesan={pesan} getar={getar} />
              <Button type="submit" disabled={status === 'memeriksa'} className="flex items-center justify-center gap-2 rounded-[14px] p-[14px] text-[15px] disabled:opacity-80">
                {status === 'memeriksa' && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {status === 'memeriksa' ? 'Memeriksa…' : 'Verifikasi'}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {bolehPemulihan ? (
                  <button type="button" onClick={gantiMode} disabled={status === 'memeriksa'} className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-primary hover:text-primary-hover">
                    {pemulihan ? 'Pakai kode dari aplikasi' : 'Ponsel tidak tersedia? Pakai kode pemulihan'}
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" onClick={onBatal} disabled={status === 'memeriksa'} className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-ink-muted hover:text-navy">
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
