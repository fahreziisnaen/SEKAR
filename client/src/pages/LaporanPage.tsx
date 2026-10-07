import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Icon, type NamaIkon } from '../components/icons';
import { GagalMemuat, Memuat } from '../components/Status';
import { useToast } from '../components/Toast';
import { Button, cx } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import {
  useDokumen,
  useEventDetail,
  useEvents,
  useHariIni,
  useOrganisasiPublik,
  usePeserta,
  useRekap,
  useTransaksi,
  useTugas,
  useVendor,
} from '../hooks/queries';
import { namaFileCsv, unduhCsv, type Sel } from '../lib/ekspor';
import { formatTanggalPanjang } from '../lib/format';
import { barisLaporan, margin, ringkas } from '../lib/keuangan';
import { LABEL_STATUS_EVENT, STATUS_EVENT } from '../lib/label';
import { daftarPeriode, queryPeriode } from '../lib/tanggal';
import type { EventDetail, EventRingkas, StatusEvent } from '../types';
import { EventOverview } from '../features/event/EventOverview';
import { LaporanAdministrasi, LaporanKeuangan, RekapEvent, barisAdministrasi } from '../features/laporan/Seksi';

type Jenis = 'ringkasan' | 'keuangan' | 'pemasukan' | 'pengeluaran' | 'profit' | 'rekap' | 'administrasi';

const JENIS: [Jenis, string, string, NamaIkon][] = [
  ['ringkasan', 'Ringkasan Event', 'Informasi & status event', 'cal'],
  ['keuangan', 'Laporan Keuangan', 'Semua transaksi & saldo', 'wallet'],
  ['pemasukan', 'Laporan Pemasukan', 'Rincian dana masuk', 'up'],
  ['pengeluaran', 'Laporan Pengeluaran', 'Rincian dana keluar', 'down'],
  ['profit', 'Keuntungan / Kerugian', 'Perbandingan antar event', 'trend'],
  ['rekap', 'Rekap Event', 'Semua event dalam satu tabel', 'list'],
  ['administrasi', 'Administrasi', 'Dokumen, peserta, vendor', 'file'],
];

const kelasFilter = 'flex flex-col gap-1.5 text-xs font-semibold text-ink-muted';
const kelasSelect = 'rounded-[10px] border border-line-input bg-white px-3 py-2.5 text-[13px] font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-55';

/** Isi laporan; setiap jenis hanya memuat data yang ia butuhkan. */
function useDataLaporan(jenis: Jenis, event: EventRingkas, rentang: { dari: string | null; sampai: string | null }, qsRekap: string) {
  const perTransaksi = jenis === 'keuangan' || jenis === 'pemasukan' || jenis === 'pengeluaran';
  const antarEvent = jenis === 'profit' || jenis === 'rekap';
  const perAdministrasi = jenis === 'administrasi';
  return {
    tx: useTransaksi(perTransaksi ? event.id : undefined, rentang),
    rekap: useRekap(antarEvent ? qsRekap : null),
    detail: useEventDetail(jenis === 'ringkasan' || perAdministrasi ? event.id : undefined),
    dokumen: useDokumen(perAdministrasi ? event.id : undefined),
    peserta: usePeserta(perAdministrasi ? event.id : undefined),
    vendor: useVendor(perAdministrasi ? event.id : undefined),
    tugas: useTugas(perAdministrasi ? event.id : undefined),
  };
}

function Ringkasan({ event }: { event: EventDetail | undefined }) {
  return event ? <EventOverview event={event} /> : <Memuat varian="tabel" baris={6} className="rounded-[20px] border border-line bg-white" />;
}

export function LaporanPage() {
  const { event, pilih } = useEventAktif();
  const events = useEvents().data ?? [];
  const org = useOrganisasiPublik().data;
  const toast = useToast();
  const hari = useHariIni();
  const [params, setParams] = useSearchParams();

  const jenis: Jenis = JENIS.find(([k]) => k === params.get('jenis'))?.[0] ?? 'keuangan';
  const periodeList = daftarPeriode(hari);
  const periode = periodeList.find((p) => p.kunci === params.get('periode')) ?? periodeList[0];
  const status: StatusEvent | 'semua' = STATUS_EVENT.find((s) => s === params.get('status')) ?? 'semua';
  const antarEvent = jenis === 'profit' || jenis === 'rekap';
  const pakaiPeriode = jenis !== 'ringkasan' && jenis !== 'administrasi';
  const rentang = pakaiPeriode ? periode : periodeList[0];
  const qsRekap = queryPeriode(rentang, { status: status === 'semua' ? undefined : status });

  const ubah = (k: string, v: string, bawaan: string) =>
    setParams(
      (p) => {
        if (v === bawaan) p.delete(k);
        else p.set(k, v);
        return p;
      },
      { replace: true },
    );

  // Hook dipanggil tanpa syarat; tanpa event, AppShell sudah menampilkan keadaan kosong.
  const data = useDataLaporan(jenis, event ?? ({ id: 0 } as EventRingkas), rentang, qsRekap);
  if (!event) return null;
  const label = JENIS.find(([k]) => k === jenis)![1];
  const r = ringkas(data.tx.data ?? []);

  const barisCsv = (): Sel[][] | null => {
    if (jenis === 'keuangan' || jenis === 'pemasukan' || jenis === 'pengeluaran') {
      if (!data.tx.data) return null;
      const f = jenis === 'pemasukan' ? 'masuk' : jenis === 'pengeluaran' ? 'keluar' : null;
      return [
        ['Tanggal', 'Keterangan', 'Kategori', 'Metode', 'Pemasukan', 'Pengeluaran', 'Saldo'],
        ...barisLaporan(r.list, f).rows.map(({ tx, saldo }) => [tx.tanggal, tx.keterangan, tx.kategori.nama, tx.metode.nama, tx.jenis === 'masuk' ? tx.nominal : '', tx.jenis === 'keluar' ? tx.nominal : '', saldo]),
      ];
    }
    if (antarEvent) {
      if (!data.rekap.data) return null;
      return [
        ['Event', 'Tanggal', 'Status', 'Pemasukan', 'Pengeluaran', 'Untung/Rugi', 'Margin (%)'],
        ...data.rekap.data.map(({ event: x, masuk, keluar, jumlahTransaksi }) => [
          x.nama,
          x.tanggal,
          LABEL_STATUS_EVENT[x.status],
          masuk,
          keluar,
          masuk - keluar,
          jumlahTransaksi ? margin({ masuk, saldo: masuk - keluar }) : '',
        ]),
      ];
    }
    if (jenis === 'administrasi') {
      const { detail, dokumen, peserta, vendor, tugas } = data;
      if (!detail.data || !dokumen.data || !peserta.data || !vendor.data || !tugas.data) return null;
      return [['Aspek', 'Ringkasan', 'Catatan'], ...barisAdministrasi(detail.data, { dokumen: dokumen.data, peserta: peserta.data, vendor: vendor.data, tugas: tugas.data })];
    }
    return [
      ['Informasi', 'Nilai'],
      ['Nama event', event.nama],
      ['Tanggal', formatTanggalPanjang(event.tanggal)],
      ['Jam', event.waktu ?? '-'],
      ['Lokasi', [event.venue, event.lokasi].filter(Boolean).join(', ')],
      ['PIC', event.pic.nama],
      ['Status', LABEL_STATUS_EVENT[event.status]],
      ['Progres (%)', event.progress],
      ['Total pemasukan', event.masuk],
      ['Total pengeluaran', event.keluar],
      ['Saldo', event.masuk - event.keluar],
    ];
  };

  const eksporExcel = () => {
    const baris = barisCsv();
    if (!baris) return toast('Data laporan masih dimuat. Coba lagi sebentar.');
    unduhCsv(namaFileCsv(label, antarEvent ? 'semua event' : event.nama), baris);
    toast(`Menyiapkan ${label} (Excel)…`);
  };

  const eksporPdf = () => {
    toast(`Menyiapkan ${label} (PDF)…`);
    // Beri waktu toast tampil sebelum dialog cetak memblokir halaman.
    setTimeout(() => window.print(), 300);
  };

  const { tx, rekap, detail, dokumen, peserta, vendor, tugas } = data;
  let isi: ReactNode;
  if (jenis === 'ringkasan') isi = detail.isError ? <GagalMemuat error={detail.error} onRetry={() => void detail.refetch()} /> : <Ringkasan event={detail.data} />;
  else if (antarEvent)
    isi = rekap.isPending ? <Memuat varian="tabel" baris={6} className="rounded-[20px] border border-line bg-white" /> : rekap.isError ? <GagalMemuat error={rekap.error} onRetry={() => void rekap.refetch()} /> : <RekapEvent rows={rekap.data} organisasi={org?.nama ?? null} />;
  else if (jenis === 'administrasi') {
    const qs = [detail, dokumen, peserta, vendor, tugas];
    const gagal = qs.find((q) => q.isError);
    isi = gagal ? (
      <GagalMemuat error={gagal.error} onRetry={() => qs.forEach((q) => void q.refetch())} />
    ) : detail.data && dokumen.data && peserta.data && vendor.data && tugas.data ? (
      <LaporanAdministrasi event={detail.data} data={{ dokumen: dokumen.data, peserta: peserta.data, vendor: vendor.data, tugas: tugas.data }} />
    ) : (
      <Memuat varian="tabel" baris={6} className="rounded-[20px] border border-line bg-white" />
    );
  } else isi = tx.isPending ? <Memuat varian="tabel" baris={6} className="rounded-[20px] border border-line bg-white" /> : tx.isError ? <GagalMemuat error={tx.error} onRetry={() => void tx.refetch()} /> : <LaporanKeuangan event={event} r={r} jenis={jenis} />;

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="m-0 font-display text-[32px] font-bold tracking-[-.02em] text-navy">Laporan</h1>
          <div className="mt-1.5 text-sm text-ink-slate">Susun laporan resmi event untuk tim dan mitra{org?.nama ? ` ${org.nama}` : ''}.</div>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={eksporExcel} className="flex items-center gap-2 border-success-line px-4 py-[11px] text-[13px] font-bold text-success-ink hover:border-success-line hover:bg-success-pale">
            Export Excel
          </Button>
          <Button variant="navy" onClick={eksporPdf} className="flex items-center gap-2 px-4 py-[11px] text-[13px]">
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded-[18px] border border-line bg-white p-4 print:hidden">
        <label className={kelasFilter}>
          Event
          <select value={antarEvent ? '' : event.id} disabled={antarEvent} onChange={(ev) => pilih(Number(ev.target.value))} className={kelasSelect}>
            {antarEvent && <option value="">Seluruh event</option>}
            {events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama}
              </option>
            ))}
          </select>
        </label>
        <label className={kelasFilter}>
          Periode
          <select value={pakaiPeriode ? periode.kunci : periodeList[0].kunci} disabled={!pakaiPeriode} onChange={(ev) => ubah('periode', ev.target.value, periodeList[0].kunci)} className={kelasSelect}>
            {periodeList.map((p) => (
              <option key={p.kunci} value={p.kunci}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className={kelasFilter}>
          Status
          <select value={antarEvent ? status : 'semua'} disabled={!antarEvent} onChange={(ev) => ubah('status', ev.target.value, 'semua')} className={kelasSelect}>
            <option value="semua">Semua status</option>
            {STATUS_EVENT.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_EVENT[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Jenis laporan" className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 print:hidden">
        {JENIS.map(([k, l, desc, icon]) => {
          const on = k === jenis;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => ubah('jenis', k, 'keuangan')}
              className={cx('flex cursor-pointer flex-col items-start gap-3 rounded-2xl border p-4 text-left', on ? 'border-navy bg-navy' : 'border-line bg-white hover:border-line-dash')}
            >
              <span className={cx('flex size-[34px] items-center justify-center rounded-[10px]', on ? 'bg-accent/18 text-accent' : 'bg-canvas text-navy')}>
                <Icon name={icon} size={18} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className={cx('text-[13px] font-bold', on ? 'text-white' : 'text-navy')}>{l}</span>
                <span className={cx('text-[11px]', on ? 'text-on-navy-soft' : 'text-ink-muted')}>{desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {isi}
    </div>
  );
}
