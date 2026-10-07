import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { inisial } from '../lib/format';
import { warnaBadge, type PasanganWarna } from '../lib/warna';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

/* ---------- Tombol ---------- */

type Varian = 'primary' | 'accent' | 'secondary' | 'navy' | 'link';

const VARIAN: Record<Varian, string> = {
  primary: 'rounded-xl border-none bg-primary font-bold text-white hover:bg-primary-hover',
  accent: 'rounded-xl border-none bg-accent font-bold text-navy hover:bg-accent-hover',
  secondary: 'rounded-xl border border-line-input bg-white font-semibold text-navy hover:border-line-strong',
  navy: 'rounded-xl border-none bg-navy font-bold text-white hover:bg-navy-hover',
  link: 'border-none bg-transparent p-0 text-[13px] font-semibold text-primary hover:text-primary-hover',
};

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Varian }) {
  return <button type={type} className={cx('cursor-pointer whitespace-nowrap', VARIAN[variant], className)} {...rest} />;
}

/* ---------- Permukaan ---------- */

export function Card({ className, children, flat, style }: { className?: string; children: ReactNode; flat?: boolean; style?: CSSProperties }) {
  return (
    <div style={style} className={cx('rounded-[20px] border border-line bg-white', !flat && 'shadow-card', className)}>
      {children}
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 font-display text-[32px] font-bold tracking-[-.02em] text-navy">{title}</h1>
        {sub && <div className="mt-1.5 text-sm text-ink-slate">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function CardTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-base font-bold text-navy">{title}</div>
      {sub && <div className="mt-1 text-[13px] text-ink-muted">{sub}</div>}
    </div>
  );
}

/* ---------- Indikator ---------- */

const UKURAN_BADGE = {
  sm: 'px-[9px] py-[3px] text-[11px]',
  md: 'px-[9px] py-[3px] text-xs',
  lg: 'px-2.5 py-1 text-xs',
};

export function Badge({ status, size = 'lg', warna, className }: { status: string; size?: keyof typeof UKURAN_BADGE; warna?: PasanganWarna; className?: string }) {
  const [bg, fg] = warna ?? warnaBadge(status);
  return (
    // Sengaja inline (bukan inline-block): padding vertikal tidak menambah tinggi baris tabel, sama seperti prototipe.
    <span className={cx('rounded-full font-semibold whitespace-nowrap', UKURAN_BADGE[size], className)} style={{ background: bg, color: fg }}>
      {status}
    </span>
  );
}

export function Progress({ value, color = '#2F6FED', track = '#EEF1F6', className = 'h-1.5', label }: { value: number; color?: string; track?: string; className?: string; label?: string }) {
  return (
    <div
      className={cx('overflow-hidden rounded-full', className)}
      style={{ background: track }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/** Kotak inisial berwarna, dipakai untuk event, tim, dan pengguna. */
export function Inisial({ nama, warna, className, style, abaikan }: { nama: string; warna: PasanganWarna; className?: string; style?: CSSProperties; abaikan?: string | null }) {
  return (
    <span
      aria-hidden="true"
      className={cx('flex flex-none items-center justify-center font-bold', className)}
      style={{ background: warna[0], color: warna[1], ...style }}
    >
      {inisial(nama, abaikan)}
    </span>
  );
}

export function SegmentedTabs<K extends string>({ items, value, onChange, className, label }: { items: [K, string][]; value: K; onChange: (k: K) => void; className?: string; label: string }) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-1 rounded-xl bg-segment p-1', className)}>
      {items.map(([k, l]) => {
        const aktif = k === value;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={aktif}
            onClick={() => onChange(k)}
            className={cx('cursor-pointer rounded-[9px] border-none px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap', aktif ? 'bg-white text-navy shadow-segment' : 'bg-transparent text-ink-slate')}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Formulir ---------- */

export const kelasInput = 'rounded-xl border border-line-input bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-primary';

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <label className={cx('flex flex-col gap-1.5 text-[13px] font-semibold text-ink-label', className)}>{label}{children}</label>;
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(kelasInput, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(kelasInput, 'resize-y', className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(kelasInput, 'py-[11px]', className)} {...rest} />;
}

/** Input nominal rupiah: menampilkan pemisah ribuan, menyimpan digit mentah. */
export function MoneyInput({ value, onChange, besar, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string; onChange: (digit: string) => void; besar?: boolean }) {
  const tampil = value ? Number(value).toLocaleString('id-ID') : '';
  return (
    <span className={cx('flex items-center border border-line-input focus-within:border-primary', besar ? 'rounded-[14px] pl-4' : 'rounded-xl pl-3.5')}>
      <span className={besar ? 'font-display text-[22px] text-ink-muted' : 'font-medium text-ink-muted'}>Rp</span>
      <input
        inputMode="numeric"
        placeholder="0"
        value={tampil}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className={cx(
          'min-w-0 flex-1 border-none bg-transparent text-ink outline-none',
          besar ? 'rounded-[14px] py-3 pr-4 pl-2.5 font-display text-[26px] font-bold text-navy' : 'rounded-xl py-3 pr-3.5 pl-2 text-sm',
        )}
        {...rest}
      />
    </span>
  );
}

/* ---------- Tabel grid ---------- */

/** Judul kolom; awali dengan `>` untuk rata kanan, mis. `'>Nominal'`. */
export function Tabel({ min, cols, kepala, children, className }: { min: number; cols: string; kepala: string[]; children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: min }} className={className}>
        <div className="grid gap-3 bg-surface-muted px-5 py-3 text-xs font-semibold text-ink-muted" style={{ gridTemplateColumns: cols }}>
          {kepala.map((h, i) => (
            <span key={i} className={h.startsWith('>') ? 'text-right' : undefined}>
              {h.replace(/^>/, '')}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export const kelasBaris = 'grid items-center gap-3 border-t border-line-soft px-5 text-[13px] text-ink-label';

/* ---------- Placeholder ilustrasi ---------- */

export function Ilustrasi({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('flex items-center justify-center font-mono text-[11px] text-ink-muted', className)}
      style={{ background: 'repeating-linear-gradient(135deg,#EEF2F8 0 9px,#F7F9FC 9px 18px)' }}
    >
      {label}
    </div>
  );
}
