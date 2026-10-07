import { cx } from './ui';

/** Teks tombol selama unggah: persentase saat berkas dikirim, lalu "Memproses…" saat server menyimpan. */
export function labelUnggah(progres: number | null, diam: string, memproses = 'Menyimpan…'): string {
  if (progres === null) return diam;
  return progres < 100 ? `Mengunggah ${progres}%` : memproses;
}

/** Bilah progres unggah berkas (0–100). Tidak tampil bila `progres` null. */
export function ProgresUnggah({ progres, nama, className }: { progres: number | null; nama?: string; className?: string }) {
  if (progres === null) return null;
  const terkirim = progres >= 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progres}
      aria-label={nama ? `Unggah ${nama}` : 'Progres unggah'}
      className={cx('flex animate-fade-up-quick flex-col gap-1.5', className)}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-semibold text-navy">
          {terkirim ? 'Berkas terkirim, menyimpan…' : `Mengunggah${nama ? ` ${nama}` : ''}…`}
        </span>
        <span className="font-bold text-primary tabular-nums">{progres}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line-soft">
        <div className={cx('h-full rounded-full bg-primary transition-[width] duration-200 ease-out', terkirim && 'animate-pulse')} style={{ width: `${progres}%` }} />
      </div>
    </div>
  );
}
