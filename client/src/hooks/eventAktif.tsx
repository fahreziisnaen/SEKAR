import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { EventRingkas } from '../types';
import { useEvents, useHariIni } from './queries';

const KUNCI = 'sekar:event-aktif';

interface EventAktif {
  /** Event yang dipilih di header; null bila belum ada event sama sekali. */
  event: EventRingkas | null;
  pilih: (id: number) => void;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

const Ctx = createContext<EventAktif | null>(null);

// Preferensi tampilan per browser saja (bukan data) — aman bila penyimpanan tidak tersedia.
function bacaPilihan(): number | null {
  try {
    const v = Number(localStorage.getItem(KUNCI));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function simpanPilihan(id: number) {
  try {
    localStorage.setItem(KUNCI, String(id));
  } catch {
    /* abaikan */
  }
}

/** Bawaan: event yang sedang berlangsung, lalu event terdekat yang akan datang, lalu yang terbaru. */
export function eventBawaan(events: EventRingkas[], hari: string): EventRingkas | null {
  const aktif = events.filter((e) => e.status !== 'dibatalkan');
  return (
    aktif.find((e) => e.status === 'berlangsung') ??
    [...aktif].filter((e) => e.tanggal >= hari && e.status !== 'selesai').sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0] ??
    events[0] ??
    null
  );
}

export function EventAktifProvider({ children }: { children: ReactNode }) {
  const q = useEvents();
  const hari = useHariIni();
  const [pilihan, setPilihan] = useState<number | null>(bacaPilihan);

  const pilih = useCallback((id: number) => {
    setPilihan(id);
    simpanPilihan(id);
  }, []);

  const value = useMemo<EventAktif>(() => {
    const events = q.data ?? [];
    const event = events.find((e) => e.id === pilihan) ?? eventBawaan(events, hari);
    return { event, pilih, isPending: q.isPending, isError: q.isError, refetch: () => void q.refetch() };
  }, [q, pilihan, hari, pilih]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEventAktif(): EventAktif {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEventAktif harus dipakai di dalam <EventAktifProvider>');
  return v;
}
