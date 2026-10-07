import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { Button, cx } from '../../components/ui';

/** Keadaan kolom kode: menunggu input, sedang diperiksa server, ditolak, atau diterima. */
export type StatusKode = 'diam' | 'memeriksa' | 'gagal' | 'berhasil';

const WARNA_KOTAK: Record<StatusKode, string> = {
  diam: 'border-line-input bg-white text-navy focus:border-primary focus:shadow-[0_0_0_4px_rgba(47,111,237,.14)]',
  memeriksa: 'border-primary/40 bg-primary-bg text-navy',
  gagal: 'border-danger bg-danger-bg text-danger-ink',
  berhasil: 'border-success bg-success-bg text-success-ink',
};

/** Jeda minimum agar animasi "memeriksa" sempat terlihat walau server menjawab sangat cepat. */
export const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lama tampilan merah setelah kode ditolak, sebelum kolom dikosongkan. */
export const DURASI_GAGAL_MS = 1100;

const KEYFRAME_GOYANG: Keyframe[] = [0, -8, 8, -8, 8, -6, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));

/**
 * Menggoyang elemen setiap `getar` bertambah. Memakai Web Animations API (bukan memasang ulang
 * elemen) agar fokus & isi kolom tidak terganggu.
 */
function useGoyang<T extends HTMLElement>(getar: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (getar === 0 || typeof ref.current?.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    ref.current.animate(KEYFRAME_GOYANG, { duration: 480, easing: 'cubic-bezier(.36,.07,.19,.97)' });
  }, [getar]);
  return ref;
}

/**
 * Kode 6 digit dalam enam kotak: pindah kotak otomatis, mendukung tempel (paste) & isi otomatis
 * dari SMS/keychain, Backspace mundur, dan memanggil `onLengkap` begitu digit keenam terisi.
 * `getar` dinaikkan setiap kali kode ditolak agar animasi goyang diputar ulang.
 */
export function KodeOtp({
  value,
  onChange,
  onLengkap,
  status = 'diam',
  getar = 0,
  autoFocus,
  label = 'Kode verifikasi',
  className = 'justify-center',
}: {
  value: string;
  onChange: (v: string) => void;
  onLengkap?: (kode: string) => void;
  status?: StatusKode;
  getar?: number;
  autoFocus?: boolean;
  label?: string;
  className?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const goyang = useGoyang<HTMLDivElement>(getar);
  const terkunci = status === 'memeriksa' || status === 'berhasil';

  // Setelah kode salah dibersihkan, kursor kembali ke kotak pertama.
  useEffect(() => {
    if (value === '' && status === 'diam' && getar > 0) refs.current[0]?.focus();
  }, [value, status, getar]);

  const isi = (baru: string, fokus: number) => {
    const bersih = baru.replace(/\D/g, '').slice(0, 6);
    onChange(bersih);
    refs.current[Math.min(fokus, bersih.length, 5)]?.focus();
    if (bersih.length === 6) onLengkap?.(bersih);
  };

  return (
    <div ref={goyang} role="group" aria-label={label} className={cx('flex gap-2 sm:gap-2.5', className)}>
      {Array.from({ length: 6 }, (_, i) => {
        const d = value[i] ?? '';
        const gaya: CSSProperties | undefined = status === 'memeriksa' || status === 'berhasil' ? { animationDelay: `${i * 70}ms` } : undefined;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`${label}, digit ${i + 1} dari 6`}
            value={d}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && i === 0}
            readOnly={terkunci}
            onFocus={(e) => e.target.select()}
            onMouseUp={(e) => e.preventDefault()}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '');
              if (!v) return;
              // Isi otomatis (SMS/keychain) atau tempel kode utuh ke satu kotak.
              if (v.length >= 6) return isi(v, 6);
              // Mengetik di kotak yang sudah berisi: ambil digit barunya saja.
              if (d && v.length > 1) v = v.replace(d, '') || d;
              const dasar = value.slice(0, Math.min(i, value.length));
              isi(dasar + v + value.slice(dasar.length + 1), dasar.length + v.length);
            }}
            onKeyDown={(e) => {
              if (terkunci) return;
              if (e.key === 'Backspace') {
                e.preventDefault();
                if (d) onChange(value.slice(0, i) + value.slice(i + 1));
                else if (i > 0) {
                  onChange(value.slice(0, i - 1) + value.slice(i));
                  refs.current[i - 1]?.focus();
                }
              } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
              else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              if (!terkunci) isi(e.clipboardData.getData('text'), 6);
            }}
            style={gaya}
            className={cx(
              'size-12 min-w-0 rounded-[14px] border-2 text-center font-display text-[26px] leading-none font-bold caret-primary outline-none transition-[border-color,background-color,color,box-shadow] duration-200 selection:bg-transparent sm:size-[54px]',
              WARNA_KOTAK[status],
              status === 'diam' && d && 'animate-pop',
              status === 'memeriksa' && 'animate-gelombang',
              status === 'berhasil' && 'animate-pop',
            )}
          />
        );
      })}
    </div>
  );
}

/** Kolom kode pemulihan (`xxxxx-xxxxx`) dengan warna & animasi status yang sama. */
export function InputPemulihan({
  value,
  onChange,
  status = 'diam',
  getar = 0,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  status?: StatusKode;
  getar?: number;
  autoFocus?: boolean;
}) {
  const goyang = useGoyang<HTMLDivElement>(getar);
  return (
    <div ref={goyang}>
      <input
        aria-label="Kode pemulihan"
        value={value}
        autoFocus={autoFocus}
        readOnly={status === 'memeriksa' || status === 'berhasil'}
        onChange={(e) => onChange(e.target.value.slice(0, 11))}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="xxxxx-xxxxx"
        className={cx(
          'w-full rounded-[14px] border-2 px-4 py-3.5 text-center font-mono text-xl tracking-[.18em] outline-none transition-colors duration-200 placeholder:text-ink-subtle/50',
          WARNA_KOTAK[status],
          status === 'memeriksa' && 'animate-pulse',
          status === 'berhasil' && 'animate-pop',
        )}
      />
    </div>
  );
}

/** Kode 6 digit lengkap, atau kode pemulihan 10 karakter (tanda hubung opsional). */
export function kodeLengkap(kode: string, pemulihan: boolean): boolean {
  return pemulihan ? kode.replace(/[^a-z0-9]/gi, '').length === 10 : /^\d{6}$/.test(kode);
}

const PERCIKAN = ['#1E9E63', '#F5B800', '#2F6FED', '#1E9E63', '#F5B800', '#4E8AF5', '#1E9E63', '#F5B800', '#2F6FED', '#1E9E63', '#F5B800', '#4E8AF5'];

/**
 * Ikon besar di kepala dialog MFA. `diam`: perisai melayang. `memeriksa`: cincin berputar.
 * `gagal`: silang merah yang digambar + goyang. `berhasil`: centang hijau, cincin denyut, percikan.
 */
export function IkonStatus({ status, getar = 0, ukuran = 88 }: { status: StatusKode; getar?: number; ukuran?: number }) {
  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: ukuran, height: ukuran }} aria-hidden="true">
      {status === 'berhasil' && (
        <>
          <span className="absolute inset-0 animate-cincin rounded-full bg-success/30" />
          <span className="absolute inset-0 animate-cincin rounded-full bg-success/20 [animation-delay:.45s]" />
          {PERCIKAN.map((warna, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 -mt-1 -ml-1 size-2 animate-pecah rounded-full [animation-delay:.2s]"
              style={{ background: warna, '--sudut': `${i * 30}deg`, '--jarak': `${ukuran * 0.62 + (i % 3) * 8}px` } as CSSProperties}
            />
          ))}
          <svg viewBox="0 0 52 52" className="relative size-full animate-pop drop-shadow-[0_10px_18px_rgba(30,158,99,.35)]">
            <circle cx="26" cy="26" r="25" fill="#1E9E63" />
            <path
              d="M15 27.5l7.2 7.2L37.5 19"
              fill="none"
              stroke="#fff"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="34"
              className="animate-garis [animation-delay:.22s]"
              style={{ '--panjang': 34, strokeDashoffset: 34 } as CSSProperties}
            />
          </svg>
        </>
      )}
      {status === 'gagal' && (
        <svg key={getar} viewBox="0 0 52 52" className="relative size-full animate-goyang drop-shadow-[0_10px_18px_rgba(217,58,53,.3)]">
          <circle cx="26" cy="26" r="25" fill="#D93A35" className="origin-center animate-pop" />
          {['M18.5 18.5l15 15', 'M33.5 18.5l-15 15'].map((d, i) => (
            <path
              key={d}
              d={d}
              stroke="#fff"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeDasharray="22"
              className="animate-garis"
              style={{ '--panjang': 22, strokeDashoffset: 22, animationDelay: `${0.12 + i * 0.12}s` } as CSSProperties}
            />
          ))}
        </svg>
      )}
      {(status === 'diam' || status === 'memeriksa') && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary-bg" />
          {status === 'memeriksa' && (
            <svg viewBox="0 0 52 52" className="absolute inset-0 size-full animate-spin [animation-duration:1.1s]">
              <circle cx="26" cy="26" r="24.5" fill="none" stroke="#2F6FED" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="38 120" />
            </svg>
          )}
          <span className={cx('relative', status === 'diam' && 'animate-mengambang')}>
            <Icon name="shield" size={Math.round(ukuran * 0.46)} stroke="#2F6FED" strokeWidth={1.8} />
          </span>
        </>
      )}
    </div>
  );
}

/** Cincin hitung mundur periode kode authenticator (30 detik). */
export function TimerTotp() {
  const hitung = () => 30 - (Math.floor(Date.now() / 1000) % 30);
  const [sisa, setSisa] = useState(hitung);
  useEffect(() => {
    const t = setInterval(() => setSisa(hitung()), 500);
    return () => clearInterval(t);
  }, []);
  const r = 8;
  const keliling = 2 * Math.PI * r;
  const segera = sisa <= 5;
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-ink-muted">
      <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r={r} fill="none" stroke="#E3E8F0" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={segera ? '#F5B800' : '#2F6FED'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - sisa / 30)}
          style={{ transition: sisa === 30 ? 'none' : 'stroke-dashoffset .5s linear, stroke .3s' }}
        />
      </svg>
      <span>
        Kode di aplikasi berganti dalam <b className={cx('tabular-nums', segera ? 'text-accent-ink' : 'text-navy')}>{sisa}</b> detik
      </span>
    </div>
  );
}

/** Pesan galat yang meluncur masuk; diputar ulang setiap `getar` berubah. */
export function PesanKode({ pesan, getar }: { pesan: string; getar: number }) {
  if (!pesan) return null;
  return (
    <div key={getar} role="alert" className="flex animate-fade-up-quick items-center justify-center gap-2 rounded-xl bg-danger-bg px-3.5 py-2.5 text-center text-[13px] font-semibold text-danger-ink">
      <svg viewBox="0 0 20 20" className="size-4 flex-none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="#D93A35" />
        <path d="M10 5.5v5.5M10 14h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {pesan}
    </div>
  );
}

async function salin(teks: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    return false;
  }
}

export function TombolSalin({ teks, label = 'Salin', className }: { teks: string; label?: string; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => void salin(teks).then((ok) => toast(ok ? 'Disalin ke clipboard' : 'Gagal menyalin. Salin secara manual.'))}
      className={cx('inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-line-ctl bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-label hover:border-primary hover:text-primary', className)}
    >
      <Icon name="copy" size={14} />
      {label}
    </button>
  );
}

/**
 * Kode pemulihan hanya ditampilkan sekali. Pengguna harus menyatakan sudah menyimpannya
 * sebelum lanjut, karena kode ini satu-satunya jalan masuk bila ponsel hilang.
 */
export function DaftarKodePemulihan({ kode, labelLanjut = 'Selesai', onLanjut }: { kode: string[]; labelLanjut?: string; onLanjut: () => void }) {
  const [disimpan, setDisimpan] = useState(false);
  const teks = kode.join('\n');
  const unduh = () => {
    const isi = `Kode pemulihan SEKAR\nSetiap kode hanya bisa dipakai sekali.\n\n${teks}\n`;
    const url = URL.createObjectURL(new Blob([isi], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kode-pemulihan-sekar.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div className="flex animate-fade-up-fast flex-col gap-4">
      <div className="rounded-xl bg-accent-bg px-4 py-3 text-[13px] leading-normal text-accent-ink">
        Simpan kode di bawah ini di tempat aman (mis. pengelola kata sandi atau dicetak). Bila ponsel hilang, satu kode bisa dipakai sekali untuk masuk
        menggantikan kode Google Authenticator. Kode ini <b>tidak akan ditampilkan lagi</b>.
      </div>
      <ol aria-label="Kode pemulihan" className="m-0 grid list-none grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-muted p-4 font-mono text-[15px] text-navy max-[380px]:grid-cols-1">
        {kode.map((k, i) => (
          <li key={k} className="animate-pop rounded-lg bg-white px-3 py-2 text-center tracking-[.06em]" style={{ animationDelay: `${i * 45}ms` }}>
            {k}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <TombolSalin teks={teks} label="Salin semua" />
        <button
          type="button"
          onClick={unduh}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-line-ctl bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-label hover:border-primary hover:text-primary"
        >
          <Icon name="download" size={14} />
          Unduh .txt
        </button>
      </div>
      <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-label">
        <input type="checkbox" checked={disimpan} onChange={(e) => setDisimpan(e.target.checked)} />
        Saya sudah menyimpan kode pemulihan ini
      </label>
      <Button onClick={onLanjut} disabled={!disimpan} className="self-start px-5 py-[11px] text-sm disabled:opacity-50">
        {labelLanjut}
      </Button>
    </div>
  );
}
