import type { CSSProperties } from 'react';
import { cx } from './ui';

/**
 * Kerangka (skeleton): blok abu-abu berkilau sebagai tempat data yang sedang dimuat, sehingga
 * tata letak tidak "melompat" saat data datang.
 */
export function Kerangka({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        'block animate-kerangka bg-[linear-gradient(90deg,#E9EDF4_0%,#F5F7FB_50%,#E9EDF4_100%)] bg-[length:200%_100%]',
        // Sudut bawaan hanya bila pemanggil tidak menentukan sendiri (dua kelas rounded saling menimpa).
        !/rounded/.test(className ?? '') && 'rounded-md',
        className,
      )}
    />
  );
}

/** Pembungkus kerangka yang diumumkan ke pembaca layar sebagai status memuat. */
export function KerangkaStatus({ label = 'Memuat…', className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function KartuKerangka({ className }: { className?: string }) {
  return (
    <div className={cx('flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5', className)}>
      <Kerangka className="size-10 rounded-xl" />
      <Kerangka className="h-3 w-24" />
      <Kerangka className="h-6 w-36" />
      <Kerangka className="h-2.5 w-28" />
    </div>
  );
}

function BarisKerangka({ kolom = 5 }: { kolom?: number }) {
  return (
    <div className="flex items-center gap-4 border-t border-line-soft px-5 py-4">
      <Kerangka className="size-8 flex-none rounded-full" />
      <Kerangka className="h-3.5 flex-[2]" />
      {Array.from({ length: kolom - 2 }, (_, i) => (
        <Kerangka key={i} className="h-3.5 flex-1 max-sm:hidden" />
      ))}
      <Kerangka className="h-3.5 w-20 flex-none" />
    </div>
  );
}

export type VarianKerangka = 'blok' | 'tabel' | 'kartu' | 'halaman' | 'detail';

/** Kerangka siap pakai sesuai bentuk konten yang sedang dimuat. */
export function KerangkaKonten({ varian = 'blok', baris = 4 }: { varian?: VarianKerangka; baris?: number }) {
  if (varian === 'tabel')
    return (
      <div className="overflow-hidden">
        {Array.from({ length: baris }, (_, i) => (
          <BarisKerangka key={i} />
        ))}
      </div>
    );
  if (varian === 'kartu')
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {Array.from({ length: baris }, (_, i) => (
          <KartuKerangka key={i} />
        ))}
      </div>
    );
  if (varian === 'detail')
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <Kerangka className="size-16 flex-none rounded-[20px]" />
            <div className="flex flex-1 flex-col gap-3">
              <Kerangka className="h-7 w-2/3 max-w-[360px]" />
              <Kerangka className="h-3.5 w-1/2 max-w-[300px]" />
              <Kerangka className="h-3.5 w-5/6 max-w-[520px]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Kerangka key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <KerangkaKonten varian="kartu" />
      </div>
    );
  if (varian === 'halaman')
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <Kerangka className="h-8 w-48" />
          <Kerangka className="h-3.5 w-72 max-w-full" />
        </div>
        <KerangkaKonten varian="kartu" />
        <div className="rounded-[20px] border border-line bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <Kerangka className="h-4 w-40" />
            <Kerangka className="h-8 w-28 rounded-lg" />
          </div>
          <KerangkaKonten varian="tabel" baris={5} />
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-3 py-2">
      <Kerangka className="h-4 w-1/3" />
      {Array.from({ length: baris }, (_, i) => (
        <Kerangka key={i} className={cx('h-3.5', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Kerangka seluruh aplikasi (sidebar + header + konten) saat sesi sedang diperiksa. */
export function KerangkaAplikasi() {
  return (
    <KerangkaStatus label="Memuat aplikasi…" className="flex min-h-screen bg-canvas">
      <div className="hidden w-[236px] flex-none flex-col gap-3 bg-navy px-5 pt-7 lap:flex">
        <span className="mb-5 block h-10 w-32 rounded-xl bg-white/10" />
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="block h-9 animate-pulse rounded-xl bg-white/[.07]" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[68px] items-center gap-4 border-b border-line bg-white px-4 lap:px-7">
          <Kerangka className="h-4 w-28" />
          <span className="flex-1" />
          <Kerangka className="h-10 w-48 rounded-xl max-sm:w-28" />
          <Kerangka className="size-10 rounded-xl" />
        </div>
        <div className="px-4 py-6 lap:px-7 lap:py-7">
          <KerangkaKonten varian="halaman" />
        </div>
      </div>
    </KerangkaStatus>
  );
}
