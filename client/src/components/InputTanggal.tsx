import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { formatTanggalPanjang } from '../lib/format';
import { Icon } from './icons';
import { cx, kelasInput } from './ui';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Tanggal kalender murni (tanpa jam/zona waktu) dalam format `YYYY-MM-DD`. */
type Ymd = { y: number; m: number; d: number };

const dua = (n: number) => String(n).padStart(2, '0');
const keIso = ({ y, m, d }: Ymd) => `${y}-${dua(m + 1)}-${dua(d)}`;
const dariIso = (s: string): Ymd | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
};
/** Perhitungan via UTC agar tidak tergeser zona waktu / DST. */
const geser = ({ y, m, d }: Ymd, hari: number): Ymd => {
  const t = new Date(Date.UTC(y, m, d + hari));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
};
const geserBulan = ({ y, m, d }: Ymd, n: number): Ymd => {
  const akhir = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m + n, Math.min(d, akhir)));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
};
const hariMinggu = ({ y, m, d }: Ymd) => new Date(Date.UTC(y, m, d)).getUTCDay();
const hariIniLokal = (): Ymd => {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
};

/** 42 sel (6 minggu), dimulai hari Senin. */
function selKalender(y: number, m: number): Ymd[] {
  const awal = { y, m, d: 1 };
  const mundur = (hariMinggu(awal) + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => geser(awal, i - mundur));
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Nama untuk pembaca layar bila tidak dibungkus label. */
  'aria-label'?: string;
  /** Tampilkan tombol "Hapus" untuk tanggal opsional. */
  bolehKosong?: boolean;
  className?: string;
}

/**
 * Pemilih tanggal bergaya SEKAR, pengganti kalender bawaan browser. Keyboard: panah untuk
 * berpindah hari/minggu, PageUp/PageDown untuk bulan, Enter untuk memilih, Escape untuk menutup.
 */
export function InputTanggal({ value, onChange, placeholder = 'Pilih tanggal', bolehKosong = false, className, ...rest }: Props) {
  const [buka, setBuka] = useState(false);
  const terpilih = dariIso(value);
  const [fokus, setFokus] = useState<Ymd>(terpilih ?? hariIniLokal());
  const wadah = useRef<HTMLSpanElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  const hariIni = keIso(hariIniLokal());

  // Klik di luar menutup kalender.
  useEffect(() => {
    if (!buka) return;
    const h = (e: MouseEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [buka]);

  // Fokus mengikuti hari yang disorot.
  useEffect(() => {
    if (buka) grid.current?.querySelector<HTMLButtonElement>(`[data-tanggal="${keIso(fokus)}"]`)?.focus();
  }, [buka, fokus]);

  const bukaKalender = () => {
    setFokus(terpilih ?? hariIniLokal());
    setBuka(!buka);
  };
  const pilih = (t: Ymd) => {
    onChange(keIso(t));
    setBuka(false);
  };

  const tombolGrid = (e: KeyboardEvent) => {
    const langkah: Record<string, () => Ymd> = {
      ArrowLeft: () => geser(fokus, -1),
      ArrowRight: () => geser(fokus, 1),
      ArrowUp: () => geser(fokus, -7),
      ArrowDown: () => geser(fokus, 7),
      PageUp: () => geserBulan(fokus, -1),
      PageDown: () => geserBulan(fokus, 1),
      Home: () => geser(fokus, -((hariMinggu(fokus) + 6) % 7)),
      End: () => geser(fokus, 6 - ((hariMinggu(fokus) + 6) % 7)),
    };
    if (langkah[e.key]) {
      e.preventDefault();
      setFokus(langkah[e.key]());
    }
  };

  const sel = selKalender(fokus.y, fokus.m);

  return (
    <span ref={wadah} className={cx('relative block', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={buka}
        aria-label={rest['aria-label'] ? `${rest['aria-label']}: ${value ? formatTanggalPanjang(value) : 'belum dipilih'}` : undefined}
        onClick={bukaKalender}
        className={cx(kelasInput, 'flex w-full cursor-pointer items-center gap-2.5 py-[11px] text-left', buka && 'border-primary shadow-[0_0_0_4px_rgba(47,111,237,.12)]')}
      >
        <Icon name="cal" size={17} stroke={value ? '#2F6FED' : '#7A869A'} />
        <span className={cx('min-w-0 flex-1 truncate', value ? 'font-medium text-ink' : 'text-ink-subtle')}>{value ? formatTanggalPanjang(value) : placeholder}</span>
        <Icon name="chevronDown" size={15} stroke="#7A869A" />
      </button>

      {buka && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Pilih tanggal"
          // Klik di kalender tidak boleh diteruskan <label> pembungkus ke tombol pemicu.
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setBuka(false);
              wadah.current?.querySelector<HTMLButtonElement>('button')?.focus();
            }
          }}
          className="absolute top-full left-0 z-40 mt-2 w-[296px] max-w-[calc(100vw-32px)] origin-top-left animate-muncul rounded-2xl border border-line bg-white p-3 shadow-[0_24px_48px_-20px_rgba(18,38,74,.45)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setFokus(geserBulan(fokus, -1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-label hover:bg-surface-hover"
            >
              <span className="rotate-90">
                <Icon name="chevronDown" size={16} />
              </span>
            </button>
            <span id={`${id}-judul`} aria-live="polite" className="text-sm font-bold text-navy">
              {BULAN[fokus.m]} {fokus.y}
            </span>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              onClick={() => setFokus(geserBulan(fokus, 1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-label hover:bg-surface-hover"
            >
              <span className="-rotate-90">
                <Icon name="chevronDown" size={16} />
              </span>
            </button>
          </div>
          <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold text-ink-muted">
            {HARI_SINGKAT.map((h) => (
              <span key={h} className="py-1">
                {h}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" aria-labelledby={`${id}-judul`} onKeyDown={tombolGrid} className="grid grid-cols-7 gap-0.5">
            {sel.map((t) => {
              const iso = keIso(t);
              const bulanIni = t.m === fokus.m;
              const dipilih = iso === value;
              const sorot = iso === keIso(fokus);
              return (
                <button
                  key={iso}
                  type="button"
                  data-tanggal={iso}
                  tabIndex={sorot ? 0 : -1}
                  aria-pressed={dipilih}
                  aria-label={`${HARI[hariMinggu(t)]}, ${t.d} ${BULAN[t.m]} ${t.y}`}
                  onClick={() => pilih(t)}
                  className={cx(
                    'flex h-9 cursor-pointer items-center justify-center rounded-[10px] border-none text-[13px] transition-colors duration-100',
                    dipilih ? 'bg-primary font-bold text-white' : bulanIni ? 'bg-transparent text-ink hover:bg-primary-bg' : 'bg-transparent text-ink-subtle hover:bg-surface-hover',
                    !dipilih && iso === hariIni && 'font-bold text-primary ring-1 ring-primary/40 ring-inset',
                  )}
                >
                  {t.d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
            <button type="button" onClick={() => pilih(hariIniLokal())} className="cursor-pointer rounded-lg border-none bg-transparent px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary-bg">
              Hari ini
            </button>
            {bolehKosong && value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setBuka(false);
                }}
                className="cursor-pointer rounded-lg border-none bg-transparent px-2 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-hover hover:text-danger-ink"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
