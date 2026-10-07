import { useSearchParams } from 'react-router';
import { GagalMemuat, Memuat } from '../components/Status';
import { PageTitle, SegmentedTabs } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useEventDetail } from '../hooks/queries';
import { DokumenEvent, KebutuhanEvent, PesertaEvent, TimEvent, VendorEvent } from '../features/administrasi/Seksi';

type Tab = 'dokumen' | 'peserta' | 'vendor' | 'tim' | 'kebutuhan';

const TAB: [Tab, string][] = [
  ['dokumen', 'Dokumen'],
  ['peserta', 'Peserta'],
  ['vendor', 'Vendor'],
  ['tim', 'PIC / Tim'],
  ['kebutuhan', 'Kebutuhan Event'],
];

export function AdministrasiPage() {
  const { event } = useEventAktif();
  const [params, setParams] = useSearchParams();
  const diminta = params.get('tab');
  const tab: Tab = TAB.find(([k]) => k === diminta)?.[0] ?? 'dokumen';
  const detail = useEventDetail(tab === 'tim' ? event?.id : undefined);
  if (!event) return null;

  return (
    <>
      <div className="animate-fade-up">
        <PageTitle
          title="Administrasi"
          sub={
            <>
              Dokumen, peserta, vendor, dan tim untuk <b className="text-navy">{event.nama}</b>.
            </>
          }
        >
          <SegmentedTabs<Tab> label="Bagian administrasi" items={TAB} value={tab} onChange={(k) => setParams(k === 'dokumen' ? {} : { tab: k }, { replace: true })} className="flex-wrap" />
        </PageTitle>
      </div>
      {tab === 'dokumen' && <DokumenEvent eventId={event.id} />}
      {tab === 'peserta' && <PesertaEvent eventId={event.id} />}
      {tab === 'vendor' && <VendorEvent eventId={event.id} />}
      {tab === 'tim' &&
        (detail.data ? <TimEvent event={detail.data} /> : detail.isError ? <GagalMemuat error={detail.error} onRetry={() => void detail.refetch()} /> : <Memuat />)}
      {tab === 'kebutuhan' && <KebutuhanEvent eventId={event.id} />}
    </>
  );
}
