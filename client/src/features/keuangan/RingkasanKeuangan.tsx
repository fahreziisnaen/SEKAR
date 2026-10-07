import { useState } from 'react';
import { Modal, TombolTutup } from '../../components/Modal';
import { PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button, Card, CardTitle, MoneyInput, Progress } from '../../components/ui';
import { useIzin, useMaster, useSimpanAnggaran } from '../../hooks/queries';
import { errorMessage } from '../../lib/api';
import { rupiah } from '../../lib/format';
import { budgetVsRealisasi, perKategori, type BarKategori } from '../../lib/keuangan';
import type { EventDetail, Transaksi } from '../../types';

function BarKat({ judul, bars, warna, track }: { judul: string; bars: BarKategori[]; warna: string; track: string }) {
  return (
    <Card flat className="flex flex-col gap-4 p-6">
      <div className="text-base font-bold text-navy">{judul}</div>
      {bars.length === 0 && <div className="text-[13px] text-ink-muted">Belum ada transaksi.</div>}
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-ink-label">{b.label}</span>
            <span className="font-bold whitespace-nowrap text-navy">
              {rupiah(b.nilai)} <span className="font-medium text-ink-subtle">· {b.porsi}%</span>
            </span>
          </div>
          <Progress value={b.lebar} color={warna} track={track} className="h-2.5" label={b.label} />
        </div>
      ))}
    </Card>
  );
}

function Legenda({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: c }} />
      {l}
    </span>
  );
}

function AnggaranModal({ event, onClose }: { event: EventDetail; onClose: () => void }) {
  const master = useMaster();
  const simpan = useSimpanAnggaran(event.id);
  const toast = useToast();
  const kategori = (master.data?.kategori ?? []).filter((k) => k.jenis === 'keluar');
  const [nilai, setNilai] = useState<Record<number, string>>(() => Object.fromEntries(event.anggaran.map((a) => [a.kategoriId, String(a.nominal)])));
  const total = Object.values(nilai).reduce((s, v) => s + Number(v || 0), 0);

  const kirim = () =>
    simpan.mutate(
      kategori.map((k) => ({ kategoriId: k.id, nominal: Number(nilai[k.id] || 0) })),
      {
        onSuccess: () => {
          toast('Budget per kategori disimpan');
          onClose();
        },
      },
    );

  return (
    <Modal onClose={onClose} align="top" className="max-w-[560px] rounded-3xl shadow-modal">
      {(titleId) => (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-[26px] py-[22px]">
            <div>
              <div id={titleId} className="font-display text-[22px] font-bold text-navy">
                Atur Budget per Kategori
              </div>
              <div className="mt-0.5 text-[13px] text-ink-muted">Kosongkan kategori yang tidak dianggarkan</div>
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <div className="flex flex-col gap-3 px-[26px] py-6">
            {kategori.map((k) => (
              <label key={k.id} className="grid grid-cols-[minmax(110px,160px)_1fr] items-center gap-3 text-[13px] font-semibold text-ink-label">
                {k.nama}
                <MoneyInput value={nilai[k.id] ?? ''} onChange={(v) => setNilai((s) => ({ ...s, [k.id]: v }))} aria-label={`Budget ${k.nama}`} />
              </label>
            ))}
            {kategori.length === 0 && <div className="text-[13px] text-ink-muted">Belum ada kategori pengeluaran. Tambahkan di menu Pengaturan.</div>}
            <div className="flex items-center justify-between rounded-[14px] bg-surface-soft px-[18px] py-3.5 text-[13px]">
              <span className="text-ink-body">Total rincian · budget event {rupiah(event.budget)}</span>
              <span className="font-display text-lg font-bold text-navy">{rupiah(total)}</span>
            </div>
            <PesanGalat>{simpan.error ? errorMessage(simpan.error) : ''}</PesanGalat>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line-soft px-[26px] py-[18px]">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button onClick={kirim} disabled={simpan.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              Simpan Budget
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function RingkasanKeuangan({ event, list }: { event: EventDetail; list: Transaksi[] }) {
  const master = useMaster();
  const boleh = useIzin();
  const [atur, setAtur] = useState(false);
  const b = budgetVsRealisasi(event.anggaran, master.data?.kategori ?? [], list);
  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-5">
        <BarKat judul="Pemasukan per Kategori" bars={perKategori(list, 'masuk')} warna="#1E9E63" track="#EEF6F1" />
        <BarKat judul="Pengeluaran per Kategori" bars={perKategori(list, 'keluar')} warna="#E5574F" track="#FBF0F0" />
      </div>
      <Card flat className="flex flex-col gap-[18px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardTitle
            title="Budget vs Realisasi"
            sub={`Budget ${rupiah(b.totalBudget)} · Realisasi ${rupiah(b.totalRealisasi)} · Sisa ${rupiah(b.totalBudget - b.totalRealisasi)}`}
          />
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-ink-body">
            <Legenda c="#D5DCE7" l="Budget" />
            <Legenda c="#2F6FED" l="Realisasi" />
            <Legenda c="#D93A35" l="Melebihi" />
            {boleh('tulisKeuangan') && (
              <Button variant="secondary" onClick={() => setAtur(true)} className="px-3 py-2 text-xs">
                Atur Budget
              </Button>
            )}
          </div>
        </div>
        {b.rows.length === 0 && <div className="text-[13px] text-ink-muted">Belum ada budget per kategori maupun pengeluaran.</div>}
        {b.rows.map((row) => (
          <div key={row.kategoriId} className="grid grid-cols-[minmax(90px,130px)_1fr_minmax(150px,auto)] items-center gap-4 text-[13px]">
            <span className="font-semibold text-ink-label">{row.kat}</span>
            <div className="flex flex-col gap-1">
              <Progress value={row.lebarBudget} color="#D5DCE7" track="#F1F4F9" className="h-2" label={`Budget ${row.kat}`} />
              <Progress value={row.lebarRealisasi} color={row.melebihi ? '#D93A35' : '#2F6FED'} track="#F1F4F9" className="h-2" label={`Realisasi ${row.kat}`} />
            </div>
            <span className="flex flex-col items-end gap-0.5">
              <span className="font-bold text-navy">
                {rupiah(row.realisasi)} <span className="font-medium text-ink-subtle">/ {rupiah(row.budget)}</span>
              </span>
              <span className="text-[11px] font-semibold" style={{ color: row.melebihi ? '#BE3530' : '#157347' }}>
                {row.pct === null ? '—' : row.pct + '%'} · {row.pct === null ? 'Tidak dianggarkan' : row.melebihi ? 'Melebihi budget' : 'Sesuai budget'}
              </span>
            </span>
          </div>
        ))}
      </Card>
      {atur && <AnggaranModal event={event} onClose={() => setAtur(false)} />}
    </div>
  );
}
