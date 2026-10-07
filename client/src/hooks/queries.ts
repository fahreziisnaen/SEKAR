import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError, keFormData, kirimBerkas, type OnProgres } from '../lib/api';
import { hariIni } from '../lib/tanggal';
import type {
  BarisRekap,
  DataPasangMfa,
  Dokumen,
  EventDetail,
  EventRingkas,
  InfoAplikasi,
  Izin,
  KategoriKeuangan,
  Master,
  Notifikasi,
  Organisasi,
  OrganisasiPublik,
  Pengguna,
  Peserta,
  SessionUser,
  StatusDokumen,
  StatusMfa,
  TemplateEvent,
  Transaksi,
  Tugas,
  Vendor,
} from '../types';

/* ---------- Sesi ---------- */

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<SessionUser | null> => {
    try {
      return (await api<{ user: SessionUser | null }>('/auth/me')).user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQuery);
}

/** Cek izin pengguna saat ini; daftar izin berasal dari server. */
export function useIzin(): (izin: Izin) => boolean {
  const { data } = useMe();
  return (izin) => data?.izin.includes(izin) ?? false;
}

function mulaiSesi(qc: QueryClient, user: SessionUser) {
  keluarManual = false;
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
  qc.setQueryData(meQuery.queryKey, user);
}

/** Menandai sesi dimulai (setelah langkah MFA selesai); halaman login lalu mengarahkan ke aplikasi. */
export function useMasukSesi(): (user: SessionUser) => void {
  const qc = useQueryClient();
  return (user) => mulaiSesi(qc, user);
}

/** `langkah`: kata sandi benar, tetapi akun butuh kode MFA ('mfa') atau wajib memasangnya ('pasang-mfa'). */
export type HasilLogin = { user: SessionUser } | { langkah: 'mfa' | 'pasang-mfa' };

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; password: string; ingat: boolean }) => api<HasilLogin>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (hasil) => {
      if ('user' in hasil) mulaiSesi(qc, hasil.user);
    },
  });
}

/** Langkah kode MFA saat login. Sesi dimulai oleh pemanggil lewat `useMasukSesi`. */
export function useVerifikasiMfaLogin() {
  return useMutation({
    mutationFn: (kode: string) => api<{ user: SessionUser; sisaKodePemulihan?: number }>('/auth/login/mfa', { method: 'POST', body: { kode } }),
  });
}

/** Pemasangan MFA saat login (organisasi mewajibkan, pengguna belum memasang). */
export const pasangMfaLogin = {
  mulai: () => api<DataPasangMfa>('/auth/login/mfa/pasang', { method: 'POST' }),
  aktifkan: (kode: string) => api<{ user: SessionUser; kodePemulihan: string[] }>('/auth/login/mfa/aktifkan', { method: 'POST', body: { kode } }),
};

/** Pemasangan MFA untuk sesi yang sudah masuk (Akun Saya, atau layar MFA wajib). */
export const pasangMfaSesi = {
  mulai: () => api<DataPasangMfa>('/auth/mfa/pasang', { method: 'POST' }),
  aktifkan: async (kode: string) => (await api<{ kodePemulihan: string[] }>('/auth/mfa/aktifkan', { method: 'POST', body: { kode } })).kodePemulihan,
};

const KEY_MFA: QueryKey[] = [['me'], ['mfa'], ['pengguna']];

export function useStatusMfa() {
  return useQuery({ queryKey: ['mfa'], queryFn: () => api<StatusMfa>('/auth/mfa') });
}

/** Dipanggil setelah pemasangan selesai (kode pemulihan sudah ditampilkan). */
export function useMfaBerubah(): () => Promise<unknown> {
  const qc = useQueryClient();
  return () => Promise.all(KEY_MFA.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useNonaktifkanMfa() {
  return useMutasi((input: { kataSandi: string; kode: string }) => api<void>('/auth/mfa/nonaktifkan', { method: 'POST', body: input }), KEY_MFA);
}

export function useBuatUlangKodePemulihan() {
  return useMutasi(
    async (kode: string) => (await api<{ kodePemulihan: string[] }>('/auth/mfa/kode-pemulihan', { method: 'POST', body: { kode } })).kodePemulihan,
    [['mfa']],
  );
}

let keluarManual = false;

/**
 * True setelah pengguna menekan Keluar. Guard rute lalu tidak menyimpan "halaman asal",
 * sehingga pengguna berikutnya yang masuk tidak dibawa ke halaman milik sesi sebelumnya.
 */
export function sesiDiakhiriPengguna(): boolean {
  return keluarManual;
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    // Callback tingkat hook tetap jalan walau komponen pemanggil sudah unmount.
    onSettled: () => {
      keluarManual = true;
      navigate('/login', { replace: true });
      qc.setQueryData(meQuery.queryKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'organisasi-publik' && q.queryKey[0] !== 'info' });
    },
  });
}

/** Perubahan tanda tangan memengaruhi sesi, daftar pengguna, PIC event, dan pencatat transaksi. */
const KEY_TTD: QueryKey[] = [['me'], ['pengguna'], ['event']];

export function useUnggahTandaTangan() {
  return useMutasiUnggah(
    (file: File, onProgres) => kirimBerkas<{ tandaTangan: string }>('/auth/tanda-tangan', keFormData({ file }), { method: 'PUT', onProgres }),
    KEY_TTD,
  );
}

export function useHapusTandaTangan() {
  return useMutasi(() => api<void>('/auth/tanda-tangan', { method: 'DELETE' }), KEY_TTD);
}

/** Path API gambar tanda tangan; `null` bila pengguna belum mengunggah. */
export function pathTandaTangan(penggunaId: number, versi: string | null): string | null {
  return versi ? `/pengguna/${penggunaId}/tanda-tangan?v=${encodeURIComponent(versi)}` : null;
}

export function useGantiSandi() {
  return useMutation({ mutationFn: (input: { lama: string; baru: string }) => api<void>('/auth/kata-sandi', { method: 'PUT', body: input }) });
}

/* ---------- Aplikasi & organisasi ---------- */

export function useInfo() {
  return useQuery({ queryKey: ['info'], queryFn: () => api<InfoAplikasi>('/info'), staleTime: Infinity });
}

/**
 * Pesan galat bila berkas melebihi batas unggah server, agar berkas besar ditolak sebelum
 * dikirim (bukan setelah menunggu progres sampai 100%).
 */
export function useCekUkuranBerkas(): (file: File) => string {
  const mb = useInfo().data?.maksUnggahMb;
  return (file) => (mb && file.size > mb * 1024 * 1024 ? `Ukuran berkas maksimal ${mb} MB (berkas ini ${(file.size / 1024 / 1024).toFixed(1)} MB).` : '');
}

/** "Hari ini" menurut zona waktu aplikasi yang dikonfigurasi di server. */
export function useHariIni(): string {
  return hariIni(useInfo().data?.zonaWaktu);
}

export function useOrganisasiPublik() {
  return useQuery({
    queryKey: ['organisasi-publik'],
    queryFn: async () => (await api<{ organisasi: OrganisasiPublik }>('/organisasi/publik')).organisasi,
    staleTime: 5 * 60_000,
  });
}

export function useOrganisasi() {
  return useQuery({ queryKey: ['organisasi'], queryFn: async () => (await api<{ organisasi: Organisasi | null }>('/organisasi')).organisasi });
}

function useMutasi<TInput, TOutput>(fn: (input: TInput) => Promise<TOutput>, keys: QueryKey[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

/**
 * Seperti `useMutasi`, ditambah `progres` unggah (0–100) selama berkas dikirim; `null` bila
 * tidak sedang mengunggah. Setelah 100%, server masih memproses sampai mutasi selesai.
 */
function useMutasiUnggah<TInput, TOutput>(fn: (input: TInput, onProgres: OnProgres) => Promise<TOutput>, keys: QueryKey[]) {
  const qc = useQueryClient();
  const [progres, setProgres] = useState<number | null>(null);
  const mutasi = useMutation({
    mutationFn: (input: TInput) => {
      setProgres(0);
      return fn(input, setProgres);
    },
    onSuccess: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
    onSettled: () => setProgres(null),
  });
  return { ...mutasi, progres };
}

const KEY_ORG: QueryKey[] = [['organisasi'], ['organisasi-publik'], ['notifikasi']];

export function useSimpanOrganisasi() {
  return useMutasi((input: Pick<Organisasi, 'nama' | 'email' | 'telepon' | 'kota'>) => api('/organisasi', { method: 'PUT', body: input }), KEY_ORG);
}

export function useUbahNotifikasi() {
  return useMutasi(
    (input: Partial<Pick<Organisasi, 'notifPengingatTenggat' | 'notifPeringatanKeuangan'>>) => api('/organisasi/notifikasi', { method: 'PATCH', body: input }),
    KEY_ORG,
  );
}

export function useUnggahLogo() {
  return useMutasiUnggah((file: File, onProgres) => kirimBerkas('/organisasi/logo', keFormData({ file }), { onProgres }), KEY_ORG);
}

/** Mewajibkan MFA untuk semua pengguna organisasi. */
export function useUbahKeamanan() {
  return useMutasi((input: { wajibMfa: boolean }) => api('/organisasi/keamanan', { method: 'PATCH', body: input }), [...KEY_ORG, ['me']]);
}

export function useHapusLogo() {
  return useMutasi(() => api('/organisasi/logo', { method: 'DELETE' }), KEY_ORG);
}

/* ---------- Master data & pengguna ---------- */

export function useMaster() {
  return useQuery({ queryKey: ['master'], queryFn: () => api<Master>('/master'), staleTime: 5 * 60_000 });
}

export type JenisMaster = 'kategori' | 'metode' | 'jenis-dokumen';

export function useTambahMaster() {
  return useMutasi(
    ({ jenisMaster, ...body }: { jenisMaster: JenisMaster; nama: string; jenis?: KategoriKeuangan['jenis'] }) => api(`/master/${jenisMaster}`, { method: 'POST', body }),
    [['master']],
  );
}

export function useHapusMaster() {
  return useMutasi(({ jenisMaster, id }: { jenisMaster: JenisMaster; id: number }) => api(`/master/${jenisMaster}/${id}`, { method: 'DELETE' }), [['master']]);
}

export function useSimpanTemplate() {
  return useMutasi(
    ({ id, ...body }: Omit<TemplateEvent, 'id'> & { id?: number }) => api(id ? `/master/template/${id}` : '/master/template', { method: id ? 'PUT' : 'POST', body }),
    [['master']],
  );
}

export function useHapusTemplate() {
  return useMutasi((id: number) => api(`/master/template/${id}`, { method: 'DELETE' }), [['master']]);
}

export function usePengguna() {
  return useQuery({ queryKey: ['pengguna'], queryFn: async () => (await api<{ pengguna: Pengguna[] }>('/pengguna')).pengguna });
}

export type InputPengguna = Omit<Pengguna, 'id' | 'aktif' | 'tandaTangan' | 'mfaAktif'> & { aktif?: boolean; kataSandi?: string };

export function useSimpanPengguna() {
  return useMutasi(
    ({ id, ...body }: InputPengguna & { id?: number }) => api(id ? `/pengguna/${id}` : '/pengguna', { method: id ? 'PUT' : 'POST', body }),
    [['pengguna'], ['event'], ['me']],
  );
}

/** Admin mematikan MFA pengguna lain (mis. ponsel hilang); sesi pengguna itu dicabut. */
export function useResetMfaPengguna() {
  return useMutasi((id: number) => api<{ pengguna: Pengguna }>(`/pengguna/${id}/mfa`, { method: 'DELETE' }), [['pengguna']]);
}

/* ---------- Event ---------- */

export function useEvents() {
  return useQuery({ queryKey: ['event'], queryFn: async () => (await api<{ event: EventRingkas[] }>('/event')).event });
}

export function useEventDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => (await api<{ event: EventDetail }>(`/event/${id}`)).event,
    enabled: Boolean(id),
  });
}

export interface InputEvent {
  nama: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  venue: string;
  deskripsi: string;
  picId: number;
  anggotaIds: number[];
  budget: number;
  targetPemasukan: number;
  estimasiPengeluaran: number;
}

/** Perubahan data event memengaruhi daftar, detail, rekap, dan notifikasi. */
const KEY_EVENT: QueryKey[] = [['event'], ['rekap'], ['notifikasi']];

export function useBuatEvent() {
  return useMutasi(
    async (input: InputEvent & { templateId: number | null }) => (await api<{ event: EventDetail }>('/event', { method: 'POST', body: input })).event,
    KEY_EVENT,
  );
}

export function useUbahEvent(id: number) {
  return useMutasi(
    async (input: InputEvent & { status: EventDetail['status']; tahap: number }) => (await api<{ event: EventDetail }>(`/event/${id}`, { method: 'PUT', body: input })).event,
    KEY_EVENT,
  );
}

export function useHapusEvent() {
  return useMutasi((id: number) => api(`/event/${id}`, { method: 'DELETE' }), KEY_EVENT);
}

export function useSimpanAnggaran(eventId: number) {
  return useMutasi(
    (items: { kategoriId: number; nominal: number }[]) => api(`/event/${eventId}/anggaran`, { method: 'PUT', body: { items } }),
    KEY_EVENT,
  );
}

/* ---------- Transaksi ---------- */

export function useTransaksi(eventId: number | undefined, rentang: { dari: string | null; sampai: string | null } = { dari: null, sampai: null }) {
  const q = new URLSearchParams();
  if (rentang.dari) q.set('dari', rentang.dari);
  if (rentang.sampai) q.set('sampai', rentang.sampai);
  const qs = q.toString();
  return useQuery({
    queryKey: ['event', eventId, 'transaksi', qs],
    queryFn: async () => (await api<{ transaksi: Transaksi[] }>(`/event/${eventId}/transaksi${qs ? `?${qs}` : ''}`)).transaksi,
    enabled: Boolean(eventId),
    // Ganti periode: data lama tetap tampil sampai data baru siap. Ganti event: jangan, agar
    // transaksi event lain tidak sempat tampil di bawah judul event yang baru.
    placeholderData: (lama, queryLama) => (queryLama?.queryKey[1] === eventId ? lama : undefined),
  });
}

export interface InputTransaksi {
  eventId: number;
  tanggal: string;
  keterangan: string;
  kategoriId: number;
  nominal: number;
  metodeId: number;
  catatan: string;
  pihak: string;
  pihakKeterangan: string;
  bank: string;
  nomorRekening: string;
  nomorReferensi: string;
  bukti: File | null;
}

export function useTambahTransaksi() {
  return useMutasiUnggah(
    async ({ eventId, bukti, ...f }: InputTransaksi, onProgres) =>
      (await kirimBerkas<{ transaksi: Transaksi }>(`/event/${eventId}/transaksi`, keFormData({ ...f, file: bukti }), { onProgres })).transaksi,
    KEY_EVENT,
  );
}

export function useHapusTransaksi() {
  return useMutasi((id: number) => api(`/transaksi/${id}`, { method: 'DELETE' }), KEY_EVENT);
}

/* ---------- Kebutuhan ---------- */

export function useTugas(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'tugas'],
    queryFn: async () => (await api<{ tugas: Tugas[] }>(`/event/${eventId}/tugas`)).tugas,
    enabled: Boolean(eventId),
  });
}

export function useTambahTugas(eventId: number) {
  return useMutasi((input: { label: string; picId: number | null; tenggat: string | null }) => api(`/event/${eventId}/tugas`, { method: 'POST', body: input }), KEY_EVENT);
}

export function useUbahTugas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; eventId: number; selesai?: boolean }) =>
      (await api<{ tugas: Tugas }>(`/tugas/${id}`, { method: 'PATCH', body: { selesai: body.selesai } })).tugas,
    // Centang terasa instan; dikembalikan bila server menolak.
    onMutate: async ({ id, eventId, selesai }) => {
      const key = ['event', eventId, 'tugas'];
      await qc.cancelQueries({ queryKey: key });
      const sebelum = qc.getQueryData<Tugas[]>(key);
      qc.setQueryData<Tugas[]>(key, (list) => list?.map((t) => (t.id === id ? { ...t, selesai: selesai ?? t.selesai } : t)));
      return { key, sebelum };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.sebelum),
    onSettled: () => Promise.all(KEY_EVENT.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export function useHapusTugas() {
  return useMutasi((id: number) => api(`/tugas/${id}`, { method: 'DELETE' }), KEY_EVENT);
}

/* ---------- Dokumen ---------- */

export function useDokumen(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'dokumen'],
    queryFn: async () => (await api<{ dokumen: Dokumen[] }>(`/event/${eventId}/dokumen`)).dokumen,
    enabled: Boolean(eventId),
  });
}

export function useUnggahDokumen() {
  return useMutasiUnggah(
    async ({ eventId, file, ...f }: { eventId: number; nama: string; jenisId: number; file: File }, onProgres) =>
      (await kirimBerkas<{ dokumen: Dokumen }>(`/event/${eventId}/dokumen`, keFormData({ ...f, file }), { onProgres })).dokumen,
    [['event']],
  );
}

export function useUbahDokumen() {
  return useMutasi(({ id, ...body }: { id: number; status: StatusDokumen }) => api(`/dokumen/${id}`, { method: 'PATCH', body }), [['event']]);
}

export function useHapusDokumen() {
  return useMutasi((id: number) => api(`/dokumen/${id}`, { method: 'DELETE' }), [['event']]);
}

/* ---------- Peserta ---------- */

export function usePeserta(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'peserta'],
    queryFn: async () => (await api<{ peserta: Peserta[] }>(`/event/${eventId}/peserta`)).peserta,
    enabled: Boolean(eventId),
  });
}

export type InputPeserta = Omit<Peserta, 'id'>;

export function useTambahPeserta(eventId: number) {
  return useMutasi((input: InputPeserta) => api(`/event/${eventId}/peserta`, { method: 'POST', body: input }), [['event', eventId, 'peserta']]);
}

export function useImporPeserta(eventId: number) {
  return useMutasi(
    (peserta: Partial<InputPeserta>[]) => api<{ jumlah: number }>(`/event/${eventId}/peserta/impor`, { method: 'POST', body: { peserta } }),
    [['event', eventId, 'peserta']],
  );
}

export function useUbahPeserta(eventId: number) {
  return useMutasi(({ id, ...body }: Partial<InputPeserta> & { id: number }) => api(`/peserta/${id}`, { method: 'PATCH', body }), [['event', eventId, 'peserta']]);
}

export function useHapusPeserta(eventId: number) {
  return useMutasi((id: number) => api(`/peserta/${id}`, { method: 'DELETE' }), [['event', eventId, 'peserta']]);
}

/* ---------- Vendor ---------- */

export function useVendor(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'vendor'],
    queryFn: async () => (await api<{ vendor: Vendor[] }>(`/event/${eventId}/vendor`)).vendor,
    enabled: Boolean(eventId),
  });
}

export type InputVendor = Omit<Vendor, 'id'>;

export function useSimpanVendor(eventId: number) {
  return useMutasi(
    ({ id, ...body }: InputVendor & { id?: number }) => api(id ? `/vendor/${id}` : `/event/${eventId}/vendor`, { method: id ? 'PUT' : 'POST', body }),
    [['event', eventId, 'vendor']],
  );
}

export function useHapusVendor(eventId: number) {
  return useMutasi((id: number) => api(`/vendor/${id}`, { method: 'DELETE' }), [['event', eventId, 'vendor']]);
}

/* ---------- Laporan & notifikasi ---------- */

/** `query` null = tidak dimuat (jenis laporan lain sedang dibuka). */
export function useRekap(query: string | null) {
  return useQuery({
    queryKey: ['rekap', query],
    queryFn: async () => (await api<{ rekap: BarisRekap[] }>(`/laporan/rekap${query}`)).rekap,
    enabled: query !== null,
    placeholderData: keepPreviousData,
  });
}

export function useNotifikasi() {
  return useQuery({
    queryKey: ['notifikasi'],
    queryFn: async () => (await api<{ notifikasi: Notifikasi[] }>('/notifikasi')).notifikasi,
    refetchInterval: 5 * 60_000,
  });
}

