import { Link, useNavigate, useSearchParams } from 'react-router';
import { Icon } from '../components/icons';
import { Badge, Button, Card, PageTitle, Progress, cx } from '../components/ui';
import { useEvents, useIzin, useOrganisasiPublik } from '../hooks/queries';
import { InisialEvent, useWarnaEvent } from '../layout/AppShell';
import { formatTanggal, rupiah, rupiahBertanda } from '../lib/format';
import { LABEL_STATUS_EVENT, STATUS_EVENT } from '../lib/label';
import type { EventRingkas, StatusEvent } from '../types';

const KOLOM = 'minmax(240px,2.2fr) 120px 100px 130px 120px 130px 130px 130px 28px';
type Filter = 'semua' | StatusEvent;
const FILTER: Filter[] = ['semua', ...STATUS_EVENT];
const labelFilter = (f: Filter) => (f === 'semua' ? 'Semua' : LABEL_STATUS_EVENT[f]);

export function EventListPage() {
  const events = useEvents().data ?? [];
  const boleh = useIzin();
  const org = useOrganisasiPublik().data;
  const warna = useWarnaEvent();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter: Filter = FILTER.find((f) => f === params.get('status')) ?? 'semua';
  const q = params.get('q') ?? '';

  const ubahParam = (k: string, v: string, bawaan: string) =>
    setParams(
      (p) => {
        if (v === bawaan) p.delete(k);
        else p.set(k, v);
        return p;
      },
      { replace: true },
    );

  const cari = q.trim().toLowerCase();
  const rows = events
    .filter((e) => filter === 'semua' || e.status === filter)
    .filter((e) => !cari || [e.nama, e.lokasi, e.venue, e.pic.nama].join(' ').toLowerCase().includes(cari));

  const nilai = (e: EventRingkas) => {
    const ada = e.jumlahTransaksi > 0;
    const saldo = e.masuk - e.keluar;
    return {
      inF: ada ? rupiah(e.masuk) : '—',
      outF: ada ? rupiah(e.keluar) : '—',
      pF: ada ? rupiahBertanda(saldo) : '—',
      pColor: !ada ? '#9AA6BA' : saldo < 0 ? '#D93A35' : '#157347',
    };
  };

  return (
    <div className="flex animate-fade-up flex-col gap-[22px]">
      <PageTitle title="Event" sub={`Kelola seluruh event${org?.nama ? ` ${org.nama}` : ''}`}>
        {boleh('tulisEvent') && (
          <Button onClick={() => navigate('/event/baru')} className="flex items-center gap-2 px-[18px] py-3 text-sm shadow-primary">
            + Event Baru
          </Button>
        )}
      </PageTitle>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-[18px] py-4">
          <div role="tablist" aria-label="Filter status" className="flex flex-wrap gap-1">
            {FILTER.map((l) => {
              const on = filter === l;
              const n = l === 'semua' ? events.length : events.filter((e) => e.status === l).length;
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => ubahParam('status', l, 'semua')}
                  className={cx('flex cursor-pointer items-center gap-2 rounded-[10px] border-none px-3 py-2 text-[13px] font-semibold', on ? 'bg-navy text-white' : 'bg-transparent text-ink-body')}
                >
                  {labelFilter(l)}
                  <span className={cx('rounded-full px-[7px] py-px text-[11px]', on ? 'bg-white/18' : 'bg-line-soft')}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex min-w-[240px] flex-[0_1_300px] items-center gap-2 rounded-xl border border-line-ctl px-3 focus-within:border-primary">
            <Icon name="search" size={16} stroke="#7A869A" />
            <input
              type="search"
              aria-label="Cari event"
              value={q}
              onChange={(e) => ubahParam('q', e.target.value, '')}
              placeholder="Cari nama event, lokasi, PIC…"
              className="flex-1 border-none bg-transparent py-2.5 text-[13px] text-ink outline-none"
            />
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="hidden overflow-x-auto lap:block">
              <div className="min-w-[1040px]">
                <div className="grid gap-3 bg-surface-muted px-5 py-3 text-xs font-semibold text-ink-muted" style={{ gridTemplateColumns: KOLOM }}>
                  <span>Nama Event</span>
                  <span>Tanggal</span>
                  <span>Lokasi</span>
                  <span>PIC</span>
                  <span>Status</span>
                  <span className="text-right">Pemasukan</span>
                  <span className="text-right">Pengeluaran</span>
                  <span className="text-right">Untung/Rugi</span>
                  <span />
                </div>
                {rows.map((e) => (
                  <BarisEvent key={e.id} e={e} warna={warna(e.id)} v={nilai(e)} />
                ))}
              </div>
            </div>
            <div className="flex flex-col lap:hidden">
              {rows.map((e) => {
                const v = nilai(e);
                return (
                  <Link key={e.id} to={`/event/${e.id}`} className="flex flex-col gap-2.5 border-t border-line-soft px-4 py-3.5 transition-all duration-150 hover:bg-surface-soft active:bg-surface-select">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <InisialEvent nama={e.nama} warna={warna(e.id)} className="size-8 flex-none rounded-lg font-display text-xs" />
                        <span className="truncate text-sm font-bold text-navy">{e.nama}</span>
                      </div>
                      <Badge status={LABEL_STATUS_EVENT[e.status]} size="sm" className="h-fit flex-none" />
                    </div>
                    <div className="text-xs text-ink-muted">
                      {formatTanggal(e.tanggal)} · {e.lokasi} · PIC {e.pic.nama}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={e.progress} className="h-1.5 flex-1" label={`Progres ${e.nama}`} />
                      <span className="text-[11px] font-medium text-ink-subtle">{e.progress}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-ink-muted">Pemasukan</span>
                        <span className="truncate font-semibold text-success-ink">{v.inF}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-ink-muted">Pengeluaran</span>
                        <span className="truncate font-semibold text-danger-ink">{v.outF}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-ink-muted">Untung/Rugi</span>
                        <span className="truncate font-bold" style={{ color: v.pColor }}>
                          {v.pF}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
        {rows.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-muted">Tidak ada event dengan filter ini.</div>}
      </Card>
    </div>
  );
}

function BarisEvent({ e, warna, v }: { e: EventRingkas; warna: readonly [string, string]; v: { inF: string; outF: string; pF: string; pColor: string } }) {
  return (
    <Link
      to={`/event/${e.id}`}
      className="grid items-center gap-3 border-t border-line-soft px-5 py-3.5 text-[13px] text-ink-label hover:bg-surface-hover hover:text-ink-label"
      style={{ gridTemplateColumns: KOLOM }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <InisialEvent nama={e.nama} warna={warna} className="size-[38px] rounded-xl font-display text-[13px]" />
        <span className="flex min-w-0 flex-col gap-[5px]">
          <span className="text-sm font-semibold text-navy">{e.nama}</span>
          <span className="flex items-center gap-2">
            <Progress value={e.progress} className="h-1 w-[90px]" label={`Progres ${e.nama}`} />
            <span className="text-[11px] text-ink-subtle">{e.progress}%</span>
          </span>
        </span>
      </span>
      <span>{formatTanggal(e.tanggal)}</span>
      <span>{e.lokasi}</span>
      <span>{e.pic.nama}</span>
      <span>
        <Badge status={LABEL_STATUS_EVENT[e.status]} />
      </span>
      <span className="text-right font-semibold text-success-ink">{v.inF}</span>
      <span className="text-right font-semibold text-danger-ink">{v.outF}</span>
      <span className="text-right font-bold" style={{ color: v.pColor }}>
        {v.pF}
      </span>
      <span className="text-lg text-ink-subtle">›</span>
    </Link>
  );
}
