import type { CSSProperties } from 'react';
import { LogoSekar } from '../../components/icons';
import { Badge, Card, cx } from '../../components/ui';
import { useHariIni, useMe, useOrganisasiPublik } from '../../hooks/queries';
import { formatTanggal, formatTanggalPanjang, rupiah } from '../../lib/format';
import { barisLaporan, margin, perKategori, type BarKategori, type Ringkasan } from '../../lib/keuangan';
import { LABEL_PERAN, LABEL_STATUS_EVENT } from '../../lib/label';
import type { BarisRekap, Dokumen, EventDetail, EventRingkas, Peserta, Transaksi, Tugas, Vendor } from '../../types';
import { totalVendor } from '../administrasi/Seksi';
import { labelLabaRugi } from '../keuangan/KartuKeuangan';

export type JenisLaporanKeuangan = 'keuangan' | 'pemasukan' | 'pengeluaran';

/** Nomor laporan unik per event: `No. SEKAR/LK/<tahun>/<bulan>/<id event>`. */
export function nomorLaporan(e: Pick<EventRingkas, 'id' | 'tanggal'>) {
  return `No. SEKAR/LK/${e.tanggal.slice(0, 4)}/${e.tanggal.slice(5, 7)}/${String(e.id).padStart(3, '0')}`;
}

function periode(list: Transaksi[]) {
  return list.length ? `${formatTanggalPanjang(list[0].tanggal)} – ${formatTanggalPanjang(list[list.length - 1].tanggal)}` : '-';
}

function GrafikLaporan({ judul, bars, warna, track }: { judul: string; bars: BarKategori[]; warna: string; track: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-bold tracking-[.06em] text-navy">{judul}</span>
      {bars.map((b) => (
        <div key={b.label} className="grid grid-cols-[96px_1fr_110px] items-center gap-2.5 text-xs">
          <span className="text-ink-body">{b.label}</span>
          <div className="h-2" style={{ background: track }}>
            <div className="h-full" style={{ width: `${b.lebar}%`, background: warna }} />
          </div>
          <span className="text-right font-semibold whitespace-nowrap text-navy">{rupiah(b.nilai)}</span>
        </div>
      ))}
    </div>
  );
}

// Lebar cetak A4 (~700px) lebih sempit dari lebar minimum tabel layar, jadi kolom cetak dipadatkan.
const KOLOM_LAP = { '--kolom': '100px minmax(200px,2fr) 110px 120px 120px 130px', '--kolom-cetak': '78px minmax(0,2fr) 80px 92px 92px 98px' } as CSSProperties;
const kelasGridLap = 'grid gap-2.5 [grid-template-columns:var(--kolom)] print:[grid-template-columns:var(--kolom-cetak)]';

export function LaporanKeuangan({ event, r, jenis }: { event: EventRingkas; r: Ringkasan; jenis: JenisLaporanKeuangan }) {
  const filter = jenis === 'pemasukan' ? 'masuk' : jenis === 'pengeluaran' ? 'keluar' : null;
  const { rows, saldoAkhir } = barisLaporan(r.list, filter);
  const judul = jenis === 'pemasukan' ? 'Laporan Pemasukan Event' : jenis === 'pengeluaran' ? 'Laporan Pengeluaran Event' : 'Laporan Keuangan Event';
  const totIn = filter === 'keluar' ? '—' : rupiah(r.masuk);
  const totOut = filter === 'masuk' ? '—' : rupiah(r.keluar);
  const org = useOrganisasiPublik().data;
  const penyusun = useMe().data;
  const hari = useHariIni();

  return (
    <article className="mx-auto flex w-full max-w-[980px] animate-fade-up flex-col gap-7 rounded-lg border border-line bg-white px-6 py-10 shadow-[0_30px_60px_-30px_rgba(18,38,74,.3)] sm:px-[52px] sm:py-12 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b-[3px] border-navy pb-[22px]">
        <div className="flex items-center gap-3">
          {org?.logoUrl ? <img src={org.logoUrl} alt="" className="size-10 rounded-lg object-contain" /> : <LogoSekar className="size-10" />}
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-[.05em] text-navy uppercase">{org?.nama ?? 'SEKAR'}</span>
            <span className="text-[11px] text-ink-muted">Dibuat melalui SEKAR</span>
          </div>
        </div>
        <div className="text-right font-mono text-xs leading-[1.7] text-ink-muted">
          {nomorLaporan(event)}
          <br />
          Dicetak {formatTanggalPanjang(hari)}
        </div>
      </div>
      <h2 className="m-0 font-display text-[28px] font-bold tracking-[-.01em] text-navy">{judul}</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] rounded-md border border-line-ctl text-[13px]">
        {[
          ['NAMA EVENT', event.nama],
          ['PERIODE', periode(r.list)],
          ['PIC', event.pic.nama],
        ].map(([k, v], i) => (
          <div key={k} className={cx('flex flex-col gap-[3px] px-4 py-3', i < 2 && 'border-r border-line-ctl')}>
            <span className="text-[11px] tracking-[.06em] text-ink-muted">{k}</span>
            <span className="font-bold text-navy">{v}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <div className="flex flex-col gap-1 rounded-md bg-success-pale px-[18px] py-4">
          <span className="text-xs font-semibold text-success-ink">Pemasukan</span>
          <span className="font-display text-[22px] font-bold text-success-ink">{totIn}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-danger-pale px-[18px] py-4">
          <span className="text-xs font-semibold text-danger-ink">Pengeluaran</span>
          <span className="font-display text-[22px] font-bold text-danger-ink">{totOut}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-navy px-[18px] py-4 print:[print-color-adjust:exact]">
          <span className="text-xs font-semibold text-accent">{labelLabaRugi(r.saldo)}</span>
          <span className="font-display text-[22px] font-bold text-white">{rupiah(Math.abs(r.saldo))}</span>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
        <GrafikLaporan judul="GRAFIK PEMASUKAN" bars={perKategori(r.list, 'masuk')} warna="#1E9E63" track="#EEF6F1" />
        <GrafikLaporan judul="GRAFIK PENGELUARAN" bars={perKategori(r.list, 'keluar')} warna="#E5574F" track="#FBF0F0" />
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <div className="min-w-[760px] text-[13px] print:min-w-0 print:text-xs" style={KOLOM_LAP}>
          <div className={cx(kelasGridLap, 'bg-navy px-3 py-2.5 text-xs font-semibold text-white print:[print-color-adjust:exact]')}>
            <span>Tanggal</span>
            <span>Keterangan</span>
            <span>Kategori</span>
            <span className="text-right">Pemasukan</span>
            <span className="text-right">Pengeluaran</span>
            <span className="text-right">Saldo</span>
          </div>
          {rows.map(({ tx, saldo }) => (
            <div key={tx.id} className={cx(kelasGridLap, 'border-b border-line-soft px-3 py-2.5 text-ink-label')}>
              <span className="text-ink-muted">{formatTanggal(tx.tanggal)}</span>
              <span>{tx.keterangan}</span>
              <span>{tx.kategori.nama}</span>
              <span className="text-right text-success-ink">{tx.jenis === 'masuk' ? rupiah(tx.nominal) : '—'}</span>
              <span className="text-right text-danger-ink">{tx.jenis === 'keluar' ? rupiah(tx.nominal) : '—'}</span>
              <span className={cx('text-right font-semibold', saldo < 0 ? 'text-danger-ink' : 'text-navy')}>{rupiah(saldo)}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="border-b border-line-soft px-3 py-6 text-center text-ink-muted">Belum ada transaksi yang dapat dilaporkan.</div>
          )}
          <div className={cx(kelasGridLap, 'bg-surface-soft p-3 font-bold text-navy')}>
            <span />
            <span>Total</span>
            <span />
            <span className="text-right text-success-ink">{totIn}</span>
            <span className="text-right text-danger-ink">{totOut}</span>
            <span className="text-right">{rupiah(saldoAkhir)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10 pt-5 text-[13px] text-ink-body print:break-inside-avoid">
        <div className="flex flex-col gap-14">
          <span>Disusun oleh,</span>
          <span className="border-t border-navy pt-2 font-bold text-navy">
            {penyusun?.nama ?? '—'}
            <br />
            <span className="font-medium text-ink-muted">{penyusun ? (penyusun.jabatan ?? LABEL_PERAN[penyusun.peran]) : ''}</span>
          </span>
        </div>
        <div className="flex flex-col gap-14">
          <span>Disetujui oleh,</span>
          <span className="border-t border-navy pt-2 font-bold text-navy">
            {event.pic.nama}
            <br />
            <span className="font-medium text-ink-muted">PIC Event</span>
          </span>
        </div>
      </div>
    </article>
  );
}

/* ---------- Rekap untung/rugi ---------- */

const KOLOM_REKAP = 'minmax(220px,2fr) 110px 120px 130px 130px 140px 160px';

export function RekapEvent({ rows, organisasi }: { rows: BarisRekap[]; organisasi: string | null }) {
  return (
    <Card flat className="animate-fade-up overflow-hidden">
      <div className="px-5 py-[18px]">
        <div className="text-base font-bold text-navy">Rekap Keuntungan / Kerugian per Event</div>
        <div className="mt-0.5 text-[13px] text-ink-muted">Seluruh event{organisasi ? ` ${organisasi}` : ''}</div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid gap-3 bg-surface-muted px-5 py-3 text-xs font-semibold text-ink-muted" style={{ gridTemplateColumns: KOLOM_REKAP }}>
            <span>Event</span>
            <span>Tanggal</span>
            <span>Status</span>
            <span className="text-right">Pemasukan</span>
            <span className="text-right">Pengeluaran</span>
            <span className="text-right">Untung / Rugi</span>
            <span>Margin</span>
          </div>
          {rows.map(({ event: e, masuk, keluar, jumlahTransaksi }) => {
            const p = masuk - keluar;
            const m = margin({ masuk, saldo: p });
            return (
              <div key={e.id} className="grid items-center gap-3 border-t border-line-soft px-5 py-[13px] text-[13px] text-ink-label" style={{ gridTemplateColumns: KOLOM_REKAP }}>
                <span className="font-semibold text-navy">{e.nama}</span>
                <span className="text-ink-muted">{formatTanggal(e.tanggal)}</span>
                <span>
                  <Badge status={LABEL_STATUS_EVENT[e.status]} size="md" />
                </span>
                <span className="text-right text-success-ink">{rupiah(masuk)}</span>
                <span className="text-right text-danger-ink">{rupiah(keluar)}</span>
                <span className="text-right font-bold" style={{ color: p < 0 ? '#BE3530' : p > 0 ? '#157347' : '#7A869A' }}>
                  {(p < 0 ? '− ' : '') + rupiah(Math.abs(p))}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <span className="block h-full" style={{ width: `${Math.max(0, Math.min(100, Math.abs(m)))}%`, background: m < 0 ? '#D93A35' : '#1E9E63' }} />
                  </span>
                  <span className="w-9 text-right text-xs">{jumlahTransaksi ? m + '%' : '—'}</span>
                </span>
              </div>
            );
          })}
          {rows.length === 0 && <div className="border-t border-line-soft px-5 py-10 text-center text-sm text-ink-muted">Tidak ada event dengan filter ini.</div>}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Laporan administrasi ---------- */

export interface DataAdministrasi {
  dokumen: Dokumen[];
  peserta: Peserta[];
  vendor: Vendor[];
  tugas: Tugas[];
}

export function barisAdministrasi(event: EventDetail, d: DataAdministrasi): [string, string, string][] {
  const hadir = d.peserta.filter((p) => p.kehadiran === 'hadir').length;
  const absen = d.peserta.filter((p) => p.kehadiran === 'tidak_hadir').length;
  const selesai = d.tugas.filter((t) => t.selesai).length;
  const v = totalVendor(d.vendor);
  const tim = new Set([event.pic.id, ...event.anggota.map((a) => a.id)]).size;
  return [
    ['Dokumen', `${d.dokumen.length} dokumen`, `${d.dokumen.filter((x) => x.status === 'menunggu' || x.status === 'draft').length} masih menunggu / draft`],
    ['Peserta', `${d.peserta.length} peserta`, `${hadir} hadir, ${absen} tidak hadir`],
    ['Vendor', `${d.vendor.length} vendor`, `${rupiah(v.total)} nilai kontrak, ${rupiah(v.terbayar)} terbayar`],
    ['Tim', `${tim} anggota`, `PIC: ${event.pic.nama}`],
    ['Kebutuhan Event', `${selesai} / ${d.tugas.length} selesai`, `${d.tugas.length - selesai} tugas tersisa`],
  ];
}

export function LaporanAdministrasi({ event, data }: { event: EventDetail; data: DataAdministrasi }) {
  return (
    <Card flat className="flex animate-fade-up flex-col gap-1 p-6">
      <div className="mb-2.5 text-base font-bold text-navy">Laporan Administrasi · {event.nama}</div>
      {barisAdministrasi(event, data).map(([k, v, n]) => (
        <div key={k} className="grid grid-cols-[minmax(120px,180px)_minmax(120px,180px)_1fr] gap-4 border-t border-line-soft py-3.5 text-[13px]">
          <span className="font-semibold text-ink-muted">{k}</span>
          <span className="font-bold text-navy">{v}</span>
          <span className="text-ink-body">{n}</span>
        </div>
      ))}
    </Card>
  );
}
