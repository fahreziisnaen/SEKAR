import { useState } from 'react';
import { Icon } from '../../components/icons';
import { useOverlays } from '../../components/Overlays';
import { Badge, Button, Card, Ilustrasi, Tabel, cx, kelasBaris } from '../../components/ui';
import { useIzin } from '../../hooks/queries';
import { formatTanggal, rupiah } from '../../lib/format';
import type { Transaksi } from '../../types';

type Filter = 'Semua' | 'Pemasukan' | 'Pengeluaran';

export function nominalBertanda(x: Transaksi) {
  return (x.jenis === 'masuk' ? '+ ' : '− ') + rupiah(x.nominal);
}

export function warnaJenis(x: Transaksi) {
  return x.jenis === 'masuk' ? { bg: '#E1F4EA', fg: '#157347' } : { bg: '#FDE7E7', fg: '#BE3530' };
}

/** Ikon jenis transaksi dalam kotak berwarna. */
export function IkonJenis({ x }: { x: Transaksi }) {
  const w = warnaJenis(x);
  return (
    <span className="flex size-[34px] flex-none items-center justify-center rounded-[10px]" style={{ background: w.bg, color: w.fg }}>
      <Icon name={x.jenis === 'masuk' ? 'up' : 'down'} size={16} strokeWidth={2.2} />
    </span>
  );
}

const KOLOM = '110px minmax(220px,2fr) 130px 130px 130px 150px';

/** Daftar transaksi event, terbaru di atas. `list` urut tanggal naik. */
export function DaftarTransaksi({ eventId, list }: { eventId: number; list: Transaksi[] }) {
  const { lihatTransaksi, tambahTransaksi } = useOverlays();
  const boleh = useIzin();
  const [filter, setFilter] = useState<Filter>('Semua');
  const terbaru = [...list].reverse();
  const nIn = list.filter((x) => x.jenis === 'masuk').length;
  const rows = terbaru.filter((x) => filter === 'Semua' || (filter === 'Pemasukan') === (x.jenis === 'masuk'));
  const jumlah: Record<Filter, number> = { Semua: list.length, Pemasukan: nIn, Pengeluaran: list.length - nIn };

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 pt-1.5">
        <div role="tablist" aria-label="Filter transaksi" className="flex gap-1">
          {(Object.keys(jumlah) as Filter[]).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={filter === l}
              onClick={() => setFilter(l)}
              className={cx(
                'cursor-pointer border-x-0 border-t-0 border-b-[3px] bg-transparent px-3 py-3.5 text-sm font-semibold',
                filter === l ? 'border-primary text-navy' : 'border-transparent text-ink-muted',
              )}
            >
              {l} <span className="font-medium text-ink-subtle">{jumlah[l]}</span>
            </button>
          ))}
        </div>
        <span className="py-2.5 text-xs text-ink-muted">Klik transaksi untuk melihat detail</span>
      </div>
      {rows.length > 0 ? (
        <>
          <div className="hidden lap:block">
            <Tabel min={860} cols={KOLOM} kepala={['Tanggal', 'Keterangan', 'Kategori', 'Jenis', 'Metode', '>Nominal']}>
              {rows.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => lihatTransaksi(x)}
                  className={cx(kelasBaris, 'w-full cursor-pointer border-x-0 border-b-0 bg-transparent py-3.5 text-left hover:bg-surface-hover')}
                  style={{ gridTemplateColumns: KOLOM }}
                >
                  <span className="text-ink-muted">{formatTanggal(x.tanggal)}</span>
                  <span className="font-semibold text-navy">{x.keterangan}</span>
                  <span>{x.kategori.nama}</span>
                  <span>
                    <Badge status={x.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'} />
                  </span>
                  <span>{x.metode.nama}</span>
                  <span className="text-right font-bold" style={{ color: warnaJenis(x).fg }}>
                    {nominalBertanda(x)}
                  </span>
                </button>
              ))}
            </Tabel>
          </div>
          <div className="lap:hidden">
            {rows.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => lihatTransaksi(x)}
                className="flex w-full cursor-pointer items-center gap-3 border-x-0 border-t border-b-0 border-line-soft bg-transparent px-[18px] py-3.5 text-left"
              >
                <IkonJenis x={x} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-navy">{x.keterangan}</span>
                  <span className="text-xs text-ink-muted">
                    {formatTanggal(x.tanggal)} · {x.kategori.nama}
                  </span>
                </span>
                <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: warnaJenis(x).fg }}>
                  {nominalBertanda(x)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3.5 px-6 py-[52px] text-center">
          <Ilustrasi label="ilustrasi: dompet" className="h-[100px] w-40 rounded-[18px]" />
          <div className="font-display text-[22px] font-bold text-navy">Belum ada transaksi</div>
          <div className="max-w-[420px] text-sm leading-[1.6] text-ink-slate">
            Catat pemasukan atau pengeluaran event untuk mulai melihat kondisi keuangan.
          </div>
          {boleh('tulisKeuangan') && (
            <Button onClick={() => tambahTransaksi(eventId)} className="px-[18px] py-[11px] text-sm">
              + Tambah Transaksi
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
