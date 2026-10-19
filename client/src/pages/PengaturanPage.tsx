import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Icon, type NamaIkon } from '../components/icons';
import { Modal, TombolTutup } from '../components/Modal';
import { labelUnggah, ProgresUnggah } from '../components/ProgresUnggah';
import { Tip } from '../components/Tip';
import { GagalMemuat, Konfirmasi, Memuat, PesanGalat } from '../components/Status';
import { useToast } from '../components/Toast';
import { IlustrasiLogo } from '../components/IlustrasiKosong';
import { Badge, Button, Field, Inisial, Input, Select, TextArea, cx } from '../components/ui';
import {
  useGantiSandi,
  useHapusLogo,
  useHapusMaster,
  useHapusTemplate,
  useIzin,
  useMaster,
  useMe,
  useOrganisasi,
  usePengguna,
  useLogout,
  useSimpanOrganisasi,
  useSimpanPengguna,
  useSimpanTemplate,
  useResetMfaPengguna,
  useTambahMaster,
  useUbahKeamanan,
  useUbahNotifikasi,
  useUnggahLogo,
  type JenisMaster,
} from '../hooks/queries';
import { errorMessage, fieldErrors } from '../lib/api';
import { DESKRIPSI_PERAN, DESKRIPSI_STATUS_EVENT, LABEL_PERAN, LABEL_STATUS_EVENT, STATUS_EVENT } from '../lib/label';
import { warnaAvatar } from '../lib/warna';
import type { Izin, Organisasi, Pengguna, Peran, Ref, TemplateEvent } from '../types';
import { MfaSaya } from '../features/akun/MfaSaya';
import { TandaTanganSaya } from '../features/akun/TandaTanganSaya';

type Tab = 'profil' | 'pengguna' | 'kategori' | 'event' | 'notif' | 'keamanan' | 'akun';

const TAB: [Tab, string, NamaIkon, Izin | null][] = [
  ['profil', 'Profil Organisasi', 'home', 'kelolaPengaturan'],
  ['pengguna', 'Pengguna', 'users', 'kelolaPengguna'],
  ['kategori', 'Kategori Keuangan', 'wallet', 'kelolaPengaturan'],
  ['event', 'Pengaturan Event', 'cal', 'kelolaPengaturan'],
  ['notif', 'Notifikasi', 'set', 'kelolaPengaturan'],
  ['keamanan', 'Keamanan', 'shield', 'kelolaPengaturan'],
  ['akun', 'Akun Saya', 'user', null],
];

function Judul({ children, className }: { children: string; className?: string }) {
  return <h2 className={cx('m-0 text-lg font-bold text-navy', className)}>{children}</h2>;
}

/* ---------- Profil organisasi ---------- */

function FormProfil({ org }: { org: Organisasi | null }) {
  const simpan = useSimpanOrganisasi();
  const toast = useToast();
  const [f, setF] = useState({ nama: org?.nama ?? '', email: org?.email ?? '', telepon: org?.telepon ?? '', kota: org?.kota ?? '' });
  const galat = fieldErrors(simpan.error);
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    simpan.mutate(f, { onSuccess: () => toast('Profil organisasi disimpan') });
  };
  return (
    <form className="flex flex-col gap-5" onSubmit={kirim} noValidate>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Field label="Nama organisasi *">
          <Input value={f.nama} maxLength={120} onChange={(e) => setF({ ...f, nama: e.target.value })} className="py-[11px]" />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} maxLength={160} onChange={(e) => setF({ ...f, email: e.target.value })} className="py-[11px]" />
        </Field>
        <Field label="Telepon">
          <Input type="tel" value={f.telepon} maxLength={40} onChange={(e) => setF({ ...f, telepon: e.target.value })} className="py-[11px]" />
        </Field>
        <Field label="Kota">
          <Input value={f.kota} maxLength={120} onChange={(e) => setF({ ...f, kota: e.target.value })} className="py-[11px]" />
        </Field>
      </div>
      <PesanGalat>{simpan.error ? (galat.nama ?? galat.email ?? errorMessage(simpan.error)) : ''}</PesanGalat>
      <Button type="submit" disabled={simpan.isPending} className="self-start px-[18px] py-[11px] text-sm disabled:opacity-60">
        Simpan Perubahan
      </Button>
    </form>
  );
}

function TabProfil() {
  const q = useOrganisasi();
  const unggah = useUnggahLogo();
  const hapus = useHapusLogo();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />;
  const org = q.data;
  return (
    <div className="flex flex-col gap-5">
      <Judul>Profil Organisasi</Judul>
      <div className="flex items-center gap-[18px]">
        {org?.logoUrl ? (
          <img src={org.logoUrl} alt={`Logo ${org.nama}`} className="size-[84px] rounded-[22px] border border-line object-contain" />
        ) : (
          <div className="flex size-[84px] flex-none flex-col items-center justify-center gap-0.5 rounded-[22px] border border-dashed border-line-dash bg-surface-muted">
            <IlustrasiLogo />
            <span className="text-[10px] font-semibold text-ink-muted">Belum ada logo</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) unggah.mutate(file, { onSuccess: () => toast('Logo diperbarui'), onError: (x) => toast(errorMessage(x)) });
              e.target.value = '';
            }}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={unggah.isPending} className="rounded-[10px] px-3.5 py-2 text-[13px]">
              {labelUnggah(unggah.progres, 'Ganti Logo')}
            </Button>
            {org?.logoUrl && (
              <Button variant="secondary" onClick={() => hapus.mutate(undefined, { onSuccess: () => toast('Logo dihapus') })} className="rounded-[10px] px-3.5 py-2 text-[13px]">
                Hapus
              </Button>
            )}
          </div>
          <span className="text-xs text-ink-muted">PNG, JPG, atau WEBP, rasio 1:1</span>
          <ProgresUnggah progres={unggah.progres} nama="logo" className="w-56 max-w-full" />
        </div>
      </div>
      <FormProfil key={org?.nama ?? ''} org={org} />
    </div>
  );
}

/* ---------- Pengguna ---------- */

function PenggunaModal({ pengguna, onClose }: { pengguna: Pengguna | null; onClose: () => void }) {
  const simpan = useSimpanPengguna();
  const resetMfa = useResetMfaPengguna();
  const me = useMe().data;
  const toast = useToast();
  const [konfirmasiMfa, setKonfirmasiMfa] = useState(false);
  const [mfaAktif, setMfaAktif] = useState(pengguna?.mfaAktif ?? false);
  const [f, setF] = useState({
    nama: pengguna?.nama ?? '',
    username: pengguna?.username ?? '',
    email: pengguna?.email ?? '',
    peran: pengguna?.peran ?? ('anggota' as Peran),
    jabatan: pengguna?.jabatan ?? '',
    telepon: pengguna?.telepon ?? '',
    tanggungJawab: pengguna?.tanggungJawab ?? '',
    aktif: pengguna?.aktif ?? true,
    kataSandi: '',
  });
  const galat = fieldErrors(simpan.error);
  const diriSendiri = pengguna?.id === me?.id;
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    simpan.mutate(
      { id: pengguna?.id, ...f },
      {
        onSuccess: () => {
          toast(pengguna ? 'Pengguna diperbarui' : `Akun ${f.username.trim().toLowerCase()} dibuat`);
          onClose();
        },
      },
    );
  };
  return (
    <Modal onClose={onClose} align="top" className="max-w-[600px] rounded-3xl p-[26px]">
      {(titleId) => (
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              {pengguna ? 'Ubah Pengguna' : 'Undang Pengguna'}
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            <Field label="Nama *">
              <Input value={f.nama} maxLength={120} onChange={(e) => setF({ ...f, nama: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Username *">
              <Input
                value={f.username}
                maxLength={32}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="mis. fajar.nugroho"
                className="py-[11px]"
              />
            </Field>
            <Field label="Email (opsional)">
              <Input type="email" value={f.email} maxLength={160} onChange={(e) => setF({ ...f, email: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label="Peran">
              <Select value={f.peran} disabled={diriSendiri} onChange={(e) => setF({ ...f, peran: e.target.value as Peran })}>
                {(Object.keys(LABEL_PERAN) as Peran[]).map((p) => (
                  <option key={p} value={p}>
                    {LABEL_PERAN[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jabatan di tim">
              <Input value={f.jabatan} maxLength={80} onChange={(e) => setF({ ...f, jabatan: e.target.value })} placeholder="Event Manager, Finance, …" className="py-[11px]" />
            </Field>
            <Field label="Telepon">
              <Input type="tel" value={f.telepon} maxLength={40} onChange={(e) => setF({ ...f, telepon: e.target.value })} className="py-[11px]" />
            </Field>
            <Field label={pengguna ? 'Reset kata sandi' : 'Kata sandi awal *'}>
              <Input
                type="password"
                autoComplete="new-password"
                value={f.kataSandi}
                onChange={(e) => setF({ ...f, kataSandi: e.target.value })}
                placeholder={pengguna ? 'Kosongkan bila tidak diubah' : 'Minimal 8 karakter'}
                className="py-[11px]"
              />
            </Field>
          </div>
          <div className="text-xs text-ink-muted">
            {DESKRIPSI_PERAN[f.peran]}. Username dipakai untuk masuk: huruf kecil, angka, titik, garis bawah, atau tanda hubung (3–32 karakter).
          </div>
          <Field label="Tanggung jawab">
            <TextArea rows={2} maxLength={255} value={f.tanggungJawab} onChange={(e) => setF({ ...f, tanggungJawab: e.target.value })} className="py-[11px]" />
          </Field>
          {pengguna && !diriSendiri && (
            <label className="flex items-center gap-2 text-[13px] text-ink-label">
              <input type="checkbox" checked={f.aktif} onChange={(e) => setF({ ...f, aktif: e.target.checked })} />
              Akun aktif (pengguna nonaktif tidak dapat masuk)
            </label>
          )}
          {pengguna && !diriSendiri && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft px-3.5 py-3 text-[13px]">
              <span className="flex flex-1 items-center gap-2 text-ink-body">
                <Icon name="shield" size={16} stroke={mfaAktif ? '#1E9E63' : '#7A869A'} />
                {mfaAktif ? 'Verifikasi dua langkah aktif' : 'Verifikasi dua langkah belum aktif'}
              </span>
              {mfaAktif && (
                <Button variant="secondary" onClick={() => setKonfirmasiMfa(true)} className="border-danger-dash px-3 py-1.5 text-xs text-danger-ink hover:border-danger">
                  Reset MFA
                </Button>
              )}
            </div>
          )}
          <PesanGalat>{simpan.error ? (galat.username ?? galat.email ?? galat.kataSandi ?? galat.nama ?? errorMessage(simpan.error)) : ''}</PesanGalat>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button type="submit" disabled={simpan.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              Simpan
            </Button>
          </div>
          {konfirmasiMfa && pengguna && (
            <Konfirmasi
              judul="Reset verifikasi dua langkah?"
              pesan={
                <>
                  MFA milik <b>{pengguna.nama}</b> dimatikan dan semua sesinya diakhiri. Lakukan hanya bila ponselnya hilang atau berganti. Bila organisasi
                  mewajibkan MFA, ia akan diminta memasang ulang saat masuk berikutnya.
                </>
              }
              label="Reset MFA"
              memproses={resetMfa.isPending}
              galat={resetMfa.error}
              onBatal={() => setKonfirmasiMfa(false)}
              onKonfirmasi={() =>
                resetMfa.mutate(pengguna.id, {
                  onSuccess: () => {
                    setMfaAktif(false);
                    setKonfirmasiMfa(false);
                    toast(`MFA ${pengguna.nama} direset`);
                  },
                })
              }
            />
          )}
        </form>
      )}
    </Modal>
  );
}

function TabPengguna() {
  const q = usePengguna();
  const [form, setForm] = useState<Pengguna | 'baru' | null>(null);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <Judul>Pengguna</Judul>
        <Button onClick={() => setForm('baru')} className="px-3.5 py-[9px] text-[13px]">
          + Undang Pengguna
        </Button>
      </div>
      {q.isPending && <Memuat />}
      {q.isError && <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />}
      {(q.data ?? []).map((u, i) => (
        <button
          key={u.id}
          type="button"
          onClick={() => setForm(u)}
          className="flex cursor-pointer flex-wrap items-center gap-3.5 border-x-0 border-t border-b-0 border-line-soft bg-transparent py-3 text-left hover:bg-surface-hover"
        >
          <Inisial nama={u.nama} warna={warnaAvatar(i)} className="size-[38px] rounded-full text-xs" />
          <span className="flex min-w-40 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-navy">{u.nama}</span>
            <span className="text-xs text-ink-muted">
              @{u.username}
              {u.email ? ` · ${u.email}` : ''}
            </span>
          </span>
          <span className="w-[110px] text-[13px] text-ink-label">{LABEL_PERAN[u.peran]}</span>
          <span className={cx('flex w-[86px] items-center gap-1 text-xs', u.mfaAktif ? 'text-success-ink' : 'text-ink-subtle')}>
            <Icon name="shield" size={13} />
            {u.mfaAktif ? 'MFA' : 'Tanpa MFA'}
          </span>
          <span className={cx('w-[120px] text-xs', u.tandaTangan ? 'text-success-ink' : 'text-ink-subtle')}>{u.tandaTangan ? '✓ Tanda tangan' : 'Belum ada TTD'}</span>
          <Badge status={u.aktif ? 'Aktif' : 'Nonaktif'} className="px-2.5 py-[3px]" />
        </button>
      ))}
      {form && <PenggunaModal pengguna={form === 'baru' ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

/* ---------- Data master (chip) ---------- */

const WARNA_CHIP = {
  masuk: { chip: 'bg-success-bg text-success-ink', judul: 'text-success-ink', tambah: 'border-success-dash text-success-ink' },
  keluar: { chip: 'bg-danger-bg text-danger-ink', judul: 'text-danger-ink', tambah: 'border-danger-dash text-danger-ink' },
  netral: { chip: 'bg-primary-bg text-primary-hover', judul: 'text-navy', tambah: 'border-line-dash text-primary' },
};

function GrupChip({ judul, warna, items, jenisMaster, jenis }: { judul: string; warna: keyof typeof WARNA_CHIP; items: Ref[]; jenisMaster: JenisMaster; jenis?: 'masuk' | 'keluar' }) {
  const tambah = useTambahMaster();
  const hapus = useHapusMaster();
  const toast = useToast();
  const [baru, setBaru] = useState<string | null>(null);
  const w = WARNA_CHIP[warna];
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (!baru?.trim()) return setBaru(null);
    tambah.mutate(
      { jenisMaster, nama: baru.trim(), jenis },
      {
        onSuccess: () => {
          toast(`“${baru.trim()}” ditambahkan`);
          setBaru(null);
        },
        onError: (x) => toast(errorMessage(x)),
      },
    );
  };
  return (
    <div className="flex flex-col gap-2.5">
      <span className={cx('text-[13px] font-bold', w.judul)}>{judul}</span>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((k) => (
          <span key={k.id} className={cx('flex items-center gap-1.5 rounded-full py-2 pr-2.5 pl-3.5 text-[13px] font-semibold', w.chip)}>
            {k.nama}
            <Tip label="Hapus (hanya bila belum dipakai)">
              <button
                type="button"
                aria-label={`Hapus ${k.nama}`}
                onClick={() => hapus.mutate({ jenisMaster, id: k.id }, { onSuccess: () => toast(`“${k.nama}” dihapus`), onError: (x) => toast(errorMessage(x)) })}
                className="flex size-4 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-sm leading-none opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </Tip>
          </span>
        ))}
        {baru === null ? (
          <button
            type="button"
            onClick={() => setBaru('')}
            className={cx('cursor-pointer rounded-full border border-dashed bg-white px-3.5 py-2 text-[13px] font-semibold', w.tambah)}
          >
            + Tambah
          </button>
        ) : (
          <form onSubmit={kirim} noValidate className="flex items-center gap-1.5">
            <Input autoFocus value={baru} maxLength={60} onChange={(e) => setBaru(e.target.value)} aria-label={`Nama ${judul.toLowerCase()} baru`} className="w-44 rounded-full px-3.5 py-2 text-[13px]" />
            <Button type="submit" disabled={tambah.isPending} className="rounded-full px-3.5 py-2 text-[13px]">
              Simpan
            </Button>
            <Button variant="secondary" onClick={() => setBaru(null)} className="rounded-full px-3 py-2 text-[13px]">
              Batal
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function TabKategori() {
  const q = useMaster();
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="flex flex-col gap-[22px]">
      <Judul>Kategori Keuangan</Judul>
      <GrupChip judul="Kategori pemasukan" warna="masuk" jenisMaster="kategori" jenis="masuk" items={q.data.kategori.filter((k) => k.jenis === 'masuk')} />
      <GrupChip judul="Kategori pengeluaran" warna="keluar" jenisMaster="kategori" jenis="keluar" items={q.data.kategori.filter((k) => k.jenis === 'keluar')} />
      <GrupChip judul="Metode pembayaran" warna="netral" jenisMaster="metode" items={q.data.metode} />
      <div className="text-xs text-ink-muted">Kategori atau metode yang sudah dipakai transaksi tidak dapat dihapus.</div>
    </div>
  );
}

/* ---------- Pengaturan event ---------- */

function TemplateModal({ template, onClose }: { template: TemplateEvent | null; onClose: () => void }) {
  const simpan = useSimpanTemplate();
  const hapus = useHapusTemplate();
  const toast = useToast();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [f, setF] = useState({ nama: template?.nama ?? '', deskripsi: template?.deskripsi ?? '', tugas: (template?.tugas ?? []).join('\n') });
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    simpan.mutate(
      { id: template?.id, nama: f.nama, deskripsi: f.deskripsi, tugas: f.tugas.split('\n').map((t) => t.trim()).filter(Boolean) },
      {
        onSuccess: () => {
          toast('Template disimpan');
          onClose();
        },
      },
    );
  };
  return (
    <Modal onClose={onClose} align="top" className="max-w-[560px] rounded-3xl p-[26px]">
      {(titleId) => (
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              {template ? 'Ubah Template' : 'Template Baru'}
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <Field label="Nama template *">
            <Input value={f.nama} maxLength={80} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Gathering Tahunan" className="py-[11px]" />
          </Field>
          <Field label="Deskripsi">
            <Input value={f.deskripsi} maxLength={255} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} className="py-[11px]" />
          </Field>
          <Field label="Kebutuhan event (satu per baris)">
            <TextArea rows={8} value={f.tugas} onChange={(e) => setF({ ...f, tugas: e.target.value })} placeholder={'Finalisasi proposal\nKonfirmasi venue\nKontrak vendor utama'} />
          </Field>
          <PesanGalat>{simpan.error ? errorMessage(simpan.error) : ''}</PesanGalat>
          <div className="flex flex-wrap gap-2.5">
            {template && (
              <Button variant="secondary" onClick={() => setKonfirmasi(true)} className="border-danger-dash px-4 py-[11px] text-sm text-danger-ink hover:border-danger">
                Hapus
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button type="submit" disabled={simpan.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              Simpan
            </Button>
          </div>
          {konfirmasi && template && (
            <Konfirmasi
              judul="Hapus template?"
              pesan={
                <>
                  Template <b>{template.nama}</b> akan dihapus. Event yang sudah dibuat tidak terpengaruh.
                </>
              }
              label="Hapus"
              memproses={hapus.isPending}
              galat={hapus.error}
              onBatal={() => setKonfirmasi(false)}
              onKonfirmasi={() => hapus.mutate(template.id, { onSuccess: onClose })}
            />
          )}
        </form>
      )}
    </Modal>
  );
}

function TabEvent() {
  const q = useMaster();
  const [form, setForm] = useState<TemplateEvent | 'baru' | null>(null);
  return (
    <div className="flex flex-col gap-[22px]">
      <Judul>Pengaturan Event</Judul>
      <div className="flex flex-col gap-1">
        <span className="mb-1.5 text-[13px] font-bold text-navy">Status event</span>
        {STATUS_EVENT.map((s) => (
          <div key={s} className="flex items-center gap-3.5 border-t border-line-soft py-2.5">
            <span className="w-[110px] flex-none">
              <Badge status={LABEL_STATUS_EVENT[s]} />
            </span>
            <span className="text-[13px] text-ink-body">{DESKRIPSI_STATUS_EVENT[s]}</span>
          </div>
        ))}
      </div>
      {q.isPending && <Memuat />}
      {q.isError && <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />}
      {q.data && (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-navy">Template event</span>
              <Button variant="secondary" onClick={() => setForm('baru')} className="px-3 py-2 text-xs">
                + Template
              </Button>
            </div>
            {q.data.template.length === 0 && <div className="text-[13px] text-ink-muted">Belum ada template. Template mengisi daftar kebutuhan saat event dibuat.</div>}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              {q.data.template.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm(t)}
                  className="flex cursor-pointer flex-col gap-1.5 rounded-[14px] border border-line bg-white p-4 text-left hover:border-line-dash"
                >
                  <span className="text-sm font-bold text-navy">{t.nama}</span>
                  <span className="text-xs leading-normal text-ink-muted">{[t.deskripsi, `${t.tugas.length} kebutuhan event`].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </div>
          </div>
          <GrupChip judul="Jenis dokumen" warna="netral" jenisMaster="jenis-dokumen" items={q.data.jenisDokumen} />
        </>
      )}
      {form && <TemplateModal template={form === 'baru' ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

/* ---------- Notifikasi ---------- */

const NOTIF: ['notifPengingatTenggat' | 'notifPeringatanKeuangan', string, string][] = [
  ['notifPengingatTenggat', 'Pengingat tenggat', 'Tampilkan kebutuhan event yang lewat atau mendekati tenggat (2 hari) di panel notifikasi.'],
  ['notifPeringatanKeuangan', 'Peringatan keuangan', 'Tampilkan peringatan bila pengeluaran event melewati 90% budget.'],
];

function TabNotif() {
  const q = useOrganisasi();
  const ubah = useUbahNotifikasi();
  const toast = useToast();
  if (q.isPending) return <Memuat />;
  if (q.isError || !q.data) return <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />;
  const org = q.data;
  return (
    <div className="flex flex-col gap-1.5">
      <Judul className="mb-2.5">Notifikasi</Judul>
      {NOTIF.map(([k, l, d]) => {
        const on = org[k];
        return (
          <div key={k} className="flex items-center gap-4 border-t border-line-soft py-3.5">
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="text-sm font-semibold text-navy" id={`notif-${k}`}>
                {l}
              </span>
              <span className="text-[13px] text-ink-muted">{d}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-labelledby={`notif-${k}`}
              disabled={ubah.isPending}
              onClick={() => ubah.mutate({ [k]: !on }, { onError: (x) => toast(errorMessage(x)) })}
              className={cx('relative h-[26px] w-11 flex-none cursor-pointer rounded-full border-none transition-colors duration-200', on ? 'bg-primary' : 'bg-track')}
            >
              <span className={cx('absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left] duration-200', on ? 'left-5' : 'left-0.5')} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Keamanan ---------- */

function TabKeamanan() {
  const q = useOrganisasi();
  const me = useMe().data;
  const ubah = useUbahKeamanan();
  const toast = useToast();
  const [, setParams] = useSearchParams();
  if (q.isPending) return <Memuat />;
  if (q.isError || !q.data) return <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />;
  const on = q.data.wajibMfa;
  const adminSiap = me?.mfa.aktif ?? false;
  return (
    <div className="flex flex-col gap-1.5">
      <Judul className="mb-2.5">Keamanan</Judul>
      <div className="flex items-center gap-4 border-t border-line-soft py-3.5">
        <span className="flex flex-1 flex-col gap-[3px]">
          <span className="text-sm font-semibold text-navy" id="wajib-mfa">
            Wajibkan verifikasi dua langkah (MFA)
          </span>
          <span className="text-[13px] leading-normal text-ink-muted">
            Semua pengguna harus memasukkan kode Google Authenticator saat masuk. Pengguna yang belum memasang akan diminta memasangnya sebelum bisa memakai
            aplikasi.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="wajib-mfa"
          disabled={ubah.isPending || (!on && !adminSiap)}
          onClick={() =>
            ubah.mutate(
              { wajibMfa: !on },
              { onSuccess: () => toast(on ? 'MFA tidak lagi diwajibkan' : 'MFA kini wajib untuk semua pengguna'), onError: (x) => toast(errorMessage(x)) },
            )
          }
          className={cx('relative h-[26px] w-11 flex-none cursor-pointer rounded-full border-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50', on ? 'bg-primary' : 'bg-track')}
        >
          <span className={cx('absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left] duration-200', on ? 'left-5' : 'left-0.5')} />
        </button>
      </div>
      {!adminSiap && !on && (
        <div className="rounded-xl bg-primary-bg px-3.5 py-[11px] text-[13px] leading-normal text-primary-hover">
          Aktifkan dulu verifikasi dua langkah di akun Anda sendiri agar tidak terkunci.{' '}
          <button type="button" onClick={() => setParams({ tab: 'akun' }, { replace: true })} className="cursor-pointer border-none bg-transparent p-0 font-bold text-primary underline">
            Buka Akun Saya
          </button>
        </div>
      )}
      <div className="text-xs leading-normal text-ink-muted">
        Pengguna yang kehilangan ponsel bisa masuk dengan kode pemulihan, atau MFA-nya direset admin lewat Pengaturan › Pengguna.
      </div>
    </div>
  );
}

/* ---------- Akun saya ---------- */

function TabAkun() {
  const me = useMe().data;
  const ganti = useGantiSandi();
  const keluar = useLogout();
  const toast = useToast();
  const [f, setF] = useState({ lama: '', baru: '', ulang: '' });
  const [err, setErr] = useState('');
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (f.baru !== f.ulang) return setErr('Konfirmasi kata sandi baru tidak sama.');
    ganti.mutate(
      { lama: f.lama, baru: f.baru },
      {
        onSuccess: () => {
          toast('Kata sandi diganti. Sesi di perangkat lain telah diakhiri.');
          setF({ lama: '', baru: '', ulang: '' });
        },
        onError: (x) => setErr(fieldErrors(x).baru ?? errorMessage(x)),
      },
    );
  };
  return (
    <div className="flex flex-col gap-5">
      <Judul>Akun Saya</Judul>
      {me && (
        <div className="flex items-center gap-3.5">
          <Inisial nama={me.nama} warna={['#12264A', '#F5B800']} className="size-12 rounded-full text-sm" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-navy">{me.nama}</span>
            <span className="text-[13px] text-ink-muted">
              @{me.username}
              {me.email ? ` · ${me.email}` : ''} · {LABEL_PERAN[me.peran]}
            </span>
          </div>
        </div>
      )}
      <TandaTanganSaya />
      <MfaSaya />
      <form onSubmit={kirim} noValidate className="flex max-w-[420px] flex-col gap-3.5 border-t border-line-soft pt-5">
        <div className="text-[13px] font-bold text-navy">Ganti kata sandi</div>
        {/* Untuk pengelola kata sandi: kata sandi baru disimpan pada username yang benar. */}
        <input type="text" name="username" autoComplete="username" value={me?.username ?? ''} readOnly hidden />
        {(
          [
            ['lama', 'Kata sandi saat ini', 'current-password'],
            ['baru', 'Kata sandi baru', 'new-password'],
            ['ulang', 'Ulangi kata sandi baru', 'new-password'],
          ] as const
        ).map(([k, l, ac]) => (
          <Field key={k} label={l}>
            <Input
              type="password"
              autoComplete={ac}
              value={f[k]}
              onChange={(e) => {
                setF({ ...f, [k]: e.target.value });
                setErr('');
              }}
              className="py-[11px]"
            />
          </Field>
        ))}
        <PesanGalat>{err}</PesanGalat>
        <Button type="submit" disabled={ganti.isPending || !f.lama || !f.baru} className="self-start px-[18px] py-[11px] text-sm disabled:opacity-50">
          Ganti Kata Sandi
        </Button>
      </form>
      <div className="flex flex-col gap-3 border-t border-line-soft pt-5">
        <div className="text-[13px] font-bold text-navy">Sesi Akun</div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface-soft p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-navy">Keluar dari Akun</span>
            <span className="text-xs text-ink-muted">Akhiri sesi ini pada perangkat yang sedang digunakan.</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => keluar.mutate()}
            className="flex items-center gap-2 border-danger-dash px-4 py-2 text-[13px] font-bold text-danger hover:border-danger hover:bg-danger-bg"
          >
            <Icon name="logout" size={16} />
            Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PengaturanPage() {
  const boleh = useIzin();
  const [params, setParams] = useSearchParams();
  const tersedia = TAB.filter(([, , , izin]) => !izin || boleh(izin));
  const tab: Tab = tersedia.find(([k]) => k === params.get('tab'))?.[0] ?? tersedia[0][0];

  return (
    <div className="flex animate-fade-up flex-col gap-[22px]">
      <div>
        <h1 className="m-0 font-display text-[32px] font-bold tracking-[-.02em] text-navy">Pengaturan</h1>
        <div className="mt-1.5 text-sm text-ink-slate">Atur profil organisasi, pengguna, kategori, notifikasi, dan keamanan.</div>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <nav aria-label="Bagian pengaturan" className="flex w-60 max-w-full flex-col gap-1 rounded-[18px] border border-line bg-white p-2.5 max-lap:w-full">
          {tersedia.map(([k, l, icon]) => (
            <button
              key={k}
              type="button"
              aria-current={k === tab ? 'page' : undefined}
              onClick={() => setParams(k === tersedia[0][0] ? {} : { tab: k }, { replace: true })}
              className={cx('flex cursor-pointer items-center gap-2.5 rounded-xl border-none px-3 py-[11px] text-left text-[13px] font-semibold', k === tab ? 'bg-primary-bg text-primary-hover' : 'bg-transparent text-ink-label')}
            >
              <Icon name={icon} size={17} strokeWidth={1.9} />
              {l}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 max-w-[820px] flex-1 basis-[420px] flex-col gap-[22px] rounded-[20px] border border-line bg-white p-5 sm:p-7">
          {tab === 'profil' && <TabProfil />}
          {tab === 'pengguna' && <TabPengguna />}
          {tab === 'kategori' && <TabKategori />}
          {tab === 'event' && <TabEvent />}
          {tab === 'notif' && <TabNotif />}
          {tab === 'keamanan' && <TabKeamanan />}
          {tab === 'akun' && <TabAkun />}
        </div>
      </div>
    </div>
  );
}
