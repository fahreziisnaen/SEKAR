import type { ReactNode } from 'react';
import { cx } from './ui';

/**
 * Tooltip bergaya SEKAR, pengganti atribut `title` bawaan browser. Muncul saat kursor di atas
 * atau saat elemen mendapat fokus keyboard. Teksnya disembunyikan dari pembaca layar karena
 * tombol yang dibungkus sudah punya `aria-label`.
 */
export function Tip({ label, children, posisi = 'atas', className }: { label: string; children: ReactNode; posisi?: 'atas' | 'bawah'; className?: string }) {
  return (
    <span className={cx('group/tip relative inline-flex', className)}>
      {children}
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-[0_10px_24px_-12px_rgba(18,38,74,.6)] transition duration-150 ease-out group-focus-within/tip:opacity-100 group-hover/tip:opacity-100',
          posisi === 'atas'
            ? 'bottom-full mb-2 translate-y-1 group-focus-within/tip:translate-y-0 group-hover/tip:translate-y-0'
            : 'top-full mt-2 -translate-y-1 group-focus-within/tip:translate-y-0 group-hover/tip:translate-y-0',
        )}
      >
        {label}
        <span className={cx('absolute left-1/2 -translate-x-1/2 border-4 border-transparent', posisi === 'atas' ? 'top-full border-t-navy' : 'bottom-full border-b-navy')} />
      </span>
    </span>
  );
}
