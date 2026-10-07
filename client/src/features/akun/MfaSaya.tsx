import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/icons';
import { Modal, TombolTutup } from '../../components/Modal';
import { GagalMemuat, Memuat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Badge, Button, Field, Input, cx } from '../../components/ui';
import { pasangMfaSesi, useBuatUlangKodePemulihan, useMe, useMfaBerubah, useNonaktifkanMfa, useStatusMfa } from '../../hooks/queries';
import { errorMessage, fieldErrors } from '../../lib/api';
import { formatTanggalPanjang } from '../../lib/format';
import { DaftarKodePemulihan, IkonStatus, InputPemulihan, DURASI_GAGAL_MS, jeda, KodeOtp, kodeLengkap, PesanKode, TimerTotp, type StatusKode } from '../mfa/KodeMfa';
import { PasangMfa } from '../mfa/PasangMfa';

function ModalMfa({ judul, onClose, children }: { judul: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal onClose={onClose} align="top" className="max-w-[560px] rounded-3xl p-[26px]">
      {(titleId) => (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              {judul}
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          {children}
        </div>
      )}
    </Modal>
  );
}

/** Status animasi kolom kode untuk satu formulir: goyang saat ditolak, lalu kosong lagi. */
function useStatusKode() {
  const [status, setStatus] = useState<StatusKode>('diam');
  const [getar, setGetar] = useState(0);
  const [pesan, setPesan] = useState('');
  return {
    status,
    getar,
    pesan,
    setPesan,
    periksa: () => {
      setStatus('memeriksa');
      setPesan('');
    },
    berhasil: () => setStatus('berhasil'),
    tolak: (teks: string, bersihkan?: () => void) => {
      setStatus('gagal');
      setPesan(teks);
      setGetar((g) => g + 1);
      setTimeout(() => {
        bersihkan?.();
        setStatus('diam');
      }, DURASI_GAGAL_MS);
    },
  };
}

/** Kode baru menggantikan semua kode pemulihan lama. */
function BuatUlangKode({ onClose }: { onClose: () => void }) {
  const buat = useBuatUlangKodePemulihan();
  const st = useStatusKode();
  const [kode, setKode] = useState('');
  const [baru, setBaru] = useState<string[] | null>(null);
  if (baru) return <DaftarKodePemulihan kode={baru} onLanjut={onClose} />;
  const kirim = async (k: string = kode) => {
    if (st.status === 'memeriksa' || st.status === 'berhasil') return;
    if (!kodeLengkap(k, false)) return st.tolak('Masukkan 6 digit kode dari aplikasi.');
    st.periksa();
    const [hasil] = await Promise.allSettled([buat.mutateAsync(k), jeda(450)]);
    if (hasil.status === 'rejected') return st.tolak(errorMessage(hasil.reason), () => setKode(''));
    st.berhasil();
    setTimeout(() => setBaru(hasil.value), 900);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void kirim();
  };
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex justify-center py-1">
        <IkonStatus status={st.status} getar={st.getar} ukuran={72} />
      </div>
      <p className="m-0 text-center text-[13px] leading-normal text-ink-body">
        Masukkan kode dari aplikasi untuk membuat 10 kode pemulihan baru. Semua kode lama tidak berlaku lagi.
      </p>
      <KodeOtp
        autoFocus
        label="Kode dari aplikasi"
        value={kode}
        status={st.status}
        getar={st.getar}
        onChange={(v) => {
          setKode(v);
          st.setPesan('');
        }}
        onLengkap={(k) => void kirim(k)}
      />
      <TimerTotp />
      <PesanKode pesan={st.pesan} getar={st.getar} />
      <Button type="submit" disabled={st.status === 'memeriksa' || st.status === 'berhasil'} className="flex items-center justify-center gap-2 px-5 py-[11px] text-sm disabled:opacity-70">
        {st.status === 'memeriksa' && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {st.status === 'memeriksa' ? 'Memeriksa…' : st.status === 'berhasil' ? 'Kode cocok' : 'Buat Kode Baru'}
      </Button>
    </form>
  );
}

function Nonaktifkan({ onClose }: { onClose: () => void }) {
  const matikan = useNonaktifkanMfa();
  const toast = useToast();
  const st = useStatusKode();
  const [kataSandi, setKataSandi] = useState('');
  const [kode, setKode] = useState('');
  const [pemulihan, setPemulihan] = useState(false);
  const [sandiSalah, setSandiSalah] = useState(false);
  const me = useMe().data;
  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (st.status === 'memeriksa' || st.status === 'berhasil') return;
    if (!kataSandi) return st.tolak('Isi kata sandi Anda.');
    if (!kodeLengkap(kode, pemulihan)) return st.tolak(pemulihan ? 'Masukkan kode pemulihan 10 karakter.' : 'Masukkan 6 digit kode dari aplikasi.');
    st.periksa();
    setSandiSalah(false);
    const [hasil] = await Promise.allSettled([matikan.mutateAsync({ kataSandi, kode }), jeda(450)]);
    if (hasil.status === 'rejected') {
      const galat = fieldErrors(hasil.reason);
      if (galat.kataSandi) setSandiSalah(true);
      return st.tolak(galat.kataSandi ?? errorMessage(hasil.reason), galat.kataSandi ? undefined : () => setKode(''));
    }
    st.berhasil();
    setTimeout(() => {
      toast('Verifikasi dua langkah dinonaktifkan');
      onClose();
    }, 900);
  };
  return (
    <form onSubmit={(e) => void kirim(e)} noValidate className="flex flex-col gap-4">
      <div className="rounded-xl bg-danger-bg px-4 py-3 text-[13px] leading-normal text-danger-ink">
        Tanpa verifikasi dua langkah, akun hanya dilindungi kata sandi. Semua kode pemulihan juga akan dihapus.
      </div>
      <input type="text" name="username" autoComplete="username" value={me?.username ?? ''} readOnly hidden />
      <Field label="Kata sandi">
        <Input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={kataSandi}
          onChange={(e) => {
            setKataSandi(e.target.value);
            setSandiSalah(false);
            st.setPesan('');
          }}
          className={cx('py-[11px]', sandiSalah && 'border-danger bg-danger-bg')}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-label">{pemulihan ? 'Kode pemulihan' : 'Kode dari aplikasi'}</span>
        {pemulihan ? (
          <InputPemulihan
            value={kode}
            status={st.status}
            getar={st.getar}
            onChange={(v) => {
              setKode(v);
              st.setPesan('');
            }}
          />
        ) : (
          <KodeOtp
            label="Kode dari aplikasi"
            className="justify-start"
            value={kode}
            status={st.status}
            getar={st.getar}
            onChange={(v) => {
              setKode(v);
              st.setPesan('');
            }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setPemulihan(!pemulihan);
          setKode('');
          st.setPesan('');
        }}
        className="cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-semibold text-primary"
      >
        {pemulihan ? 'Pakai kode dari aplikasi' : 'Pakai kode pemulihan'}
      </button>
      <PesanKode pesan={st.pesan} getar={st.getar} />
      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" onClick={onClose} disabled={st.status === 'memeriksa'} className="px-[18px] py-[11px] text-sm disabled:opacity-50">
          Batal
        </Button>
        <Button
          type="submit"
          disabled={st.status === 'memeriksa' || st.status === 'berhasil'}
          className="flex items-center gap-2 bg-danger px-5 py-[11px] text-sm hover:bg-danger-ink disabled:opacity-70"
        >
          {st.status === 'memeriksa' && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {st.status === 'memeriksa' ? 'Memeriksa…' : st.status === 'berhasil' ? 'Dinonaktifkan' : 'Nonaktifkan'}
        </Button>
      </div>
    </form>
  );
}

/** Verifikasi dua langkah (Google Authenticator) milik pengguna yang sedang masuk. */
export function MfaSaya() {
  const q = useStatusMfa();
  const mfaBerubah = useMfaBerubah();
  const toast = useToast();
  const [modal, setModal] = useState<'pasang' | 'kode' | 'nonaktif' | null>(null);
  const tutup = () => setModal(null);

  return (
    <div className="flex flex-col gap-3.5 border-t border-line-soft pt-5">
      <div className="flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name="shield" size={17} stroke="#2F6FED" />
        Verifikasi dua langkah (Google Authenticator)
      </div>
      {q.isPending ? (
        <Memuat baris={2} className="p-0" />
      ) : q.isError ? (
        <GagalMemuat error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.aktif ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-ink-body">
            <Badge status="Aktif" className="px-2.5 py-[3px]" />
            {q.data.aktifSejak && <span>sejak {formatTanggalPanjang(q.data.aktifSejak.slice(0, 10))}</span>}
            {q.data.wajib && <span className="text-xs text-ink-muted">· Diwajibkan organisasi</span>}
          </div>
          <div className={q.data.sisaKodePemulihan <= 3 ? 'text-[13px] font-semibold text-danger-ink' : 'text-[13px] text-ink-muted'}>
            Sisa kode pemulihan: {q.data.sisaKodePemulihan} dari 10{q.data.sisaKodePemulihan <= 3 ? ' — sebaiknya buat kode baru.' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setModal('kode')} className="px-3.5 py-2 text-[13px]">
              Buat Ulang Kode Pemulihan
            </Button>
            {!q.data.wajib && (
              <Button variant="secondary" onClick={() => setModal('nonaktif')} className="border-danger-dash px-3.5 py-2 text-[13px] text-danger-ink hover:border-danger">
                Nonaktifkan
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 max-w-[520px] text-[13px] leading-normal text-ink-body">
            Selain kata sandi, setiap kali masuk Anda diminta kode 6 digit dari aplikasi Google Authenticator di ponsel. Akun tetap aman walau kata sandi
            diketahui orang lain.
          </p>
          <Button onClick={() => setModal('pasang')} className="self-start px-3.5 py-2 text-[13px]">
            Aktifkan Verifikasi Dua Langkah
          </Button>
        </div>
      )}

      {modal === 'pasang' && (
        <ModalMfa judul="Aktifkan verifikasi dua langkah" onClose={tutup}>
          <PasangMfa
            mulai={pasangMfaSesi.mulai}
            aktifkan={pasangMfaSesi.aktifkan}
            onSelesai={() => {
              void mfaBerubah();
              toast('Verifikasi dua langkah aktif. Sesi di perangkat lain telah diakhiri.');
              tutup();
            }}
          />
        </ModalMfa>
      )}
      {modal === 'kode' && (
        <ModalMfa judul="Kode pemulihan baru" onClose={tutup}>
          <BuatUlangKode onClose={tutup} />
        </ModalMfa>
      )}
      {modal === 'nonaktif' && (
        <ModalMfa judul="Nonaktifkan verifikasi dua langkah" onClose={tutup}>
          <Nonaktifkan onClose={tutup} />
        </ModalMfa>
      )}
    </div>
  );
}
