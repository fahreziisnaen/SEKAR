import { Icon, type NamaIkon } from '../../components/icons';
import { Card } from '../../components/ui';
import { rupiah } from '../../lib/format';
import { margin } from '../../lib/keuangan';
import type { Transaksi } from '../../types';

export interface KartuNilai {
  label: string;
  value: string;
  note: string;
  icon: NamaIkon;
  bg: string;
  fg: string;
  /** Warna angka. */
  vc: string;
}

export function labelLabaRugi(saldo: number) {
  return saldo < 0 ? 'Kerugian' : 'Keuntungan';
}

export interface Total {
  masuk: number;
  keluar: number;
}

export function kartuKeuangan({ masuk, keluar }: Total, list?: Transaksi[]): KartuNilai[] {
  const saldo = masuk - keluar;
  const nIn = list?.filter((x) => x.jenis === 'masuk').length;
  const nOut = list ? list.length - (nIn ?? 0) : undefined;
  return [
    { label: 'Total Pemasukan', value: rupiah(masuk), note: nIn === undefined ? '' : `${nIn} transaksi masuk`, icon: 'up', bg: '#E1F4EA', fg: '#1E9E63', vc: '#157347' },
    { label: 'Total Pengeluaran', value: rupiah(keluar), note: nOut === undefined ? '' : `${nOut} transaksi keluar`, icon: 'down', bg: '#FDE7E7', fg: '#D93A35', vc: '#BE3530' },
    { label: 'Saldo', value: rupiah(saldo), note: 'Pemasukan dikurangi pengeluaran', icon: 'wallet', bg: '#E4EDFF', fg: '#2F6FED', vc: '#1F5BD6' },
    {
      label: labelLabaRugi(saldo),
      value: rupiah(Math.abs(saldo)),
      note: `Margin ${margin({ masuk, saldo })}%`,
      icon: 'trend',
      bg: '#FFF4D1',
      fg: '#B88600',
      vc: saldo < 0 ? '#D93A35' : '#12264A',
    },
  ];
}

export function IkonKotak({ k, size, radius, iconSize }: { k: Pick<KartuNilai, 'icon' | 'bg' | 'fg'>; size: number; radius: number; iconSize: number }) {
  return (
    <span className="flex flex-none items-center justify-center" style={{ width: size, height: size, borderRadius: radius, background: k.bg, color: k.fg }}>
      <Icon name={k.icon} size={iconSize} strokeWidth={2.2} />
    </span>
  );
}

export function KartuKeuangan({ total, list }: { total: Total; list?: Transaksi[] }) {
  return (
    <div className="grid animate-fade-up grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      {kartuKeuangan(total, list).map((k) => (
        <Card key={k.label} className="flex flex-col gap-3.5 p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-slate">{k.label}</span>
            <IkonKotak k={k} size={34} radius={11} iconSize={17} />
          </div>
          <span className="font-display text-[26px] font-bold tracking-[-.01em] whitespace-nowrap" style={{ color: k.vc }}>
            {k.value}
          </span>
          <span className="min-h-[15px] text-xs text-ink-subtle">{k.note}</span>
        </Card>
      ))}
    </div>
  );
}
