import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../components/icons';
import { Modal, TombolTutup } from '../../components/Modal';
import { useOverlays } from '../../components/Overlays';
import { BadgePilihan, GagalMemuat, Konfirmasi, Memuat, PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, CardTitle, Field, Inisial, Input, MoneyInput, Progress, Select, Tabel, TextArea, cx, kelasBaris } from '../../components/ui';
import {
  useDokumen,
  useHapusDokumen,
  useHapusPeserta,
  useHapusTugas,
  useHapusVendor,
  useImporPeserta,
  useIzin,
  usePengguna,
  usePeserta,
  useSimpanVendor,
  useTambahPeserta,
  useTambahTugas,
  useTugas,
  useUbahDokumen,
  useUbahPeserta,
  useUbahTugas,
  useVendor,
  type InputPeserta,
} from '../../hooks/queries';
import { downloadFile, errorMessage, fieldErrors } from '../../lib/api';
import { pesertaDariCsv } from '../../lib/csv';
import { formatTanggal, persen, rupiah } from '../../lib/format';
import { LABEL_KEHADIRAN, LABEL_PERAN, LABEL_REGISTRASI, LABEL_STATUS_DOKUMEN, LABEL_TIPE_PESERTA, statusBayar } from '../../lib/label';
import { warnaAvatar, warnaEkstensi } from '../../lib/warna';
import type { EventDetail, Peserta, Vendor } from '../../types';

function TombolHapus({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title="Hapus"
      aria-label={label}
      onClick={onClick}
      className="flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line-ctl bg-white text-base text-ink-muted hover:border-danger hover:text-danger"
    >
      ×
    </button>
  );
}

/* ---------- Dokumen ---------- */

const KOLOM_DOK = 'minmax(240px,2fr) 150px 110px 130px 160px 80px';

export function DokumenEvent({ eventId }: { eventId: number }) {
  const q = useDokumen(eventId);
  const ubah = useUbahDokumen();
  const hapus = useHapusDokumen();
  const boleh = useIzin();
  const { unggahDokumen } = useOverlays();
  const toast = useToast();
  const [hapusId, setHapusId] = useState<number | null>(null);
  const dokumen = q.data ?? [];
  const target = dokumen.find((d) => d.id === hapusId);
  const tulis = boleh('tulisEvent');

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[18px]">
        <CardTitle title="Dokumen Event" sub="Proposal, rundown, surat, kontrak, invoice, dan bukti pembayaran" />
        {tulis && (
          <Button onClick={() => unggahDokumen(eventId)} className="px-4 py-2.5 text-[13px]">
            Upload Dokumen
          </Button>
        )}
      </div>
      {q.isPending ? (
        <Memuat className="border-t border-line-soft" />
      ) : q.isError ? (
        <GagalMemuat error={q.error} onRetry={() => void q.refetch()} className="rounded-none border-x-0 border-b-0" />
      ) : dokumen.length === 0 ? (
        <div className="border-t border-line-soft px-5 py-10 text-center text-sm text-ink-muted">Belum ada dokumen untuk event ini.</div>
      ) : (
        <Tabel min={840} cols={KOLOM_DOK} kepala={['Nama Dokumen', 'Jenis', 'Tanggal', 'Status', 'Diunggah oleh', '>Aksi']}>
          {dokumen.map((d) => {
            const [xbg, xfg] = warnaEkstensi(d.file.ext);
            return (
              <div key={d.id} className={cx(kelasBaris, 'py-[13px] hover:bg-surface-hover')} style={{ gridTemplateColumns: KOLOM_DOK }}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-[42px] w-[38px] flex-none items-end justify-center rounded-[9px] pb-1.5 font-mono text-[10px] font-bold" style={{ background: xbg, color: xfg }}>
                    {d.file.ext.toUpperCase()}
                  </span>
                  <span className="font-semibold text-navy">{d.nama}</span>
                </span>
                <span>{d.jenis.nama}</span>
                <span className="text-ink-muted">{formatTanggal(d.diunggahPada.slice(0, 10))}</span>
                <span>
                  <BadgePilihan
                    value={d.status}
                    label={LABEL_STATUS_DOKUMEN[d.status]}
                    pilihan={LABEL_STATUS_DOKUMEN}
                    disabled={!tulis}
                    aria={`Status ${d.nama}`}
                    onChange={(status) => ubah.mutate({ id: d.id, status }, { onError: (e) => toast(errorMessage(e)) })}
                  />
                </span>
                <span className="flex items-center gap-2">
                  <Inisial nama={d.diunggahOleh.nama} warna={['#EEF1F6', '#33415C']} className="size-[26px] rounded-full text-[10px]" />
                  {d.diunggahOleh.nama}
                </span>
                <span className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    title="Unduh"
                    aria-label={`Unduh ${d.nama}`}
                    onClick={() => downloadFile(`/dokumen/${d.id}/unduh`).catch((e) => toast(errorMessage(e)))}
                    className="flex size-[34px] cursor-pointer items-center justify-center rounded-[10px] border border-line-ctl bg-white text-ink-label hover:border-primary hover:text-primary"
                  >
                    <Icon name="download" size={16} />
                  </button>
                  {tulis && <TombolHapus label={`Hapus ${d.nama}`} onClick={() => setHapusId(d.id)} />}
                </span>
              </div>
            );
          })}
        </Tabel>
      )}
      {target && (
        <Konfirmasi
          judul="Hapus dokumen?"
          pesan={
            <>
              Dokumen <b>{target.nama}</b> beserta berkasnya akan dihapus permanen.
            </>
          }
          label="Hapus"
          memproses={hapus.isPending}
          galat={hapus.error}
          onBatal={() => setHapusId(null)}
          onKonfirmasi={() => hapus.mutate(target.id, { onSuccess: () => setHapusId(null) })}
        />
      )}
    </Card>
  );
}

/* ---------- Peserta ---------- */

export function statistikPeserta(list: Peserta[]) {
  const total = list.length;
  const reg = list.filter((p) => p.registrasi === 'terverifikasi').length;
  const hadir = list.filter((p) => p.kehadiran === 'hadir').length;
  const absen = list.filter((p) => p.kehadiran === 'tidak_hadir').length;
  return [
    { label: 'Total Peserta', value: total, sub: 'Terdaftar di event', w: total ? 100 : 0, c: '#12264A' },
    { label: 'Sudah Registrasi', value: reg, sub: `${persen(reg, total)}% dari total`, w: persen(reg, total), c: '#2F6FED' },
    { label: 'Hadir', value: hadir, sub: `${persen(hadir, reg)}% dari registrasi`, w: persen(hadir, reg), c: '#1E9E63' },
    { label: 'Tidak Hadir', value: absen, sub: `${persen(absen, reg)}% dari registrasi`, w: persen(absen, reg), c: '#D93A35' },
  ];
}

const KOLOM_PESERTA = 'minmax(180px,1.4fr) minmax(200px,1.4fr) 140px 100px 130px 120px 36px';

const PESERTA_KOSONG: InputPeserta = { nama: '', email: '', telepon: '', tipe: 'umum', registrasi: 'menunggu', kehadiran: 'belum' };

function PesertaModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const tambah = useTambahPeserta(eventId);
  const toast = useToast();
  const [f, setF] = useState(PESERTA_KOSONG);
  const galat = fieldErrors(tambah.error);
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    tambah.mutate(f, {
      onSuccess: () => {
        toast(`Peserta ${f.nama} ditambahkan`);
        onClose();
      },
    });
  };
  return (
    <Modal onClose={onClose} className="max-w-[520px] rounded-3xl p-[26px]">
      {(titleId) => (
        <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center justify-between">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              Tambah Peserta
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <Field label="Nama *">
            <Input value={f.nama} maxLength={120} onChange={(e) => setF({ ...f, nama: e.target.value })} className="py-[11px]" />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <Field label="Email">
              <Input type="email" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Nomor telepon">
              <Input type="tel" value={f.telepon ?? ''} onChange={(e) => setF({ ...f, telepon: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Tipe">
              <Select value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value as InputPeserta['tipe'] })} className="px-3">
                {Object.entries(LABEL_TIPE_PESERTA).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Registrasi">
              <Select value={f.registrasi} onChange={(e) => setF({ ...f, registrasi: e.target.value as InputPeserta['registrasi'] })} className="px-3">
                {Object.entries(LABEL_REGISTRASI).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <PesanGalat>{tambah.error ? (galat.nama ?? galat.email ?? errorMessage(tambah.error)) : ''}</PesanGalat>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button type="submit" disabled={tambah.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              Simpan
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function PesertaEvent({ eventId }: { eventId: number }) {
  const q = usePeserta(eventId);
  const ubah = useUbahPeserta(eventId);
  const hapus = useHapusPeserta(eventId);
  const impor = useImporPeserta(eventId);
  const boleh = useIzin();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tambah, setTambah] = useState(false);
  const [hapusId, setHapusId] = useState<number | null>(null);
  const rows = q.data ?? [];
  const tulis = boleh('tulisEvent');
  const target = rows.find((p) => p.id === hapusId);

  const imporFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { peserta, dilewati } = pesertaDariCsv(await file.text());
      if (!peserta.length) return toast('Tidak ada baris peserta di berkas CSV.');
      impor.mutate(peserta, {
        onSuccess: ({ jumlah }) => toast(`${jumlah} peserta diimpor${dilewati.length ? `, ${dilewati.length} baris tanpa nama dilewati` : ''}`),
        onError: (e) => toast(errorMessage(e)),
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Berkas CSV tidak dapat dibaca.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {statistikPeserta(rows).map((p) => (
          <Card flat key={p.label} className="flex flex-col gap-2.5 p-5">
            <span className="text-[13px] font-semibold text-ink-slate">{p.label}</span>
            <span className="font-display text-[30px] leading-none font-bold" style={{ color: p.c }}>
              {p.value}
            </span>
            <Progress value={p.w} color={p.c} label={p.label} />
            <span className="text-xs text-ink-subtle">{p.sub}</span>
          </Card>
        ))}
      </div>
      <Card flat className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-[18px]">
          <div>
            <div className="text-base font-bold text-navy">Peserta Event</div>
            <div className="mt-0.5 text-[13px] text-ink-muted">{rows.length} peserta terdaftar</div>
          </div>
          {tulis && (
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void imporFile(e.target.files?.[0])} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={impor.isPending} title="Kolom: nama, email, telepon, tipe, registrasi, kehadiran" className="px-4 py-2.5 text-[13px]">
                {impor.isPending ? 'Mengimpor…' : 'Impor CSV'}
              </Button>
              <Button onClick={() => setTambah(true)} className="px-4 py-2.5 text-[13px]">
                + Tambah Peserta
              </Button>
            </div>
          )}
        </div>
        {q.isPending ? (
          <Memuat className="border-t border-line-soft" />
        ) : q.isError ? (
          <GagalMemuat error={q.error} onRetry={() => void q.refetch()} className="rounded-none border-x-0 border-b-0" />
        ) : rows.length > 0 ? (
          <Tabel min={880} cols={KOLOM_PESERTA} kepala={['Nama', 'Email', 'Nomor Telepon', 'Status', 'Registrasi', 'Kehadiran', '']}>
            {rows.map((r) => (
              <div key={r.id} className={cx(kelasBaris, 'py-3')} style={{ gridTemplateColumns: KOLOM_PESERTA }}>
                <span className="flex items-center gap-2.5 font-semibold text-navy">
                  <Inisial nama={r.nama} warna={['#E4EDFF', '#1F5BD6']} className="size-[30px] rounded-full text-[11px]" />
                  {r.nama}
                </span>
                <span className="truncate text-ink-body">{r.email ?? '-'}</span>
                <span>{r.telepon ?? '-'}</span>
                <span>
                  <Badge status={LABEL_TIPE_PESERTA[r.tipe]} size="md" />
                </span>
                <span>
                  <BadgePilihan
                    size="md"
                    value={r.registrasi}
                    label={LABEL_REGISTRASI[r.registrasi]}
                    pilihan={LABEL_REGISTRASI}
                    disabled={!tulis}
                    aria={`Registrasi ${r.nama}`}
                    onChange={(registrasi) => ubah.mutate({ id: r.id, registrasi }, { onError: (e) => toast(errorMessage(e)) })}
                  />
                </span>
                <span>
                  <BadgePilihan
                    size="md"
                    value={r.kehadiran}
                    label={LABEL_KEHADIRAN[r.kehadiran]}
                    pilihan={LABEL_KEHADIRAN}
                    disabled={!tulis}
                    aria={`Kehadiran ${r.nama}`}
                    onChange={(kehadiran) => ubah.mutate({ id: r.id, kehadiran }, { onError: (e) => toast(errorMessage(e)) })}
                  />
                </span>
                <span>{tulis && <TombolHapus label={`Hapus ${r.nama}`} onClick={() => setHapusId(r.id)} />}</span>
              </div>
            ))}
          </Tabel>
        ) : (
          <div className="border-t border-line-soft px-5 py-10 text-center text-sm text-ink-muted">Belum ada peserta untuk event ini.</div>
        )}
      </Card>
      {tambah && <PesertaModal eventId={eventId} onClose={() => setTambah(false)} />}
      {target && (
        <Konfirmasi
          judul="Hapus peserta?"
          pesan={
            <>
              <b>{target.nama}</b> akan dihapus dari daftar peserta.
            </>
          }
          label="Hapus"
          memproses={hapus.isPending}
          galat={hapus.error}
          onBatal={() => setHapusId(null)}
          onKonfirmasi={() => hapus.mutate(target.id, { onSuccess: () => setHapusId(null) })}
        />
      )}
    </div>
  );
}

/* ---------- Vendor ---------- */

export function totalVendor(vendor: Vendor[]) {
  const total = vendor.reduce((a, v) => a + v.nilaiKontrak, 0);
  const terbayar = vendor.reduce((a, v) => a + v.terbayar, 0);
  return { total, terbayar, sisa: total - terbayar };
}

const KOLOM_VENDOR = 'minmax(200px,1.6fr) 120px 110px 130px 130px 110px minmax(160px,1.3fr) 72px';

function VendorModal({ eventId, vendor, onClose }: { eventId: number; vendor: Vendor | null; onClose: () => void }) {
  const simpan = useSimpanVendor(eventId);
  const toast = useToast();
  const [f, setF] = useState({
    nama: vendor?.nama ?? '',
    kategori: vendor?.kategori ?? '',
    picNama: vendor?.picNama ?? '',
    kontak: vendor?.kontak ?? '',
    nilaiKontrak: vendor ? String(vendor.nilaiKontrak) : '',
    terbayar: vendor ? String(vendor.terbayar) : '',
    catatan: vendor?.catatan ?? '',
  });
  const galat = fieldErrors(simpan.error);
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    simpan.mutate(
      { id: vendor?.id, ...f, nilaiKontrak: Number(f.nilaiKontrak || 0), terbayar: Number(f.terbayar || 0) },
      {
        onSuccess: () => {
          toast(vendor ? 'Vendor diperbarui' : 'Vendor ditambahkan');
          onClose();
        },
      },
    );
  };
  return (
    <Modal onClose={onClose} align="top" className="max-w-[560px] rounded-3xl p-[26px]">
      {(titleId) => (
        <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center justify-between">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              {vendor ? 'Ubah Vendor' : 'Tambah Vendor'}
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <Field label="Nama vendor *">
            <Input value={f.nama} maxLength={160} onChange={(e) => setF({ ...f, nama: e.target.value })} className="py-[11px]" />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <Field label="Kategori *">
              <Input value={f.kategori} maxLength={60} onChange={(e) => setF({ ...f, kategori: e.target.value })} placeholder="Catering, Venue, …" className="py-[11px]" />
            </Field>
            <Field label="PIC vendor">
              <Input value={f.picNama} maxLength={120} onChange={(e) => setF({ ...f, picNama: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Kontak">
              <Input value={f.kontak} maxLength={60} onChange={(e) => setF({ ...f, kontak: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Nilai kontrak *">
              <MoneyInput value={f.nilaiKontrak} onChange={(nilaiKontrak) => setF({ ...f, nilaiKontrak })} />
            </Field>
            <Field label="Sudah dibayar">
              <MoneyInput value={f.terbayar} onChange={(terbayar) => setF({ ...f, terbayar })} />
            </Field>
          </div>
          <Field label="Catatan">
            <TextArea rows={2} maxLength={255} value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} className="py-[11px]" />
          </Field>
          <PesanGalat>{simpan.error ? (galat.terbayar ?? galat.nama ?? galat.kategori ?? errorMessage(simpan.error)) : ''}</PesanGalat>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button type="submit" disabled={simpan.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              Simpan
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function VendorEvent({ eventId }: { eventId: number }) {
  const q = useVendor(eventId);
  const hapus = useHapusVendor(eventId);
  const boleh = useIzin();
  const [form, setForm] = useState<Vendor | 'baru' | null>(null);
  const [hapusId, setHapusId] = useState<number | null>(null);
  const vendor = q.data ?? [];
  const t = totalVendor(vendor);
  const tulis = boleh('tulisEvent');
  const target = vendor.find((v) => v.id === hapusId);

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]">
        <CardTitle title="Vendor Event" sub={`${vendor.length} vendor terdaftar`} />
        <div className="flex flex-wrap items-center gap-6 text-xs text-ink-muted">
          <span className="flex flex-col gap-0.5">
            Nilai kontrak<b className="text-[15px] text-navy">{rupiah(t.total)}</b>
          </span>
          <span className="flex flex-col gap-0.5">
            Terbayar<b className="text-[15px] text-success-ink">{rupiah(t.terbayar)}</b>
          </span>
          <span className="flex flex-col gap-0.5">
            Sisa<b className="text-[15px] text-danger-ink">{rupiah(t.sisa)}</b>
          </span>
          {tulis && (
            <Button onClick={() => setForm('baru')} className="px-4 py-2.5 text-[13px]">
              + Tambah Vendor
            </Button>
          )}
        </div>
      </div>
      {q.isPending ? (
        <Memuat className="border-t border-line-soft" />
      ) : q.isError ? (
        <GagalMemuat error={q.error} onRetry={() => void q.refetch()} className="rounded-none border-x-0 border-b-0" />
      ) : vendor.length > 0 ? (
        <Tabel min={980} cols={KOLOM_VENDOR} kepala={['Nama Vendor', 'Kategori', 'PIC', 'Kontak', '>Nilai Kontrak', 'Status', 'Catatan', '']}>
          {vendor.map((v) => (
            <div key={v.id} className={cx(kelasBaris, 'py-[13px]')} style={{ gridTemplateColumns: KOLOM_VENDOR }}>
              <span className="font-semibold text-navy">{v.nama}</span>
              <span>{v.kategori}</span>
              <span>{v.picNama ?? '-'}</span>
              <span className="text-ink-body">{v.kontak ?? '-'}</span>
              <span className="text-right font-bold text-navy">{rupiah(v.nilaiKontrak)}</span>
              <span>
                <Badge status={statusBayar(v.nilaiKontrak, v.terbayar)} size="md" />
              </span>
              <span className="text-ink-muted">{v.catatan || '-'}</span>
              <span className="flex justify-end gap-1.5">
                {tulis && (
                  <>
                    <button
                      type="button"
                      aria-label={`Ubah ${v.nama}`}
                      title="Ubah"
                      onClick={() => setForm(v)}
                      className="flex size-[30px] cursor-pointer items-center justify-center rounded-[9px] border border-line-ctl bg-white text-xs font-semibold text-ink-label hover:border-primary hover:text-primary"
                    >
                      ✎
                    </button>
                    <TombolHapus label={`Hapus ${v.nama}`} onClick={() => setHapusId(v.id)} />
                  </>
                )}
              </span>
            </div>
          ))}
        </Tabel>
      ) : (
        <div className="border-t border-line-soft px-5 py-10 text-center text-sm text-ink-muted">Belum ada vendor untuk event ini.</div>
      )}
      {form && <VendorModal eventId={eventId} vendor={form === 'baru' ? null : form} onClose={() => setForm(null)} />}
      {target && (
        <Konfirmasi
          judul="Hapus vendor?"
          pesan={
            <>
              Vendor <b>{target.nama}</b> akan dihapus dari event ini.
            </>
          }
          label="Hapus"
          memproses={hapus.isPending}
          galat={hapus.error}
          onBatal={() => setHapusId(null)}
          onKonfirmasi={() => hapus.mutate(target.id, { onSuccess: () => setHapusId(null) })}
        />
      )}
    </Card>
  );
}

/* ---------- Kebutuhan event ---------- */

function FormKebutuhan({ eventId }: { eventId: number }) {
  const tambah = useTambahTugas(eventId);
  const pengguna = usePengguna();
  const [f, setF] = useState({ label: '', picId: '', tenggat: '' });
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (!f.label.trim()) return;
    tambah.mutate(
      { label: f.label.trim(), picId: f.picId ? Number(f.picId) : null, tenggat: f.tenggat || null },
      { onSuccess: () => setF({ label: '', picId: '', tenggat: '' }) },
    );
  };
  return (
    <form onSubmit={kirim} className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(200px,2fr)_minmax(150px,1fr)_minmax(140px,170px)_auto] gap-2.5 max-md:grid-cols-1">
        <Input value={f.label} maxLength={160} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Kebutuhan baru, mis. Konfirmasi venue" aria-label="Kebutuhan baru" className="py-2.5" />
        <Select value={f.picId} onChange={(e) => setF({ ...f, picId: e.target.value })} aria-label="PIC kebutuhan" className="py-2.5">
          <option value="">Tanpa PIC</option>
          {(pengguna.data ?? [])
            .filter((p) => p.aktif)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
        </Select>
        <Input type="date" value={f.tenggat} onChange={(e) => setF({ ...f, tenggat: e.target.value })} aria-label="Tenggat" className="py-2" />
        <Button type="submit" disabled={tambah.isPending || !f.label.trim()} className="px-4 py-2.5 text-[13px] disabled:opacity-50">
          + Tambah
        </Button>
      </div>
      <PesanGalat>{tambah.error ? errorMessage(tambah.error) : ''}</PesanGalat>
    </form>
  );
}

export function KebutuhanEvent({ eventId }: { eventId: number }) {
  const q = useTugas(eventId);
  const ubah = useUbahTugas();
  const hapus = useHapusTugas();
  const boleh = useIzin();
  const toast = useToast();
  const tugas = q.data ?? [];
  const selesai = tugas.filter((t) => t.selesai).length;
  const tulis = boleh('tulisEvent');
  return (
    <Card flat className="flex animate-fade-up flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CardTitle title="Kebutuhan Event" sub={`${selesai} dari ${tugas.length} selesai${tulis ? ' · klik untuk menandai' : ''}`} />
        <Progress value={persen(selesai, tugas.length)} color="#1E9E63" className="h-2 w-[220px] max-w-full" label="Kebutuhan selesai" />
      </div>
      {tulis && <FormKebutuhan eventId={eventId} />}
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />
      ) : tugas.length === 0 ? (
        <div className="py-6 text-center text-sm text-ink-muted">Belum ada kebutuhan untuk event ini.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-2.5">
          {tugas.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded-[14px] border border-line-soft bg-white pr-2 hover:border-line-dash">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.selesai}
                disabled={!tulis}
                onClick={() => ubah.mutate({ id: t.id, eventId, selesai: !t.selesai }, { onError: (e) => toast(errorMessage(e)) })}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent p-3.5 text-left disabled:cursor-default"
              >
                <span className={cx('flex size-[22px] flex-none items-center justify-center rounded-[7px] border-2 text-white', t.selesai ? 'border-success bg-success' : 'border-line-dash bg-white')}>
                  <Icon name="check" size={13} strokeWidth={3.5} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cx('text-[13px] font-semibold', t.selesai ? 'text-ink-subtle line-through' : 'text-ink')}>{t.label}</span>
                  <span className="text-xs text-ink-muted">{t.pic?.nama ?? 'Tanpa PIC'}</span>
                </span>
                <span className="text-xs whitespace-nowrap text-ink-muted">{t.tenggat ? formatTanggal(t.tenggat) : '—'}</span>
              </button>
              {tulis && (
                <span className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  <TombolHapus label={`Hapus ${t.label}`} onClick={() => hapus.mutate(t.id, { onError: (e) => toast(errorMessage(e)) })} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Tim ---------- */

export function TimEvent({ event }: { event: EventDetail }) {
  const pengguna = usePengguna();
  // Pastikan PIC selalu tampil walau tidak dicentang sebagai anggota tim.
  const anggota = event.anggota.some((a) => a.id === event.pic.id)
    ? event.anggota
    : [...(pengguna.data ?? []).filter((p) => p.id === event.pic.id), ...event.anggota];
  const peran = new Map((pengguna.data ?? []).map((p) => [p.id, p.peran]));
  return (
    <div className="flex animate-fade-up flex-col gap-3.5">
      <CardTitle title="Tim Event" sub="PIC dan pembagian tanggung jawab" />
      {anggota.length === 0 ? (
        <Card flat className="px-5 py-10 text-center text-sm text-ink-muted">
          Belum ada anggota tim. Tambahkan lewat tombol Ubah Event.
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {anggota.map((m, i) => (
            <Card flat key={m.id} className="flex flex-col gap-3.5 p-5">
              <div className="flex items-center justify-between">
                <Inisial nama={m.nama} warna={warnaAvatar(i)} className="size-[46px] rounded-full font-display text-base" />
                <span className="flex gap-1.5">
                  {m.id === event.pic.id && <Badge status="PIC" size="sm" warna={['#FFF4D1', '#8A6100']} />}
                  <Badge status={m.aktif ? 'Aktif' : 'Nonaktif'} size="sm" />
                </span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[15px] font-bold text-navy">{m.nama}</span>
                <span className="text-xs font-bold tracking-[.04em] text-accent-ink">{m.jabatan ?? LABEL_PERAN[peran.get(m.id) ?? 'anggota']}</span>
              </div>
              <span className="text-[13px] leading-normal text-ink-body">{m.tanggungJawab ?? '—'}</span>
              <span className="border-t border-line-soft pt-3 text-xs text-ink-muted">{m.telepon ?? '—'}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
