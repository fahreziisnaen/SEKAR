import { useState } from 'react';
import { Drawer, TombolTutup } from '../../components/Modal';
import { Icon } from '../../components/icons';
import { useOverlays } from '../../components/Overlays';
import { Konfirmasi } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { IlustrasiBukti } from '../../components/IlustrasiKosong';
import { Button } from '../../components/ui';
import { useEvents, useHapusTransaksi, useIzin } from '../../hooks/queries';
import { downloadFile, errorMessage } from '../../lib/api';
import { formatTanggalPanjang, rupiah } from '../../lib/format';
import { warnaEkstensi } from '../../lib/warna';
import type { Transaksi } from '../../types';

const formatWaktu = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Bukti berupa dokumen (mis. PDF) yang tidak bisa dipratinjau sebagai gambar. */
function BerkasBukti({ nama, onUnduh }: { nama: string; onUnduh: () => void }) {
  const ext = (nama.split('.').pop() ?? 'pdf').toLowerCase();
  const [bg, fg] = warnaEkstensi(ext);
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface-muted p-4">
      <span className="flex h-[52px] w-[44px] flex-none items-end justify-center rounded-[10px] pb-2 font-mono text-[11px] font-bold" style={{ background: bg, color: fg }}>
        {ext.toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold text-navy">{nama}</span>
        <span className="text-xs text-ink-muted">Pratinjau tidak tersedia untuk jenis berkas ini.</span>
      </span>
      <Button variant="secondary" onClick={onUnduh} className="flex items-center gap-1.5 px-3 py-2 text-xs">
        <Icon name="download" size={14} />
        Unduh
      </Button>
    </div>
  );
}

export function TransaksiDrawer({ tx, onClose }: { tx: Transaksi; onClose: () => void }) {
  const events = useEvents();
  const boleh = useIzin();
  const hapus = useHapusTransaksi();
  const toast = useToast();
  const { lihatBukti } = useOverlays();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const masuk = tx.jenis === 'masuk';
  const pihak = tx.pihak ? `${tx.pihak}${tx.pihakKeterangan ? ` (${tx.pihakKeterangan})` : ''}` : null;
  const rows = (
    [
      ['No. Bukti', tx.nomorBukti],
      ['Kategori', tx.kategori.nama],
      ['Tanggal', formatTanggalPanjang(tx.tanggal)],
      ['Event', events.data?.find((e) => e.id === tx.eventId)?.nama ?? '-'],
      [masuk ? 'Diterima dari' : 'Dibayarkan kepada', pihak],
      ['Deskripsi', tx.keterangan],
      ['Metode pembayaran', tx.metode.nama],
      ['Bank', tx.bank],
      ['Nomor rekening', tx.nomorRekening],
      ['Nomor referensi', tx.nomorReferensi],
      ['Dibuat oleh', tx.dibuatOleh.nama],
      ['Waktu dibuat', formatWaktu.format(new Date(tx.dibuatPada))],
      ['Catatan', tx.catatan || '-'],
    ] as [string, string | null][]
  ).filter((r): r is [string, string] => Boolean(r[1]));
  const unduh = () => downloadFile(`/transaksi/${tx.id}/bukti`).catch((e) => toast(errorMessage(e)));

  return (
    <Drawer title="Detail transaksi" onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-[13px] font-bold tracking-[.06em] text-ink-muted">DETAIL TRANSAKSI</span>
        <TombolTutup onClick={onClose} />
      </div>
      <div className={`mx-6 flex flex-col gap-2.5 rounded-[20px] p-[26px] ${masuk ? 'bg-success-bg text-success-ink' : 'bg-danger-bg text-danger-ink'}`}>
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <Icon name={masuk ? 'up' : 'down'} size={16} strokeWidth={2.4} />
          {masuk ? 'Pemasukan · Income' : 'Pengeluaran · Expense'}
        </span>
        <span className="font-display text-4xl font-bold tracking-[-.02em]">{rupiah(tx.nominal)}</span>
      </div>
      {masuk && (
        <div className="mx-6 mt-3">
          <Button onClick={() => lihatBukti(tx)} className="w-full px-4 py-[11px] text-sm">
            Lihat Bukti Penerimaan
          </Button>
        </div>
      )}
      <dl className="m-0 flex flex-col px-6 py-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line-soft py-[13px] text-[13px]">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="m-0 text-right font-semibold text-navy">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2.5 px-6 pb-7">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-navy">Bukti transaksi</span>
          {tx.bukti && (
            <button type="button" onClick={unduh} className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-primary">
              Unduh
            </button>
          )}
        </div>
        {tx.bukti?.gambar ? (
          <img
            src={`/api/transaksi/${tx.id}/bukti?inline=1`}
            alt={`Bukti ${tx.keterangan}`}
            loading="lazy"
            decoding="async"
            className="max-h-[320px] w-full rounded-2xl border border-line object-contain"
          />
        ) : tx.bukti ? (
          <BerkasBukti nama={tx.bukti.nama} onUnduh={unduh} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-dash bg-surface-muted px-5 py-6 text-center">
            <IlustrasiBukti className="w-[150px]" />
            <span className="text-[13px] font-bold text-navy">Belum ada bukti transaksi</span>
            <span className="max-w-[280px] text-xs leading-normal text-ink-muted">Transaksi ini dicatat tanpa foto nota atau bukti transfer.</span>
          </div>
        )}
        {boleh('tulisKeuangan') && (
          <Button variant="secondary" onClick={() => setKonfirmasi(true)} className="mt-3 self-start border-danger-dash px-4 py-2.5 text-[13px] text-danger-ink hover:border-danger">
            Hapus transaksi
          </Button>
        )}
      </div>
      {konfirmasi && (
        <Konfirmasi
          judul="Hapus transaksi?"
          pesan={
            <>
              Transaksi <b>{tx.keterangan}</b> sebesar {rupiah(tx.nominal)} beserta buktinya akan dihapus permanen.
            </>
          }
          label="Hapus"
          memproses={hapus.isPending}
          galat={hapus.error}
          onBatal={() => setKonfirmasi(false)}
          onKonfirmasi={() =>
            hapus.mutate(tx.id, {
              onSuccess: () => {
                toast('Transaksi dihapus');
                onClose();
              },
            })
          }
        />
      )}
    </Drawer>
  );
}
