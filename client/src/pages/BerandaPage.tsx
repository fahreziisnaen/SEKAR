import { Link, useNavigate } from 'react-router';
import { Icon, type NamaIkon } from '../components/icons';
import { Badge, Card, Progress } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useEvents, useHariIni, useIzin, useOrganisasiPublik, useTugas } from '../hooks/queries';
import { InisialEvent, useWarnaEvent } from '../layout/AppShell';
import { formatHariTanggal, formatTanggal, rupiah, tanpaAwalan } from '../lib/format';
import { LABEL_STATUS_EVENT } from '../lib/label';
import type { EventRingkas } from '../types';

export function ItemEvent({ e, warna }: { e: EventRingkas; warna: readonly [string, string] }) {
  return (
    <Link to={`/event/${e.id}`} className="-mx-3 flex items-center gap-3.5 rounded-[14px] p-3 text-left hover:bg-surface-soft">
      <InisialEvent nama={e.nama} warna={warna} className="size-11 rounded-[14px] font-display text-[15px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-semibold text-navy">{e.nama}</span>
        <span className="flex items-center gap-2.5">
          <span className="text-xs whitespace-nowrap text-ink-muted">
            {formatTanggal(e.tanggal)} · {e.lokasi}
          </span>
          <Progress value={e.progress} className="h-[5px] max-w-[120px] flex-1" label={`Progres ${e.nama}`} />
          <span className="text-[11px] text-ink-muted">{e.progress}%</span>
        </span>
      </span>
      <Badge status={LABEL_STATUS_EVENT[e.status]} />
    </Link>
  );
}

export function BerandaPage() {
  const events = useEvents().data ?? [];
  const { event, pilih } = useEventAktif();
  const navigate = useNavigate();
  const warna = useWarnaEvent();
  const hari = useHariIni();
  const boleh = useIzin();
  const org = useOrganisasiPublik().data;

  const ti = events.reduce((s, e) => s + e.masuk, 0);
  const to = events.reduce((s, e) => s + e.keluar, 0);
  const saldo = ti - to;
  const berlangsung = events.filter((e) => e.status === 'berlangsung');

  const kartu: { label: string; value: string; note: string; icon: NamaIkon; bg: string; fg: string }[] = [
    { label: 'Total Event', value: `${events.length} Event`, note: `${berlangsung.length} berlangsung, ${events.filter((e) => e.status === 'selesai').length} selesai`, icon: 'cal', bg: '#E4EDFF', fg: '#2F6FED' },
    { label: 'Event Berlangsung', value: `${berlangsung.length} Event`, note: berlangsung[0]?.nama ?? '—', icon: 'play', bg: '#FFF4D1', fg: '#B88600' },
    { label: 'Total Pemasukan', value: rupiah(ti), note: 'Dari semua event', icon: 'up', bg: '#E1F4EA', fg: '#1E9E63' },
    { label: 'Total Pengeluaran', value: rupiah(to), note: 'Dari semua event', icon: 'down', bg: '#FDE7E7', fg: '#D93A35' },
    { label: 'Saldo Event', value: rupiah(saldo), note: 'Tersedia di kas event', icon: 'wallet', bg: '#E4EDFF', fg: '#2F6FED' },
    { label: saldo < 0 ? 'Kerugian' : 'Keuntungan', value: rupiah(Math.abs(saldo)), note: `Margin ${ti ? Math.round((saldo / ti) * 100) : 0}%`, icon: 'trend', bg: '#FFF4D1', fg: '#B88600' },
  ];

  // Grafik: event yang punya transaksi, urut tanggal.
  const denganTx = events.filter((e) => e.jumlahTransaksi > 0).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const mx = Math.max(1, ...denganTx.flatMap((e) => [e.masuk, e.keluar]));

  const pin = ti + to ? Math.round((ti / (ti + to)) * 100) : 0;
  const legenda = [
    { label: 'Pemasukan', v: rupiah(ti), pct: pin + '%', c: '#1E9E63' },
    { label: 'Pengeluaran', v: rupiah(to), pct: 100 - pin + '%', c: '#F5B800' },
    { label: 'Saldo', v: rupiah(saldo), pct: '', c: '#2F6FED' },
  ];

  const terbaru = events
    .filter((e) => e.status !== 'draft')
    .sort((a, b) => Number(b.status === 'berlangsung') - Number(a.status === 'berlangsung') || b.tanggal.localeCompare(a.tanggal))
    .slice(0, 4);

  // Kebutuhan dari event yang sedang berlangsung, atau event aktif bila tidak ada.
  const eventTugas = berlangsung[0] ?? event;
  const tugasQ = useTugas(eventTugas?.id);
  const tugas = (tugasQ.data ?? []).filter((t) => !t.selesai).slice(0, 4);

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <div className="relative flex flex-wrap items-end justify-between gap-6 overflow-hidden rounded-[26px] bg-navy px-6 py-8 text-white sm:px-9">
        <div className="absolute -top-[90px] -right-[60px] size-[260px] rounded-full bg-accent" />
        <div className="absolute -top-[50px] right-[120px] size-[120px] rounded-full bg-primary opacity-55" />
        <div className="absolute right-[30px] -bottom-[140px] size-[220px] rounded-full border-[30px] border-white/6" />
        <div className="relative flex max-w-[620px] flex-col gap-2.5">
          <div className="text-xs font-bold tracking-[.14em] text-accent uppercase">{formatHariTanggal(hari)}</div>
          <h1 className="m-0 font-display text-4xl leading-[1.1] font-bold tracking-[-.02em]">Selamat Datang di SEKAR</h1>
          <div className="text-[15px] leading-[1.6] text-on-navy">Kelola event, keuangan, dan administrasi{org?.nama ? ` ${org.nama}` : ''} dalam satu tempat.</div>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          {boleh('tulisKeuangan') && (
            <Link
              to="/keuangan"
              className="rounded-xl border border-white/20 bg-white/10 px-[18px] py-3 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/18 hover:text-white"
            >
              Catat Transaksi
            </Link>
          )}
          {boleh('tulisEvent') && (
            <Link to="/event/baru" className="rounded-xl bg-accent px-[18px] py-3 text-sm font-bold whitespace-nowrap text-navy hover:bg-accent-hover hover:text-navy">
              + Event Baru
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        {kartu.map((c) => (
          <Card key={c.label} className="flex flex-col gap-3.5 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: c.bg, color: c.fg }}>
              <Icon name={c.icon} size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-ink-slate">{c.label}</span>
              <span className="font-display text-[23px] font-bold tracking-[-.01em] whitespace-nowrap text-navy">{c.value}</span>
              <span className="truncate text-xs text-ink-subtle">{c.note}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-5">
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-bold text-navy">Grafik Pemasukan vs Pengeluaran</div>
              <div className="mt-1 text-[13px] text-ink-muted">Per event, klik batang untuk membuka event</div>
            </div>
            <div className="flex gap-3.5 text-xs text-ink-body">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-success" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-accent" />
                Pengeluaran
              </span>
            </div>
          </div>
          <div
            className="flex h-[230px] items-end gap-3 border-b border-line"
            style={{ background: 'repeating-linear-gradient(to top,#F1F4F9 0 1px,transparent 1px 48px)' }}
          >
            {denganTx.map((e) => {
              const r = e;
              const tip = `${e.nama} — Pemasukan ${rupiah(r.masuk)} · Pengeluaran ${rupiah(r.keluar)}`;
              return (
                <button
                  key={e.id}
                  type="button"
                  title={tip}
                  aria-label={tip}
                  onClick={() => navigate(`/event/${e.id}`)}
                  className="flex h-full flex-1 cursor-pointer items-end justify-center gap-1.5 rounded-t-[10px] border-none bg-transparent p-0 hover:bg-primary/5"
                >
                  <span className="w-[28%] max-w-[30px] rounded-[8px_8px_2px_2px] bg-success" style={{ height: Math.round((r.masuk / mx) * 190) }} />
                  <span className="w-[28%] max-w-[30px] rounded-[8px_8px_2px_2px] bg-accent" style={{ height: Math.round((r.keluar / mx) * 190) }} />
                </button>
              );
            })}
          </div>
          <div className="-mt-2.5 flex gap-3">
            {denganTx.map((e) => (
              <span key={e.id} className="flex-1 text-center text-xs font-medium text-ink-slate">
                {tanpaAwalan(e.nama, org?.nama)}
              </span>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col gap-5 p-6">
          <div className="text-base font-bold text-navy">Ringkasan Keuangan</div>
          <div className="flex justify-center">
            <div
              className="flex size-[190px] items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#1E9E63 0 ${pin}%, #F5B800 ${pin}% 100%)` }}
              role="img"
              aria-label={`Pemasukan ${pin}%, pengeluaran ${100 - pin}%`}
            >
              <div className="flex size-[136px] flex-col items-center justify-center gap-0.5 rounded-full bg-white">
                <span className="font-display text-lg font-bold text-navy">{rupiah(saldo)}</span>
                <span className="text-xs text-ink-muted">Saldo</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {legenda.map((l) => (
              <div key={l.label} className="flex items-center gap-2.5 text-[13px]">
                <span className="size-2.5 rounded-full" style={{ background: l.c }} />
                <span className="flex-1 text-ink-body">{l.label}</span>
                <span className="font-bold text-navy">{l.v}</span>
                <span className="w-[38px] text-right text-ink-muted">{l.pct}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-5">
        <Card className="flex flex-col gap-2 p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-bold text-navy">Event Terbaru</div>
            <Link to="/event" className="text-[13px] font-semibold">
              Lihat Semua →
            </Link>
          </div>
          {terbaru.map((e) => (
            <ItemEvent key={e.id} e={e} warna={warna(e.id)} />
          ))}
        </Card>
        <div className="flex flex-col gap-3.5 rounded-[20px] border border-cream-line bg-cream p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-navy">Masih Harus Dikerjakan</div>
              <div className="mt-1 text-[13px] text-accent-deep">{eventTugas?.nama}</div>
            </div>
            {eventTugas && (
              <Link
                to="/administrasi?tab=kebutuhan"
                onClick={() => pilih(eventTugas.id)}
                className="text-[13px] font-semibold text-accent-deep hover:text-navy"
              >
                Semua →
              </Link>
            )}
          </div>
          {tugas.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-[14px] bg-white px-3.5 py-3">
              <span className="size-[18px] flex-none rounded-md border-2 border-accent-box" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-navy">{t.label}</span>
                <span className="text-xs text-ink-muted">{t.pic?.nama ?? 'Tanpa PIC'}</span>
              </span>
              <span className="text-xs font-semibold whitespace-nowrap text-accent-deep">{t.tenggat ? formatTanggal(t.tenggat) : '—'}</span>
            </div>
          ))}
          {tugas.length === 0 && (
            <div className="rounded-[14px] bg-white px-3.5 py-3 text-[13px] text-ink-muted">{tugasQ.isPending ? 'Memuat…' : 'Tidak ada kebutuhan yang tertunda.'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
