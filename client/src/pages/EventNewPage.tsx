import { useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Icon } from '../components/icons';
import { PesanGalat } from '../components/Status';
import { useToast } from '../components/Toast';
import { Button, Card, Field, Input, MoneyInput, Select, TextArea, cx } from '../components/ui';
import { useEventAktif } from '../hooks/eventAktif';
import { useBuatEvent, useIzin, useMaster, usePengguna, useUnggahDokumen } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatTanggalPanjang, rupiah } from '../lib/format';
import { namaDariFile, TERIMA_DOKUMEN } from '../features/dokumen/UnggahModal';
import { PilihTim } from '../features/event/EventFormModal';
import type { Ref } from '../types';

const LANGKAH = ['Informasi Event', 'Tim', 'Keuangan', 'Administrasi', 'Review'];

export interface Draf {
  nama: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  venue: string;
  deskripsi: string;
  templateId: number | null;
  picId: number | null;
  anggotaIds: number[];
  budget: string;
  targetPemasukan: string;
  estimasiPengeluaran: string;
}

const DRAF_KOSONG: Draf = {
  nama: '',
  tanggal: '',
  waktu: '',
  lokasi: '',
  venue: '',
  deskripsi: '',
  templateId: null,
  picId: null,
  anggotaIds: [],
  budget: '',
  targetPemasukan: '',
  estimasiPengeluaran: '',
};

/** Pesan galat langkah, atau string kosong bila langkah valid. */
export function validasiLangkah(langkah: number, d: Draf): string {
  if (langkah === 1 && (!d.nama.trim() || !d.tanggal || !d.lokasi.trim())) return 'Lengkapi nama event, tanggal, dan lokasi terlebih dahulu.';
  if (langkah === 2 && !d.picId) return 'Pilih PIC yang bertanggung jawab atas event ini.';
  if (langkah === 3 && !Number(d.budget)) return 'Isi budget event untuk memantau pengeluaran.';
  return '';
}

interface Unggahan {
  file: File | null;
  jenisId: number;
}

/** Jenis dokumen bawaan per kotak unggah dicocokkan dari namanya; tetap bisa diganti. */
function jenisBawaan(jenis: Ref[], pola: RegExp): number {
  return (jenis.find((j) => pola.test(j.nama)) ?? jenis[0])?.id ?? 0;
}

function KotakUnggah({ judul, petunjuk, nilai, jenis, onChange }: { judul: string; petunjuk: string; nilai: Unggahan; jenis: Ref[]; onChange: (u: Unggahan) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <input ref={ref} type="file" accept={TERIMA_DOKUMEN} className="hidden" onChange={(e) => onChange({ ...nilai, file: e.target.files?.[0] ?? nilai.file })} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-line-dash bg-surface-muted px-5 py-7 hover:border-primary"
      >
        <Icon name="fileUp" size={28} strokeWidth={1.8} stroke="#2F6FED" />
        <span className="text-sm font-bold text-navy">{judul}</span>
        {nilai.file ? <span className="text-xs font-semibold text-success-ink">✓ {nilai.file.name}</span> : <span className="text-xs text-ink-muted">{petunjuk}</span>}
      </button>
      {nilai.file && (
        <div className="flex items-center gap-2">
          <Select value={nilai.jenisId} onChange={(e) => onChange({ ...nilai, jenisId: Number(e.target.value) })} aria-label={`Jenis ${judul}`} className="flex-1 py-2 text-[13px]">
            {jenis.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => onChange({ ...nilai, file: null })} className="px-3 py-2 text-xs">
            Hapus
          </Button>
        </div>
      )}
    </div>
  );
}

function Judul({ children }: { children: ReactNode }) {
  return <div className="text-lg font-bold text-navy">{children}</div>;
}

export function EventNewPage() {
  const boleh = useIzin();
  const master = useMaster();
  const pengguna = usePengguna();
  const buat = useBuatEvent();
  const unggah = useUnggahDokumen();
  const { pilih } = useEventAktif();
  const navigate = useNavigate();
  const toast = useToast();
  const [langkah, setLangkah] = useState(1);
  const [d, setD] = useState<Draf>(DRAF_KOSONG);
  const [err, setErr] = useState('');
  const jenis = master.data?.jenisDokumen ?? [];
  const [proposal, setProposal] = useState<Unggahan>({ file: null, jenisId: 0 });
  const [dokAwal, setDokAwal] = useState<Unggahan>({ file: null, jenisId: 0 });

  if (!boleh('tulisEvent')) return <Navigate to="/event" replace />;

  const aktif = (pengguna.data ?? []).filter((p) => p.aktif);
  const template = master.data?.template ?? [];
  const ubah = (patch: Partial<Draf>) => {
    setD((s) => ({ ...s, ...patch }));
    setErr('');
  };
  const num = (k: 'budget' | 'targetPemasukan' | 'estimasiPengeluaran') => Number(d[k] || 0);
  const memproses = buat.isPending || unggah.isPending;

  const lanjut = () => {
    const e = validasiLangkah(langkah, d);
    if (e) return setErr(e);
    setLangkah(Math.min(5, langkah + 1));
  };

  const kirim = async () => {
    // Validasi ulang seluruh langkah: data bisa berubah setelah kembali ke langkah sebelumnya.
    for (const l of [1, 2, 3]) {
      const e = validasiLangkah(l, d);
      if (e) {
        setLangkah(l);
        return setErr(e);
      }
    }
    let eventId: number;
    try {
      const ev = await buat.mutateAsync({
        nama: d.nama.trim(),
        tanggal: d.tanggal,
        waktu: d.waktu.trim(),
        lokasi: d.lokasi.trim(),
        venue: d.venue.trim(),
        deskripsi: d.deskripsi.trim(),
        templateId: d.templateId,
        picId: d.picId!,
        anggotaIds: d.anggotaIds,
        budget: num('budget'),
        targetPemasukan: num('targetPemasukan'),
        estimasiPengeluaran: num('estimasiPengeluaran'),
      });
      eventId = ev.id;
    } catch (e) {
      return setErr(errorMessage(e));
    }
    // Event sudah tersimpan; kegagalan unggah tidak membatalkannya, cukup diberitahukan.
    const gagal: string[] = [];
    for (const [u, pola] of [
      [proposal, /proposal/i],
      [dokAwal, /rundown/i],
    ] as const) {
      if (!u.file) continue;
      try {
        await unggah.mutateAsync({ eventId, nama: namaDariFile(u.file.name), jenisId: u.jenisId || jenisBawaan(jenis, pola), file: u.file });
      } catch (e) {
        gagal.push(`${u.file.name}: ${errorMessage(e)}`);
      }
    }
    pilih(eventId);
    toast(gagal.length ? `Event dibuat, tetapi ${gagal.length} dokumen gagal diunggah` : `Event “${d.nama.trim()}” berhasil dibuat`);
    navigate(`/event/${eventId}`);
  };

  const estP = num('targetPemasukan') - num('estimasiPengeluaran');
  const namaPengguna = (id: number | null) => aktif.find((p) => p.id === id)?.nama ?? '-';
  const review: [string, string][] = [
    ['Nama Event', d.nama],
    ['Tanggal', d.tanggal ? formatTanggalPanjang(d.tanggal) : '-'],
    ['Jam', d.waktu || '-'],
    ['Lokasi', [d.venue, d.lokasi].filter(Boolean).join(', ')],
    ['PIC', namaPengguna(d.picId)],
    ['Tim', d.anggotaIds.length ? d.anggotaIds.map(namaPengguna).join(', ') : 'Belum dipilih'],
    ['Template kebutuhan', template.find((t) => t.id === d.templateId)?.nama ?? 'Tanpa template'],
    ['Budget', rupiah(num('budget'))],
    ['Target Pemasukan', rupiah(num('targetPemasukan'))],
    ['Estimasi Pengeluaran', rupiah(num('estimasiPengeluaran'))],
    ['Dokumen', [proposal.file && 'Proposal', dokAwal.file && 'Dokumen awal'].filter(Boolean).join(', ') || 'Belum ada'],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[920px] animate-fade-up flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5">
        <Link to="/event" className="self-start text-[13px] font-semibold">
          ← Kembali ke Event
        </Link>
        <h1 className="m-0 font-display text-[32px] font-bold tracking-[-.02em] text-navy">Buat Event Baru</h1>
        <div className="text-sm text-ink-slate">Lima langkah singkat. Semua data bisa diubah nanti.</div>
      </div>

      <ol className="m-0 flex list-none items-start overflow-x-auto p-0 pb-1" aria-label="Langkah pembuatan event">
        {LANGKAH.map((label, i) => {
          const n = i + 1;
          const selesai = n < langkah;
          const kini = n === langkah;
          return (
            <li key={label} className="flex min-w-[120px] flex-1 items-start">
              <button
                type="button"
                onClick={() => n < langkah && setLangkah(n)}
                aria-current={kini ? 'step' : undefined}
                disabled={n > langkah}
                className="flex w-24 flex-none cursor-pointer flex-col items-center gap-2 border-none bg-transparent p-0 disabled:cursor-default"
              >
                <span
                  className={cx(
                    'flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold',
                    selesai && 'border-transparent bg-success text-white',
                    kini && 'border-transparent bg-primary text-white',
                    !selesai && !kini && 'border-track bg-white text-ink-muted',
                  )}
                >
                  {selesai ? <Icon name="check" size={16} strokeWidth={3} /> : n}
                </span>
                <span className={cx('text-center text-xs font-semibold', selesai || kini ? 'text-navy' : 'text-ink-muted')}>{label}</span>
              </button>
              {n < LANGKAH.length && <span className={cx('mt-[18px] h-0.5 min-w-4 flex-1', selesai ? 'bg-success' : 'bg-line-ctl')} />}
            </li>
          );
        })}
      </ol>

      <Card className="flex flex-col gap-[22px] rounded-[22px] p-5 sm:p-7">
        {langkah === 1 && (
          <div className="flex flex-col gap-[18px]">
            <Judul>Informasi Event</Judul>
            <Field label="Nama Event *">
              <Input value={d.nama} maxLength={160} onChange={(e) => ubah({ nama: e.target.value })} placeholder="Contoh: Music Night 2025" />
            </Field>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Field label="Tanggal *">
                <Input type="date" value={d.tanggal} onChange={(e) => ubah({ tanggal: e.target.value })} className="py-[11px]" />
              </Field>
              <Field label="Jam">
                <Input value={d.waktu} maxLength={60} onChange={(e) => ubah({ waktu: e.target.value })} placeholder="08.00 – 17.00 WIB" />
              </Field>
              <Field label="Lokasi *">
                <Input value={d.lokasi} maxLength={120} onChange={(e) => ubah({ lokasi: e.target.value })} placeholder="Kota" />
              </Field>
              <Field label="Venue">
                <Input value={d.venue} maxLength={200} onChange={(e) => ubah({ venue: e.target.value })} placeholder="Nama tempat / gedung" />
              </Field>
            </div>
            <Field label="Deskripsi">
              <TextArea rows={4} value={d.deskripsi} onChange={(e) => ubah({ deskripsi: e.target.value })} placeholder="Tujuan dan gambaran singkat event" />
            </Field>
            {template.length > 0 && (
              <Field label="Template kebutuhan" className="max-w-[360px]">
                <Select value={d.templateId ?? ''} onChange={(e) => ubah({ templateId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Tanpa template</option>
                  {template.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} ({t.tugas.length} kebutuhan)
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        {langkah === 2 && (
          <div className="flex flex-col gap-[18px]">
            <Judul>Tim</Judul>
            <Field label="PIC *" className="max-w-[360px]">
              <Select value={d.picId ?? ''} onChange={(e) => ubah({ picId: e.target.value ? Number(e.target.value) : null })} className="py-3">
                <option value="">Pilih PIC</option>
                {aktif.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="text-[13px] font-semibold text-ink-label">Tim event</div>
            <PilihTim pengguna={aktif} terpilih={d.anggotaIds} onChange={(anggotaIds) => ubah({ anggotaIds })} />
          </div>
        )}

        {langkah === 3 && (
          <div className="flex flex-col gap-[18px]">
            <Judul>Keuangan</Judul>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Field label="Budget *">
                <MoneyInput value={d.budget} onChange={(budget) => ubah({ budget })} />
              </Field>
              <Field label="Target pemasukan">
                <MoneyInput value={d.targetPemasukan} onChange={(targetPemasukan) => ubah({ targetPemasukan })} />
              </Field>
              <Field label="Estimasi pengeluaran">
                <MoneyInput value={d.estimasiPengeluaran} onChange={(estimasiPengeluaran) => ubah({ estimasiPengeluaran })} />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-[14px] bg-surface-soft px-[18px] py-4">
              <span className="text-[13px] text-ink-body">{estP < 0 ? 'Estimasi kerugian' : 'Estimasi keuntungan'}</span>
              <span className={cx('font-display text-xl font-bold', estP < 0 ? 'text-danger-ink' : 'text-success-ink')}>{rupiah(estP)}</span>
            </div>
          </div>
        )}

        {langkah === 4 && (
          <div className="flex flex-col gap-[18px]">
            <Judul>Administrasi</Judul>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              <KotakUnggah
                judul="Upload proposal"
                petunjuk="PDF, DOCX, atau gambar"
                nilai={{ ...proposal, jenisId: proposal.jenisId || jenisBawaan(jenis, /proposal/i) }}
                jenis={jenis}
                onChange={setProposal}
              />
              <KotakUnggah
                judul="Dokumen awal"
                petunjuk="Rundown, surat, dll."
                nilai={{ ...dokAwal, jenisId: dokAwal.jenisId || jenisBawaan(jenis, /rundown/i) }}
                jenis={jenis}
                onChange={setDokAwal}
              />
            </div>
          </div>
        )}

        {langkah === 5 && (
          <div className="flex flex-col gap-3.5">
            <Judul>Review</Judul>
            <div className="text-[13px] text-ink-slate">Periksa kembali sebelum event dibuat.</div>
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-7">
              {review.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line-soft py-3 text-[13px]">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="m-0 text-right font-semibold text-navy">{v || '-'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <PesanGalat>{err}</PesanGalat>
        <div className="flex justify-between gap-3 border-t border-line-soft pt-1.5">
          {langkah > 1 && (
            <Button
              variant="secondary"
              onClick={() => {
                setLangkah(langkah - 1);
                setErr('');
              }}
              className="mt-4 px-[18px] py-3 text-sm"
            >
              Kembali
            </Button>
          )}
          <span className="flex-1" />
          {langkah < 5 ? (
            <Button onClick={lanjut} className="mt-4 px-[22px] py-3 text-sm">
              Lanjut
            </Button>
          ) : (
            <Button variant="accent" onClick={() => void kirim()} disabled={memproses} className="mt-4 px-[22px] py-3 text-sm disabled:opacity-60">
              {memproses ? 'Menyimpan…' : 'Buat Event'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
