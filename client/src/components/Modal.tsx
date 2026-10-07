import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './ui';

function useTutupDenganEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

/** Pindahkan fokus ke dialog saat dibuka, kembalikan ke pemicu saat ditutup. */
function useFokusDialog() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null;
    const pertama =
      ref.current?.querySelector<HTMLElement>('input:not([type=file]), select, textarea') ?? ref.current?.querySelector<HTMLElement>('button');
    (pertama ?? ref.current)?.focus();
    return () => sebelumnya?.focus?.();
  }, []);
  return ref;
}

export function TombolTutup({ onClick, label = 'Tutup' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="size-9 flex-none cursor-pointer rounded-[10px] border border-line-ctl bg-white text-lg text-ink-body"
    >
      ×
    </button>
  );
}

interface ModalProps {
  onClose: () => void;
  children: (titleId: string) => ReactNode;
  /** `top`: panel menempel ke atas dan halaman bisa digulir (formulir panjang). */
  align?: 'top' | 'center';
  className?: string;
  /** Kelas z-index; naikkan bila modal dibuka dari atas panel lain (Drawer memakai z-51). */
  lapisan?: string;
}

export function Modal({ onClose, children, align = 'center', className, lapisan = 'z-50' }: ModalProps) {
  const titleId = useId();
  const ref = useFokusDialog();
  useTutupDenganEscape(onClose);
  return (
    <div
      className={cx(
        'fixed inset-0 flex justify-center bg-[rgba(15,30,58,.45)] backdrop-blur-[3px] print:hidden',
        lapisan,
        align === 'top' ? 'items-start overflow-y-auto px-4 py-10' : 'items-center p-4',
      )}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cx('w-full animate-fade-up-fast bg-white outline-none', className)}>
        {children(titleId)}
      </div>
    </div>
  );
}

/** Panel geser dari kanan. */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useFokusDialog();
  useTutupDenganEscape(onClose);
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-[rgba(15,30,58,.35)] print:hidden" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="fixed top-0 right-0 bottom-0 z-51 flex w-[min(440px,100%)] animate-fade-up-fast flex-col overflow-y-auto bg-white shadow-[-30px_0_60px_-30px_rgba(15,30,58,.4)] outline-none print:hidden"
      >
        {children}
      </div>
    </>
  );
}
