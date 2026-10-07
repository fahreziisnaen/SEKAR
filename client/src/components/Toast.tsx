import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface AksiToast {
  label: string;
  onClick: () => void;
}

type Tampil = (pesan: string, aksi?: AksiToast) => void;

const ToastContext = createContext<Tampil>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ pesan: string; aksi?: AksiToast } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const tampil = useCallback<Tampil>((pesan, aksi) => {
    setToast({ pesan, aksi });
    clearTimeout(timer.current);
    // Toast beraksi diberi waktu lebih lama agar sempat diklik.
    timer.current = setTimeout(() => setToast(null), aksi ? 8000 : 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={tampil}>
      {children}
      <div role="status" aria-live="polite" className="print:hidden">
        {toast && (
          <div className="fixed bottom-7 left-1/2 z-60 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-navy px-5 py-[13px] text-sm font-semibold text-white shadow-[0_20px_40px_-16px_rgba(15,30,58,.6)]">
            <span className="size-2 flex-none rounded-full bg-accent" />
            {toast.pesan}
            {toast.aksi && (
              <button
                type="button"
                onClick={() => {
                  toast.aksi!.onClick();
                  setToast(null);
                }}
                className="ml-1.5 cursor-pointer rounded-lg border-none bg-accent px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-navy hover:bg-accent-hover"
              >
                {toast.aksi.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
