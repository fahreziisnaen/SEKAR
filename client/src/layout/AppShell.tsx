import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, matchPath, useLocation, useNavigate } from 'react-router';
import { Icon, LogoSekar, type NamaIkon } from '../components/icons';
import { GagalMemuat, Memuat } from '../components/Status';
import { IlustrasiEvent } from '../components/IlustrasiKosong';
import { Badge, Button, Inisial, Progress, cx } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useEventDetail, useEvents, useIzin, useLogout, useMe, useNotifikasi, useOrganisasiPublik } from '../hooks/queries';
import { formatTanggal } from '../lib/format';
import { LABEL_PERAN, LABEL_STATUS_EVENT } from '../lib/label';
import { warnaThumb } from '../lib/warna';
import type { EventRingkas } from '../types';

export const NAV: { key: string; to: string; label: string; icon: NamaIkon }[] = [
  { key: 'beranda', to: '/', label: 'Beranda', icon: 'home' },
  { key: 'event', to: '/event', label: 'Event', icon: 'cal' },
  { key: 'keuangan', to: '/keuangan', label: 'Keuangan', icon: 'wallet' },
  { key: 'administrasi', to: '/administrasi', label: 'Administrasi', icon: 'file' },
  { key: 'laporan', to: '/laporan', label: 'Laporan', icon: 'chart' },
  { key: 'pengaturan', to: '/pengaturan', label: 'Pengaturan', icon: 'set' },
];

function useNavAktif(): string {
  const { pathname } = useLocation();
  return pathname.split('/')[1] || 'beranda';
}

/** Inisial event tanpa nama organisasi, mis. "Slekoors Music Night" → "MN". */
export function InisialEvent(props: { nama: string; warna: readonly [string, string]; className?: string }) {
  const org = useOrganisasiPublik().data;
  return <Inisial {...props} abaikan={org?.nama} />;
}

/** Warna thumbnail event mengikuti urutannya di daftar event. */
export function useWarnaEvent(): (id: number) => readonly [string, string] {
  const events = useEvents().data ?? [];
  return (id) => warnaThumb(events.findIndex((e) => e.id === id));
}

/** Dropdown header ditutup dengan Escape. */
function useTutupEscape(buka: boolean, tutup: () => void) {
  useEffect(() => {
    if (!buka) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && tutup();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [buka, tutup]);
}

function useKeluar() {
  const logout = useLogout();
  return () => logout.mutate();
}

function Sidebar() {
  const aktif = useNavAktif();
  const { event } = useEventAktif();
  const org = useOrganisasiPublik().data;
  const keluar = useKeluar();
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col overflow-hidden bg-navy px-3.5 pt-6 pb-[18px] text-white lap:flex print:hidden">
      <div className="absolute -bottom-[70px] -left-[70px] size-[220px] rounded-full border-[36px] border-[rgba(245,184,0,.08)]" />
      <div className="flex items-center gap-2.5 px-2.5 pb-[26px]">
        <LogoSekar ubin className="size-10 rounded-xl p-1" />
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-[22px] leading-none font-extrabold tracking-[.05em]">SEKAR</span>
          {org?.nama && <span className="mt-1 truncate text-[10px] tracking-[.08em] text-on-navy-muted uppercase">By {org.nama}</span>}
        </div>
      </div>
      <nav aria-label="Navigasi utama" className="relative flex flex-col gap-1">
        {NAV.map((n) => {
          const on = n.key === aktif;
          return (
            <Link
              key={n.key}
              to={n.to}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-sm font-semibold hover:text-white',
                on ? 'bg-primary text-white shadow-[0_8px_20px_-8px_rgba(47,111,237,.9)]' : 'text-on-navy-soft',
              )}
            >
              <Icon name={n.icon} size={19} strokeWidth={1.8} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {event && (
        <div className="relative flex flex-col gap-2.5 rounded-2xl bg-white/6 p-3.5">
          <div className="text-[11px] tracking-[.06em] text-on-navy-muted">EVENT AKTIF</div>
          <div className="text-[13px] leading-[1.35] font-semibold">{event.nama}</div>
          <Progress value={event.progress} color="#F5B800" track="rgba(255,255,255,.12)" label="Progres event aktif" />
          <div className="text-[11px] text-on-navy-soft">Progres {event.progress}%</div>
        </div>
      )}
      <button
        type="button"
        onClick={keluar}
        className="relative mt-3 flex cursor-pointer items-center gap-2.5 rounded-[10px] border-none bg-transparent px-3.5 py-2.5 text-left text-[13px] text-on-navy-muted transition-colors hover:bg-white/5 hover:text-white"
      >
        <Icon name="logout" size={16} />
        Keluar
      </button>
    </aside>
  );
}

function EventPicker() {
  const { event, pilih } = useEventAktif();
  const events = useEvents().data ?? [];
  const warna = useWarnaEvent();
  const [buka, setBuka] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useTutupEscape(buka, () => setBuka(false));
  if (!event) return null;

  const pilihEvent = (e: EventRingkas) => {
    pilih(e.id);
    setBuka(false);
    // Di halaman detail, ganti event yang sedang dibuka sekaligus.
    const m = matchPath('/event/:eventId/:tab?', pathname);
    if (m && m.params.eventId !== 'baru') navigate(`/event/${e.id}${m.params.tab ? '/' + m.params.tab : ''}`);
  };

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={buka}
        onClick={() => setBuka(!buka)}
        className="flex w-full max-w-[150px] sm:max-w-[260px] min-w-0 cursor-pointer items-center gap-2 rounded-full border border-line-ctl bg-white py-[6px] sm:py-[7px] pr-2.5 sm:pr-3 pl-1.5 sm:pl-2 transition-colors hover:border-[#C9D2E0]"
      >
        <InisialEvent nama={event.nama} warna={warna(event.id)} className="size-[24px] sm:size-[26px] rounded-full text-[10px]" />
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="hidden text-[9px] tracking-[.04em] text-ink-muted sm:inline">EVENT AKTIF</span>
          <span className="max-w-full truncate text-xs sm:text-[13px] font-semibold text-navy lap:max-w-[170px]">{event.nama}</span>
        </span>
        <Icon name="chevronDown" size={13} stroke="#7A869A" className="flex-none" />
      </button>
      {buka && (
        <>
          <div onClick={() => setBuka(false)} className="fixed inset-0 z-30" />
          <div className="absolute top-[52px] right-0 z-31 w-[min(320px,calc(100vw-32px))] animate-fade-up-quick rounded-[18px] border border-line bg-white p-2 shadow-pop">
            <div className="px-2.5 py-2 text-[11px] tracking-[.06em] text-ink-muted">PILIH EVENT</div>
            <div role="listbox" aria-label="Pilih event" className="max-h-[60vh] overflow-y-auto">
              {events.map((e) => {
                const sel = e.id === event.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    onClick={() => pilihEvent(e)}
                    className={cx('flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none p-2.5 text-left hover:bg-surface-select', sel ? 'bg-surface-select' : 'bg-white')}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-navy">{e.nama}</span>
                      <span className="text-xs text-ink-muted">{formatTanggal(e.tanggal)}</span>
                    </span>
                    <Badge status={LABEL_STATUS_EVENT[e.status]} size="sm" className="flex-none" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Notifikasi() {
  const q = useNotifikasi();
  const [buka, setBuka] = useState(false);
  useTutupEscape(buka, () => setBuka(false));
  const daftar = q.data ?? [];
  return (
    <div className="relative flex-none">
      <button
        type="button"
        aria-label={`Notifikasi${daftar.length ? ` (${daftar.length})` : ''}`}
        aria-expanded={buka}
        onClick={() => setBuka(!buka)}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl border border-line-ctl bg-white text-ink-label"
      >
        <Icon name="bell" size={18} strokeWidth={1.8} />
        {daftar.length > 0 && <span className="absolute top-[9px] right-2.5 size-2 rounded-full border-2 border-white bg-accent" />}
      </button>
      {buka && (
        <>
          <div onClick={() => setBuka(false)} className="fixed inset-0 z-30" />
          <div className="absolute top-[52px] right-0 z-31 w-[min(340px,calc(100vw-32px))] animate-fade-up-quick rounded-[18px] border border-line bg-white p-2 shadow-pop">
            <div className="px-2.5 py-2 text-[11px] tracking-[.06em] text-ink-muted">NOTIFIKASI</div>
            {q.isPending && <Memuat baris={3} className="px-2.5 py-3" />}
            {!q.isPending && daftar.length === 0 && <div className="px-2.5 pt-1 pb-4 text-[13px] text-ink-muted">Tidak ada notifikasi.</div>}
            <div className="max-h-[60vh] overflow-y-auto">
              {daftar.map((n) => (
                <Link
                  key={n.id}
                  to={n.tipe === 'tenggat' ? `/event/${n.event.id}/administrasi` : `/event/${n.event.id}/keuangan`}
                  onClick={() => setBuka(false)}
                  className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-surface-select"
                >
                  <span className="text-[13px] font-semibold text-navy">
                    {n.tipe === 'tenggat' ? n.judul : `Pengeluaran mencapai ${n.persen}% budget`}
                  </span>
                  <span className={cx('text-xs', n.tipe === 'tenggat' && n.lewat ? 'text-danger-ink' : 'text-ink-muted')}>
                    {n.event.nama} ·{' '}
                    {n.tipe === 'tenggat' ? `${n.lewat ? 'Lewat tenggat' : 'Tenggat'} ${formatTanggal(n.tanggal)}${n.pic ? ` · ${n.pic}` : ''}` : 'Periksa ringkasan keuangan'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const [, root = '', sub] = pathname.split('/');
  const detailId = root === 'event' && sub && sub !== 'baru' ? Number(sub) : undefined;
  const detail = useEventDetail(detailId);
  const judul: Record<string, string> = { '': 'Beranda', event: 'Event', keuangan: 'Keuangan', administrasi: 'Administrasi', laporan: 'Laporan', pengaturan: 'Pengaturan' };
  let crumbs: string[] = [judul[root] ?? 'Beranda'];
  if (root === 'event' && sub === 'baru') crumbs = ['Event', 'Event Baru'];
  else if (detailId) crumbs = ['Event', detail.data?.nama ?? '…'];
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-[0_1_auto] items-center gap-2 overflow-hidden text-[13px] wide:flex">
      {crumbs.map((c, i) => {
        const akhir = i === crumbs.length - 1;
        return (
          <div key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span className="text-line-strong">/</span>}
            {akhir ? (
              <span aria-current="page" className="truncate font-bold text-navy">
                {c}
              </span>
            ) : (
              <Link to="/event" className="font-medium whitespace-nowrap text-ink-muted hover:text-navy">
                {c}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function ProfilMenuDesktop() {
  const me = useMe().data;
  const org = useOrganisasiPublik().data;
  const keluar = useKeluar();
  const [buka, setBuka] = useState(false);
  useTutupEscape(buka, () => setBuka(false));
  if (!me) return null;

  return (
    <div className="relative hidden lap:block">
      <button
        type="button"
        onClick={() => setBuka(!buka)}
        aria-expanded={buka}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-hover"
      >
        <Inisial nama={me.nama} warna={['#12264A', '#F5B800']} className="size-[38px] rounded-full text-[13px] font-bold shadow-xs" />
        <span className="hidden flex-col text-left whitespace-nowrap wide:flex">
          <span className="text-[13px] font-bold text-navy">{me.nama}</span>
          <span className="text-[11px] text-ink-muted">
            {me.jabatan ?? LABEL_PERAN[me.peran]}
            {org?.nama ? ` · ${org.nama}` : ''}
          </span>
        </span>
        <Icon name="chevronDown" size={14} stroke="#7A869A" className={cx('transition-transform duration-200', buka && 'rotate-180')} />
      </button>
      {buka && (
        <>
          <div onClick={() => setBuka(false)} className="fixed inset-0 z-30" />
          <div className="absolute top-[52px] right-0 z-31 w-64 animate-fade-up-quick rounded-2xl border border-line bg-white p-2 shadow-pop">
            <div className="border-b border-line-soft px-3 py-2.5">
              <div className="text-[13px] font-bold text-navy">{me.nama}</div>
              <div className="text-xs text-ink-muted">@{me.username} · {LABEL_PERAN[me.peran]}</div>
              {org?.nama && <div className="mt-1 text-[11px] font-medium text-primary">{org.nama}</div>}
            </div>
            <div className="flex flex-col gap-1 pt-1.5">
              <Link
                to="/pengaturan?tab=akun"
                onClick={() => setBuka(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-label hover:bg-surface-select hover:text-navy"
              >
                <Icon name="user" size={16} />
                Akun Saya
              </Link>
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  keluar();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none bg-transparent px-3 py-2 text-left text-[13px] font-semibold text-danger hover:bg-danger-bg"
              >
                <Icon name="logout" size={16} />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProfilSheetMobile({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const me = useMe().data;
  const org = useOrganisasiPublik().data;
  const { event } = useEventAktif();
  const keluar = useKeluar();
  useTutupEscape(buka, onTutup);

  if (!buka || !me) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center print:hidden lap:hidden">
      <div onClick={onTutup} className="fixed inset-0 animate-fade-in bg-navy/50 backdrop-blur-xs transition-opacity" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Profil Pengguna"
        className="relative z-51 flex max-h-[88vh] w-full animate-slide-up-sheet flex-col overflow-y-auto rounded-t-[28px] border-t border-line/50 bg-white p-5 shadow-[0_-16px_40px_rgba(18,38,74,0.18)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line-strong/60" />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoSekar ubin className="size-6 rounded-md p-0.5" />
            <span className="font-display text-sm font-extrabold tracking-wide text-navy">AKUN SEKAR</span>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup"
            className="flex size-8 items-center justify-center rounded-full border border-line-ctl bg-white text-ink-muted hover:text-navy"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="relative mb-4 flex items-center gap-3.5 overflow-hidden rounded-2xl border border-line-soft bg-surface-soft p-4">
          <div className="absolute -top-10 -right-10 size-28 rounded-full bg-primary/5" />
          <Inisial nama={me.nama} warna={['#12264A', '#F5B800']} className="size-14 rounded-2xl font-display text-xl font-bold shadow-card" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-bold text-navy">{me.nama}</span>
              <Badge status={LABEL_PERAN[me.peran]} size="sm" />
            </div>
            <div className="text-xs text-ink-muted">@{me.username}{me.email ? ` · ${me.email}` : ''}</div>
            {org?.nama && <div className="text-[11px] font-medium text-primary">Organisasi: {org.nama}</div>}
          </div>
        </div>

        {event && (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-line-soft bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide text-ink-muted">EVENT AKTIF</span>
              <span className="font-bold text-accent-ink">{event.progress}% Selesai</span>
            </div>
            <div className="text-sm font-bold text-navy">{event.nama}</div>
            <Progress value={event.progress} color="#F5B800" track="#EEF1F6" className="h-2" label="Progres event aktif" />
          </div>
        )}

        <div className="flex flex-col gap-1.5 pb-2">
          <Link
            to="/pengaturan?tab=akun"
            onClick={onTutup}
            className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold text-navy hover:bg-surface-soft active:bg-surface-select"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-bg text-primary">
                <Icon name="user" size={18} />
              </span>
              Pengaturan Akun & Keamanan
            </span>
            <Icon name="chevronDown" size={16} className="-rotate-90 text-ink-muted" />
          </Link>

          <Link
            to="/pengaturan"
            onClick={onTutup}
            className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold text-navy hover:bg-surface-soft active:bg-surface-select"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-canvas text-navy">
                <Icon name="set" size={18} />
              </span>
              Pengaturan Sistem
            </span>
            <Icon name="chevronDown" size={16} className="-rotate-90 text-ink-muted" />
          </Link>
        </div>

        <div className="mt-2 border-t border-line-soft pt-3">
          <button
            type="button"
            onClick={() => {
              onTutup();
              keluar();
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-danger-bg bg-danger-bg/80 py-3.5 text-sm font-bold text-danger transition-all duration-200 hover:bg-danger hover:text-white active:scale-[0.98]"
          >
            <Icon name="logout" size={18} strokeWidth={2.2} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const me = useMe().data;
  const [bukaProfilMobile, setBukaProfilMobile] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[68px] min-w-0 flex-none items-center gap-2.5 sm:gap-4 border-b border-line bg-white/90 px-3 sm:px-4 backdrop-blur-md lap:px-7 print:hidden">
        <Link to="/" className="flex flex-none items-center gap-2 lap:hidden">
          <LogoSekar ubin className="size-8 rounded-lg p-0.5" />
          <span className="font-display text-lg font-extrabold tracking-[.05em] text-navy">SEKAR</span>
        </Link>
        <Breadcrumbs />
        <div className="flex-1" />
        <EventPicker />
        <Notifikasi />
        <ProfilMenuDesktop />
        {me && (
          <button
            type="button"
            onClick={() => setBukaProfilMobile(true)}
            aria-label={`Menu profil ${me.nama}`}
            className="relative flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl border border-line-ctl bg-white shadow-xs transition-all duration-200 active:scale-95 hover:border-primary/40 lap:hidden"
          >
            <Inisial nama={me.nama} warna={['#12264A', '#F5B800']} className="size-7 rounded-full text-[11px] font-bold" />
          </button>
        )}
      </header>
      <ProfilSheetMobile buka={bukaProfilMobile} onTutup={() => setBukaProfilMobile(false)} />
    </>
  );
}

function MobileNav() {
  const aktif = useNavAktif();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed right-3 bottom-3 left-3 z-25 grid grid-cols-6 items-center rounded-2xl border border-white/10 bg-navy/95 px-1 py-1.5 shadow-[0_16px_40px_-10px_rgba(18,38,74,0.65)] backdrop-blur-xl lap:hidden print:hidden"
    >
      {NAV.map((n) => {
        const on = n.key === aktif;
        return (
          <Link
            key={n.key}
            to={n.to}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'group flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition-all duration-200 active:scale-90',
              on ? 'bg-primary/25 text-white' : 'text-on-navy-soft hover:text-white',
            )}
          >
            <Icon name={n.icon} size={19} strokeWidth={on ? 2.2 : 1.8} className={cx('transition-transform duration-200', on && 'scale-110')} />
            <span className={cx('max-w-full truncate px-0.5 text-[9.5px] font-semibold leading-none', on && 'text-white')}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BelumAdaEvent() {
  const navigate = useNavigate();
  const boleh = useIzin();
  const org = useOrganisasiPublik().data;
  return (
    <div className="flex animate-fade-up flex-col items-center gap-[18px] rounded-3xl border border-line bg-white px-6 py-16 text-center">
      <IlustrasiEvent />
      <div className="font-display text-[26px] font-bold text-navy">Belum ada event</div>
      <div className="max-w-[460px] text-[15px] leading-[1.6] text-pretty text-ink-slate">
        Mulai buat event pertama{org?.nama ? ` ${org.nama}` : ''} untuk mengelola seluruh kebutuhan event dalam satu tempat.
      </div>
      {boleh('tulisEvent') && (
        <Button onClick={() => navigate('/event/baru')} className="px-5 py-3 text-sm">
          + Buat Event
        </Button>
      )}
    </div>
  );
}

/** Halaman yang tetap bisa dibuka walau belum ada event. */
const TANPA_EVENT = ['/event/baru', '/pengaturan'];

export function AppShell() {
  const { pathname } = useLocation();
  const events = useEventAktif();

  // Pindah halaman selalu mulai dari atas.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const bebas = TANPA_EVENT.includes(pathname);
  let isi = (
    <Suspense fallback={<Memuat varian="halaman" label="Memuat halaman…" />}>
      <Outlet />
    </Suspense>
  );
  if (!bebas && events.isPending) isi = <Memuat varian="halaman" />;
  else if (!bebas && events.isError) isi = <GagalMemuat onRetry={events.refetch} />;
  else if (!bebas && !events.event) isi = <BelumAdaEvent />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-[1340px] flex-col gap-6 px-4 pt-5 pb-[110px] lap:px-9 lap:pt-7 lap:pb-16 print:p-0">{isi}</main>
      </div>
      <MobileNav />
    </div>
  );
}
