import type { ReactNode } from 'react';
import { errorMessage } from '../lib/api';
import { KerangkaKonten, KerangkaStatus, type VarianKerangka } from './Kerangka';
import { warnaBadge } from '../lib/warna';
import { Modal, TombolTutup } from './Modal';
import { Badge, Button, cx } from './ui';

/** Tempat data yang sedang dimuat, berupa kerangka (skeleton) sesuai bentuk kontennya. */
export function Memuat({ label = 'Memuat…', className, varian = 'blok', baris }: { label?: string; className?: string; varian?: VarianKerangka; baris?: number }) {
  return (
    <KerangkaStatus label={label} className={cx(varian === 'tabel' ? 'py-1' : varian === 'blok' ? 'p-5' : '', className)}>
      <KerangkaKonten varian={varian} baris={baris} />
    </KerangkaStatus>
  );
}

export function GagalMemuat({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center gap-3 rounded-[20px] border border-line bg-white px-6 py-12 text-center', className)}>
      <div className="font-display text-xl font-bold text-navy">Data tidak dapat dimuat</div>
      <div className="max-w-[420px] text-sm text-ink-slate">{errorMessage(error)}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="px-4 py-2.5 text-[13px]">
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function PesanGalat({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-xl bg-danger-bg px-3.5 py-[11px] text-[13px] font-medium text-danger-ink">
      {children}
    </div>
  );
}

interface KonfirmasiProps {
  judul: string;
  pesan: ReactNode;
  label: string;
  onKonfirmasi: () => void;
  onBatal: () => void;
  memproses?: boolean;
  galat?: unknown;
}

/** Dialog konfirmasi untuk tindakan yang tidak bisa dibatalkan (hapus). */
export function Konfirmasi({ judul, pesan, label, onKonfirmasi, onBatal, memproses, galat }: KonfirmasiProps) {
  return (
    <Modal onClose={onBatal} className="max-w-[440px] rounded-3xl p-[26px]">
      {(titleId) => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              {judul}
            </div>
            <TombolTutup onClick={onBatal} />
          </div>
          <div className="text-sm leading-[1.6] text-ink-body">{pesan}</div>
          {galat ? <PesanGalat>{errorMessage(galat)}</PesanGalat> : null}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onBatal} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button onClick={onKonfirmasi} disabled={memproses} className="bg-danger px-5 py-[11px] text-sm hover:bg-danger-ink disabled:opacity-60">
              {memproses ? 'Memproses…' : label}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Badge yang sekaligus menjadi pilihan status: tampilannya badge, interaksinya `<select>` asli
 * (keyboard & pembaca layar tetap berfungsi).
 */
export function BadgePilihan<K extends string>({
  value,
  label,
  pilihan,
  onChange,
  disabled,
  size = 'lg',
  aria,
}: {
  value: K;
  label: string;
  pilihan: Record<K, string>;
  onChange: (v: K) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  aria: string;
}) {
  if (disabled) return <Badge status={label} size={size} />;
  return (
    <span className="relative inline-flex items-center">
      <Badge status={`${label} ▾`} warna={warnaBadge(label)} size={size} className="pointer-events-none" />
      <select
        aria-label={aria}
        value={value}
        onChange={(e) => onChange(e.target.value as K)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {(Object.keys(pilihan) as K[]).map((k) => (
          <option key={k} value={k}>
            {pilihan[k]}
          </option>
        ))}
      </select>
    </span>
  );
}
