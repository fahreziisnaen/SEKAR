import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { BuktiPenerimaanModal } from '../features/bukti/BuktiPenerimaanModal';
import { UnggahModal } from '../features/dokumen/UnggahModal';
import { TransaksiDrawer } from '../features/transaksi/TransaksiDrawer';
import { TransaksiModal } from '../features/transaksi/TransaksiModal';
import type { Transaksi } from '../types';

interface Overlays {
  /** Buka formulir transaksi baru untuk event tertentu. */
  tambahTransaksi: (eventId: number) => void;
  lihatTransaksi: (tx: Transaksi) => void;
  unggahDokumen: (eventId: number) => void;
  /** Pratinjau Bukti Penerimaan Dana untuk transaksi pemasukan. */
  lihatBukti: (tx: Transaksi) => void;
}

const OverlayContext = createContext<Overlays | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [txBaru, setTxBaru] = useState<number | null>(null);
  const [txDetail, setTxDetail] = useState<Transaksi | null>(null);
  const [unggah, setUnggah] = useState<number | null>(null);
  const [bukti, setBukti] = useState<Transaksi | null>(null);

  const api = useMemo<Overlays>(() => ({ tambahTransaksi: setTxBaru, lihatTransaksi: setTxDetail, unggahDokumen: setUnggah, lihatBukti: setBukti }), []);

  return (
    <OverlayContext.Provider value={api}>
      {children}
      {txBaru !== null && <TransaksiModal eventId={txBaru} onClose={() => setTxBaru(null)} />}
      {txDetail && <TransaksiDrawer tx={txDetail} onClose={() => setTxDetail(null)} />}
      {unggah !== null && <UnggahModal eventId={unggah} onClose={() => setUnggah(null)} />}
      {bukti && <BuktiPenerimaanModal tx={bukti} onClose={() => setBukti(null)} />}
    </OverlayContext.Provider>
  );
}

export function useOverlays(): Overlays {
  const v = useContext(OverlayContext);
  if (!v) throw new Error('useOverlays harus dipakai di dalam <OverlayProvider>');
  return v;
}
