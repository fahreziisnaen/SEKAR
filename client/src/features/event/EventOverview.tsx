import { Link } from 'react-router';
import { Icon } from '../../components/icons';
import { useOverlays } from '../../components/Overlays';
import { Badge, Card, Inisial, Progress, cx } from '../../components/ui';
import { formatTanggal, formatTanggalPanjang, persen, rupiah } from '../../lib/format';
import { useDokumen, usePeserta, useTransaksi, useVendor } from '../../hooks/queries';
import { capaian, ringkas } from '../../lib/keuangan';
import { LABEL_STATUS_EVENT, TAHAP, statusBayar } from '../../lib/label';
import { warnaAvatar, warnaEkstensi } from '../../lib/warna';
import type { EventDetail, EventRingkas } from '../../types';
import { IkonJenis, nominalBertanda, warnaJenis } from '../keuangan/DaftarTransaksi';
import { IkonKotak, kartuKeuangan } from '../keuangan/KartuKeuangan';

function TautanKecil({ to, children, className }: { to: string; children: string; className?: string }) {
  return (
    <Link to={to} className={cx('font-semibold text-primary', className ?? 'text-xs')}>
      {children}
    </Link>
  );
}

export function tahapEvent(e: Pick<EventRingkas, 'status' | 'tahap'>) {
  const selesai = e.status === 'selesai';
  return TAHAP.map((label, i) => ({ label, st: selesai || i < e.tahap ? 'done' : i === e.tahap ? 'cur' : 'todo' }) as const);
}

export function EventOverview({ event: e }: { event: EventDetail }) {
  const { lihatTransaksi } = useOverlays();
  const tx = useTransaksi(e.id);
  const pesertaQ = usePeserta(e.id);
  const vendorQ = useVendor(e.id);
  const dokumenQ = useDokumen(e.id);
  const base = `/event/${e.id}`;
  const terbaru = [...ringkas(tx.data ?? []).list].reverse().slice(0, 5);
  const goals = capaian(e, e.targetPemasukan, e.budget);
  const peserta = pesertaQ.data ?? [];
  const ps0 = peserta.length;
  const ps1 = peserta.filter((p) => p.registrasi === 'terverifikasi').length;
  const ps2 = peserta.filter((p) => p.kehadiran === 'hadir').length;
  const vendor = vendorQ.data ?? [];
  const dokumen = dokumenQ.data ?? [];
  // PIC selalu tampil di kartu tim walau tidak dicentang sebagai anggota.
  const tim = e.anggota.some((a) => a.id === e.pic.id) ? e.anggota : [{ id: e.pic.id, nama: e.pic.nama, jabatan: null }, ...e.anggota];
  const tahap = tahapEvent(e);

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <div className="flex flex-col gap-3 rounded-[20px] bg-navy p-5 text-white">
          <span className="text-[11px] font-bold tracking-[.1em] text-on-navy-muted">STATUS · PROGRES</span>
          <span className="font-display text-2xl font-bold">{LABEL_STATUS_EVENT[e.status]}</span>
          <div className="flex items-center gap-2.5">
            <Progress value={e.progress} color="#F5B800" track="rgba(255,255,255,.14)" className="h-[7px] flex-1" label="Progres event" />
            <span className="text-sm font-bold text-accent">{e.progress}%</span>
          </div>
        </div>
        {kartuKeuangan(e).map((k) => (
          <Card key={k.label} className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <IkonKotak k={k} size={32} radius={10} iconSize={17} />
              <span className="text-[13px] font-medium text-ink-slate">{k.label}</span>
            </div>
            <span className="font-display text-[22px] font-bold whitespace-nowrap" style={{ color: k.vc }}>
              {k.value}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-5">
        <Card className="flex flex-col gap-1.5 p-6">
          <div className="mb-2 text-base font-bold text-navy">Informasi Event</div>
          <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[13px]">
            {(
              [
                ['Nama event', e.nama],
                ['Tanggal', formatTanggalPanjang(e.tanggal)],
                ['Jam', e.waktu || '-'],
                ['Lokasi', [e.venue, e.lokasi].filter(Boolean).join(', ')],
                ['PIC', e.pic.nama],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="m-0 font-semibold text-navy">{v}</dd>
              </div>
            ))}
            <dt className="text-ink-muted">Status</dt>
            <dd className="m-0">
              <Badge status={LABEL_STATUS_EVENT[e.status]} />
            </dd>
            <dt className="text-ink-muted">Deskripsi</dt>
            <dd className="m-0 leading-[1.55] text-ink-label">{e.deskripsi || '-'}</dd>
          </dl>
        </Card>
        <Card className="flex flex-col p-6">
          <div className="mb-[18px] text-base font-bold text-navy">Timeline Event</div>
          <ol className="m-0 list-none p-0">
            {tahap.map((t, i) => (
              <li key={t.label} className="flex gap-3.5" aria-current={t.st === 'cur' ? 'step' : undefined}>
                <div className="flex flex-col items-center">
                  <span
                    className={cx(
                      'flex size-[30px] flex-none items-center justify-center rounded-full border-2 text-xs font-bold',
                      t.st === 'done' && 'border-transparent bg-success text-white',
                      t.st === 'cur' && 'border-transparent bg-primary text-white shadow-[0_0_0_5px_rgba(47,111,237,.16)]',
                      t.st === 'todo' && 'border-track bg-white text-ink-subtle',
                    )}
                  >
                    {t.st === 'done' ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  {i < tahap.length - 1 && <span className={cx('h-[22px] w-0.5', t.st === 'done' ? 'bg-success' : 'bg-line-ctl')} />}
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <span className={cx('text-sm font-semibold', t.st === 'todo' ? 'text-ink-muted' : 'text-navy')}>{t.label}</span>
                  <span className={cx('text-xs', t.st === 'cur' ? 'text-primary' : 'text-ink-muted')}>
                    {t.st === 'done' ? 'Selesai' : t.st === 'cur' ? 'Sedang berjalan' : 'Belum dimulai'}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-5">
        <Card className="flex flex-col gap-1 p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-bold text-navy">Transaksi Terbaru</div>
            <TautanKecil to={`${base}/keuangan`} className="text-[13px]">
              Semua →
            </TautanKecil>
          </div>
          {terbaru.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => lihatTransaksi(x)}
              className="-mx-3 flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-3 py-2.5 text-left hover:bg-surface-soft"
            >
              <IkonJenis x={x} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-navy">{x.keterangan}</span>
                <span className="text-xs text-ink-muted">
                  {formatTanggal(x.tanggal)} · {x.kategori.nama}
                </span>
              </span>
              <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: warnaJenis(x).fg }}>
                {nominalBertanda(x)}
              </span>
            </button>
          ))}
          {terbaru.length === 0 && <div className="py-5 text-[13px] text-ink-muted">Belum ada transaksi untuk event ini.</div>}
        </Card>
        <Card className="flex flex-col gap-[18px] p-6">
          <div className="text-base font-bold text-navy">Grafik Keuangan</div>
          {goals.map((g, i) => (
            <div key={g.label} className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-body">{g.label}</span>
                <span className="font-bold text-navy">{g.pct}%</span>
              </div>
              <Progress
                value={g.lebar}
                color={i === 0 ? '#1E9E63' : e.keluar > (e.budget || 0) ? '#D93A35' : '#F5B800'}
                className="h-3"
                label={g.label}
              />
              <span className="text-xs text-ink-muted">
                {rupiah(g.nilai)} / {rupiah(g.acuan)}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-navy">Kebutuhan Event</span>
              <span className="text-xs text-ink-muted">
                {e.tugasSelesai} / {e.tugasTotal} selesai
              </span>
            </div>
            <Progress value={persen(e.tugasSelesai, e.tugasTotal)} color="#1E9E63" className="h-2" label="Kebutuhan selesai" />
            <TautanKecil to={`${base}/administrasi`} className="self-start text-[13px]">
              Lihat kebutuhan →
            </TautanKecil>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
        <Card flat className="flex flex-col gap-3.5 p-[22px]">
          <div className="flex justify-between">
            <span className="text-[15px] font-bold text-navy">Peserta</span>
            <TautanKecil to={`${base}/peserta`}>Detail →</TautanKecil>
          </div>
          <span className="font-display text-[34px] leading-none font-bold text-navy">{ps0}</span>
          <span className="text-xs text-ink-muted">
            {ps1} registrasi · {ps2} hadir
          </span>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 bg-primary-soft" style={{ width: `${persen(ps1, ps0)}%` }} />
            <div className="absolute inset-y-0 left-0 bg-success" style={{ width: `${persen(ps2, ps0)}%` }} />
          </div>
        </Card>
        <Card flat className="flex flex-col gap-2.5 p-[22px]">
          <div className="flex justify-between">
            <span className="text-[15px] font-bold text-navy">Vendor</span>
            <TautanKecil to={`${base}/vendor`}>Detail →</TautanKecil>
          </div>
          {vendor.slice(0, 4).map((v) => (
            <div key={v.nama} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-navy">{v.nama}</span>
                <span className="text-[11px] text-ink-muted">{v.kategori}</span>
              </span>
              <Badge status={statusBayar(v.nilaiKontrak, v.terbayar)} size="sm" />
            </div>
          ))}
          {vendor.length === 0 && <span className="text-xs text-ink-muted">Belum ada vendor.</span>}
        </Card>
        <Card flat className="flex flex-col gap-3 p-[22px]">
          <div className="flex justify-between">
            <span className="text-[15px] font-bold text-navy">Tim</span>
            <TautanKecil to={`${base}/administrasi`}>Detail →</TautanKecil>
          </div>
          {tim.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <Inisial nama={m.nama} warna={warnaAvatar(i)} className="size-[30px] rounded-full text-[11px]" />
              <span className="flex-1 text-[13px] font-semibold text-navy">{m.nama}</span>
              <span className="text-xs text-ink-muted">{m.id === e.pic.id ? 'PIC' : (m.jabatan ?? '')}</span>
            </div>
          ))}
        </Card>
        <Card flat className="flex flex-col gap-2.5 p-[22px]">
          <div className="flex justify-between">
            <span className="text-[15px] font-bold text-navy">Dokumen</span>
            <TautanKecil to={`${base}/dokumen`}>Detail →</TautanKecil>
          </div>
          {dokumen.slice(0, 4).map((doc) => {
            const [bg, fg] = warnaEkstensi(doc.file.ext);
            return (
              <div key={doc.id} className="flex items-center gap-2.5 text-[13px]">
                <span className="rounded-md px-1.5 py-[3px] font-mono text-[10px] font-bold" style={{ background: bg, color: fg }}>
                  {doc.file.ext.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-navy">{doc.nama}</span>
                <span className="text-[11px] whitespace-nowrap text-ink-muted">{formatTanggal(doc.diunggahPada.slice(0, 10))}</span>
              </div>
            );
          })}
          {dokumen.length === 0 && <span className="text-xs text-ink-muted">Belum ada dokumen.</span>}
        </Card>
      </div>
    </div>
  );
}
