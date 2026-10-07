import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Kerangka } from '../../components/Kerangka';
import { GagalMemuat } from '../../components/Status';
import { Button } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import type { DataPasangMfa } from '../../types';
import { DaftarKodePemulihan, IkonStatus, DURASI_GAGAL_MS, jeda, KodeOtp, PesanKode, TombolSalin, type StatusKode } from './KodeMfa';

interface Props {
  /** Meminta rahasia & QR baru dari server. */
  mulai: () => Promise<DataPasangMfa>;
  /** Mengonfirmasi kode pertama; mengembalikan kode pemulihan. */
  aktifkan: (kode: string) => Promise<string[]>;
  /** Dipanggil setelah pengguna menyatakan kode pemulihan sudah disimpan. */
  onSelesai: () => void;
  labelSelesai?: string;
}

/** Alur pemasangan Google Authenticator: pindai QR → masukkan kode → animasi sukses → simpan kode pemulihan. */
export function PasangMfa({ mulai, aktifkan, onSelesai, labelSelesai }: Props) {
  const [data, setData] = useState<DataPasangMfa | null>(null);
  const [galatMuat, setGalatMuat] = useState<unknown>(null);
  const [kode, setKode] = useState('');
  const [status, setStatus] = useState<StatusKode>('diam');
  const [pesan, setPesan] = useState('');
  const [getar, setGetar] = useState(0);
  const [kodePemulihan, setKodePemulihan] = useState<string[] | null>(null);
  const [tampilKode, setTampilKode] = useState(false);
  const dimulai = useRef(false);

  const muat = () => {
    setGalatMuat(null);
    mulai()
      .then(setData)
      .catch(setGalatMuat);
  };

  // Sekali per pemasangan: setiap panggilan membuat rahasia baru di server.
  useEffect(() => {
    if (dimulai.current) return;
    dimulai.current = true;
    muat();
  }, []);

  const tolak = (teks: string, bersihkan: boolean) => {
    setStatus('gagal');
    setPesan(teks);
    setGetar((g) => g + 1);
    setTimeout(() => {
      if (bersihkan) setKode('');
      setStatus('diam');
    }, DURASI_GAGAL_MS);
  };

  const kirim = async (k: string = kode) => {
    if (!data || status === 'memeriksa' || status === 'berhasil') return;
    if (!/^\d{6}$/.test(k)) return tolak('Masukkan 6 digit kode dari aplikasi.', false);
    setStatus('memeriksa');
    setPesan('');
    const [hasil] = await Promise.allSettled([aktifkan(k), jeda(450)]);
    if (hasil.status === 'rejected') return tolak(errorMessage(hasil.reason), true);
    setKodePemulihan(hasil.value);
    setStatus('berhasil');
    // Rayakan sebentar, lalu tampilkan kode pemulihan.
    setTimeout(() => setTampilKode(true), 1300);
  };

  if (kodePemulihan && tampilKode) return <DaftarKodePemulihan kode={kodePemulihan} labelLanjut={labelSelesai} onLanjut={onSelesai} />;
  if (status === 'berhasil')
    return (
      <div className="flex animate-fade-up-fast flex-col items-center gap-3 py-6 text-center" aria-live="polite">
        <IkonStatus status="berhasil" ukuran={96} />
        <div className="mt-2 font-display text-[22px] font-bold text-navy">Verifikasi dua langkah aktif!</div>
        <div className="text-[13px] text-ink-slate">Satu langkah lagi: simpan kode pemulihan Anda.</div>
      </div>
    );
  if (galatMuat) return <GagalMemuat error={galatMuat} onRetry={muat} />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void kirim();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] leading-normal text-ink-body">
        <li>
          Pasang <b>Google Authenticator</b> (atau Microsoft Authenticator / Authy) di ponsel Anda.
        </li>
        <li>
          Di aplikasi, pilih <b>Tambah kode</b> → <b>Pindai kode QR</b>, lalu arahkan kamera ke QR di bawah.
        </li>
        <li>Masukkan 6 digit kode yang muncul di aplikasi.</li>
      </ol>
      <div className="flex flex-wrap items-center gap-5">
        {data ? (
          <img
            src={data.qr}
            alt="Kode QR untuk Google Authenticator"
            width={184}
            height={184}
            className="size-[184px] animate-pop rounded-2xl border border-line bg-white p-2 shadow-[0_12px_30px_-18px_rgba(18,38,74,.45)]"
          />
        ) : (
          <Kerangka className="size-[184px] rounded-2xl" />
        )}
        <div className="flex min-w-0 flex-1 basis-[200px] flex-col gap-2">
          <span className="text-xs text-ink-muted">Tidak bisa memindai? Pilih “Masukkan kunci penyiapan” lalu ketik kunci ini:</span>
          {data ? (
            <code className="rounded-lg bg-surface-muted px-3 py-2 font-mono text-[13px] break-all text-navy">{data.rahasia}</code>
          ) : (
            <Kerangka className="h-9 rounded-lg" />
          )}
          {data && <TombolSalin teks={data.rahasia.replace(/\s/g, '')} label="Salin kunci" className="self-start" />}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-label">Kode dari aplikasi</span>
        <KodeOtp
          label="Kode dari aplikasi"
          className="justify-start"
          value={kode}
          status={status}
          getar={getar}
          onChange={(v) => {
            setKode(v);
            setPesan('');
          }}
          onLengkap={(k) => void kirim(k)}
        />
      </div>
      <PesanKode pesan={pesan} getar={getar} />
      <Button type="submit" disabled={!data || status === 'memeriksa'} className="flex items-center justify-center gap-2 self-start px-5 py-[11px] text-sm disabled:opacity-60">
        {status === 'memeriksa' && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {status === 'memeriksa' ? 'Memeriksa…' : 'Aktifkan'}
      </Button>
    </form>
  );
}
