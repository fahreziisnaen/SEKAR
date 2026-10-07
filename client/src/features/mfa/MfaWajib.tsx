import { Icon, LogoSekar } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { useLogout, useMe, useMfaBerubah, useOrganisasiPublik, pasangMfaSesi } from '../../hooks/queries';
import { PasangMfa } from './PasangMfa';

/**
 * Layar penghalang: organisasi mewajibkan MFA, sedangkan akun ini (yang sudah masuk sebelum
 * aturan berlaku) belum memasangnya. Aplikasi baru bisa dipakai setelah MFA aktif.
 */
export function MfaWajib() {
  const me = useMe().data;
  const org = useOrganisasiPublik().data;
  const mfaBerubah = useMfaBerubah();
  const keluar = useLogout();
  const toast = useToast();
  return (
    <div className="flex min-h-screen items-start justify-center bg-canvas px-4 py-10 sm:items-center">
      <div className="flex w-full max-w-[600px] animate-fade-up flex-col gap-6 rounded-3xl border border-line bg-white p-6 shadow-[0_24px_60px_-30px_rgba(18,38,74,.35)] sm:p-8">
        <div className="flex items-center gap-3">
          <LogoSekar className="size-11" />
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-[.05em] text-navy">SEKAR</span>
            {org?.nama && <span className="text-xs text-ink-muted">{org.nama}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 flex items-center gap-2.5 font-display text-[26px] font-bold tracking-[-.01em] text-navy">
            <Icon name="shield" size={26} stroke="#2F6FED" />
            Pasang verifikasi dua langkah
          </h1>
          <p className="m-0 text-sm leading-normal text-ink-slate">
            {org?.nama ?? 'Organisasi Anda'} mewajibkan verifikasi dua langkah untuk semua pengguna. Hai {me?.nama ?? ''}, pasang Google Authenticator di ponsel
            Anda untuk melanjutkan.
          </p>
        </div>
        <PasangMfa
          mulai={pasangMfaSesi.mulai}
          aktifkan={pasangMfaSesi.aktifkan}
          labelSelesai="Lanjut ke SEKAR"
          onSelesai={() => {
            void mfaBerubah();
            toast('Verifikasi dua langkah aktif');
          }}
        />
        <button
          type="button"
          onClick={() => keluar.mutate()}
          className="cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-semibold text-ink-muted hover:text-navy"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
