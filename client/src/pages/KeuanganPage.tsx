import { useSearchParams } from 'react-router';
import { useOverlays } from '../components/Overlays';
import { GagalMemuat, Memuat } from '../components/Status';
import { Button, PageTitle, SegmentedTabs } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useEventDetail, useIzin, useTransaksi } from '../hooks/queries';
import { ringkas } from '../lib/keuangan';
import { DaftarTransaksi } from '../features/keuangan/DaftarTransaksi';
import { KartuKeuangan } from '../features/keuangan/KartuKeuangan';
import { RingkasanKeuangan } from '../features/keuangan/RingkasanKeuangan';

type Tab = 'transaksi' | 'ringkasan';

export function KeuanganPage() {
  const { event } = useEventAktif();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'ringkasan' ? 'ringkasan' : 'transaksi';
  const { tambahTransaksi } = useOverlays();
  const boleh = useIzin();
  const detail = useEventDetail(event?.id);
  const tx = useTransaksi(event?.id);
  if (!event) return null;
  const r = ringkas(tx.data ?? []);

  return (
    <>
      <div className="animate-fade-up">
        <PageTitle
          title="Keuangan"
          sub={
            <>
              Catat dan pantau seluruh transaksi setiap event. Menampilkan <b className="text-navy">{event.nama}</b>.
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedTabs<Tab>
              label="Tampilan keuangan"
              items={[
                ['transaksi', 'Transaksi'],
                ['ringkasan', 'Ringkasan Keuangan'],
              ]}
              value={tab}
              onChange={(k) => setParams(k === 'transaksi' ? {} : { tab: k }, { replace: true })}
            />
            {boleh('tulisKeuangan') && (
              <Button onClick={() => tambahTransaksi(event.id)} className="px-[18px] py-3 text-sm shadow-primary">
                + Tambah Transaksi
              </Button>
            )}
          </div>
        </PageTitle>
      </div>
      <KartuKeuangan total={event} list={tx.data} />
      {tx.isPending ? (
        <Memuat varian="tabel" baris={6} className="rounded-[20px] border border-line bg-white" />
      ) : tx.isError ? (
        <GagalMemuat error={tx.error} onRetry={() => void tx.refetch()} />
      ) : tab === 'ringkasan' ? (
        r.list.length > 0 && detail.data ? (
          <RingkasanKeuangan event={detail.data} list={r.list} />
        ) : (
          r.list.length > 0 && <Memuat varian="kartu" baris={2} />
        )
      ) : (
        <DaftarTransaksi key={event.id} eventId={event.id} list={r.list} />
      )}
    </>
  );
}
