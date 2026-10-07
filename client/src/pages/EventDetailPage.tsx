import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Icon, type NamaIkon } from '../components/icons';
import { useOverlays } from '../components/Overlays';
import { GagalMemuat, Memuat } from '../components/Status';
import { Badge, Button, Card, Progress, cx } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useEventDetail, useIzin, useTransaksi } from '../hooks/queries';
import { InisialEvent, useWarnaEvent } from '../layout/AppShell';
import { ApiError } from '../lib/api';
import { formatTanggalPanjang } from '../lib/format';
import { ringkas } from '../lib/keuangan';
import { LABEL_STATUS_EVENT } from '../lib/label';
import type { EventDetail } from '../types';
import { DokumenEvent, KebutuhanEvent, PesertaEvent, TimEvent, VendorEvent } from '../features/administrasi/Seksi';
import { EventFormModal } from '../features/event/EventFormModal';
import { EventOverview } from '../features/event/EventOverview';
import { DaftarTransaksi } from '../features/keuangan/DaftarTransaksi';
import { KartuKeuangan } from '../features/keuangan/KartuKeuangan';
import { RingkasanKeuangan } from '../features/keuangan/RingkasanKeuangan';
import { LaporanKeuangan } from '../features/laporan/Seksi';

const TAB = [
  ['overview', 'Overview'],
  ['keuangan', 'Keuangan'],
  ['administrasi', 'Administrasi'],
  ['peserta', 'Peserta'],
  ['vendor', 'Vendor'],
  ['dokumen', 'Dokumen'],
  ['laporan', 'Laporan'],
] as const;

type Tab = (typeof TAB)[number][0];

function Meta({ icon, children }: { icon: NamaIkon; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon name={icon} size={15} stroke="#7A869A" />
      {children}
    </span>
  );
}

/** Tab keuangan & laporan memuat seluruh transaksi event. */
function KeuanganEvent({ event: e, laporan }: { event: EventDetail; laporan: boolean }) {
  const tx = useTransaksi(e.id);
  if (tx.isPending) return <Memuat />;
  if (tx.isError) return <GagalMemuat error={tx.error} onRetry={() => void tx.refetch()} />;
  const r = ringkas(tx.data);
  if (laporan) return <LaporanKeuangan event={e} r={r} jenis="keuangan" />;
  return (
    <>
      <KartuKeuangan total={e} list={r.list} />
      {r.list.length > 0 && <RingkasanKeuangan event={e} list={r.list} />}
      <DaftarTransaksi eventId={e.id} list={r.list} />
    </>
  );
}

function DetailEvent({ event: e, tab }: { event: EventDetail; tab: Tab }) {
  const { tambahTransaksi } = useOverlays();
  const boleh = useIzin();
  const warna = useWarnaEvent();
  const [ubah, setUbah] = useState(false);
  const sisa = e.tugasTotal - e.tugasSelesai;
  const lokasi = [e.venue, e.lokasi].filter(Boolean).join(', ');

  return (
    <>
      <div className="flex animate-fade-up flex-col print:hidden">
        <div className="relative overflow-hidden rounded-t-3xl border border-line bg-white px-5 pt-7 shadow-[0_1px_2px_rgba(18,38,74,.04)] sm:px-7">
          <div className="absolute -top-[70px] -right-[50px] size-[200px] rounded-full bg-accent-bg" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-[1_1_460px] items-start gap-[18px]">
              <InisialEvent nama={e.nama} warna={warna(e.id)} className="size-16 rounded-[20px] font-display text-[22px]" />
              <div className="flex min-w-0 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="m-0 font-display text-[30px] font-bold tracking-[-.02em] text-navy">{e.nama}</h1>
                  <Badge status={LABEL_STATUS_EVENT[e.status]} className="px-3 py-[5px] font-bold" />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-body">
                  <Meta icon="cal">{formatTanggalPanjang(e.tanggal) + (e.waktu ? ` · ${e.waktu}` : '')}</Meta>
                  <Meta icon="pin">{lokasi}</Meta>
                  <Meta icon="user">{`PIC ${e.pic.nama}`}</Meta>
                </div>
                <div className="max-w-[640px] text-sm leading-[1.6] text-pretty text-ink-slate">{e.deskripsi || '-'}</div>
              </div>
            </div>
            <div className="flex min-w-[240px] flex-col items-stretch gap-3.5 max-sm:w-full">
              <div className="flex justify-end gap-2.5">
                {boleh('tulisEvent') && (
                  <Button variant="secondary" onClick={() => setUbah(true)} className="px-4 py-2.5 text-[13px]">
                    Ubah Event
                  </Button>
                )}
                {boleh('tulisKeuangan') && (
                  <Button onClick={() => tambahTransaksi(e.id)} className="px-4 py-2.5 text-[13px]">
                    + Tambah Transaksi
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-[14px] bg-surface-soft px-4 py-3.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold tracking-[.04em] text-ink-muted">PROGRES EVENT</span>
                  <span className="font-bold text-navy">{e.progress}%</span>
                </div>
                <Progress value={e.progress} track="#E3E8F0" className="h-2" label="Progres event" />
                <div className="text-xs text-ink-muted">{sisa} kebutuhan belum selesai</div>
              </div>
            </div>
          </div>
          <nav aria-label="Bagian event" className="relative mt-[22px] flex flex-wrap gap-1">
            {TAB.map(([k, l]) => {
              const on = k === tab;
              return (
                <Link
                  key={k}
                  to={k === 'overview' ? `/event/${e.id}` : `/event/${e.id}/${k}`}
                  aria-current={on ? 'page' : undefined}
                  className={cx(
                    'border-b-[3px] px-4 py-3 text-sm whitespace-nowrap hover:text-navy',
                    on ? 'border-accent font-bold text-navy' : 'border-transparent font-medium text-ink-muted',
                  )}
                >
                  {l}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mb-6 h-px bg-line" />
      </div>

      {tab === 'overview' && <EventOverview event={e} />}
      {tab === 'keuangan' && <KeuanganEvent event={e} laporan={false} />}
      {tab === 'administrasi' && (
        <>
          <KebutuhanEvent eventId={e.id} />
          <TimEvent event={e} />
        </>
      )}
      {tab === 'peserta' && <PesertaEvent eventId={e.id} />}
      {tab === 'vendor' && <VendorEvent eventId={e.id} />}
      {tab === 'dokumen' && <DokumenEvent eventId={e.id} />}
      {tab === 'laporan' && <KeuanganEvent event={e} laporan />}
      {ubah && <EventFormModal event={e} onClose={() => setUbah(false)} />}
    </>
  );
}

export function EventDetailPage() {
  const params = useParams();
  const id = Number(params.eventId);
  const tab = params.tab ?? 'overview';
  const q = useEventDetail(Number.isInteger(id) && id > 0 ? id : undefined);
  const { event: aktif, pilih } = useEventAktif();

  // Event yang dibuka menjadi event aktif di header.
  useEffect(() => {
    if (q.data && aktif?.id !== q.data.id) pilih(q.data.id);
  }, [q.data, aktif?.id, pilih]);

  if (!TAB.some(([k]) => k === tab)) return <Navigate to={`/event/${params.eventId}`} replace />;
  if (q.isPending && q.fetchStatus !== 'idle') return <Memuat />;
  if (q.isError && !(q.error instanceof ApiError && q.error.status === 404)) return <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data)
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="font-display text-[26px] font-bold text-navy">Event tidak ditemukan</div>
        <div className="text-sm text-ink-slate">Event ini mungkin sudah dihapus atau tautannya salah.</div>
        <Link to="/event" className="text-sm font-semibold">
          ← Kembali ke daftar event
        </Link>
      </Card>
    );
  return <DetailEvent event={q.data} tab={tab as Tab} />;
}
