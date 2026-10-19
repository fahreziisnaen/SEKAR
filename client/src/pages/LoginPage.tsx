import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Icon, LogoSekar } from '../components/icons';
import { Modal, TombolTutup } from '../components/Modal';
import { PesanGalat } from '../components/Status';
import { useToast } from '../components/Toast';
import { PasangMfa } from '../features/mfa/PasangMfa';
import { VerifikasiMfa } from '../features/mfa/VerifikasiMfa';
import { pasangMfaLogin, useHariIni, useInfo, useLogin, useMasukSesi, useMe, useOrganisasiPublik, useVerifikasiMfaLogin } from '../hooks/queries';
import { ApiError, errorMessage } from '../lib/api';
import type { SessionUser } from '../types';

const kelasInputLogin =
  'rounded-[14px] border border-line-input bg-white px-4 py-[13px] text-[15px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(47,111,237,.12)]';

type Langkah = 'sandi' | 'mfa' | 'pasang-mfa';

const kelasTombolUtama =
  'cursor-pointer rounded-[14px] border-none bg-primary p-[15px] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(47,111,237,.9)] hover:bg-primary-hover disabled:opacity-70';

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const verifikasi = useVerifikasiMfaLogin().mutateAsync;
  const masuk = useMasukSesi();
  const toast = useToast();
  const org = useOrganisasiPublik().data;
  const versi = useInfo().data?.versi;
  const tahun = useHariIni().slice(0, 4);
  const location = useLocation();
  const [langkah, setLangkah] = useState<Langkah>('sandi');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [ingat, setIngat] = useState(false);
  const [err, setErr] = useState('');
  const [lupa, setLupa] = useState(false);
  // Hasil pemasangan MFA wajib: sesi baru dimulai setelah kode pemulihan disimpan.
  const userBaru = useRef<SessionUser | null>(null);

  const dari = (location.state as { dari?: string } | null)?.dari;
  if (me.data) return <Navigate to={dari && !dari.startsWith('/login') ? dari : '/'} replace />;

  const kembali = (pesan = '') => {
    setLangkah('sandi');
    setPass('');
    setErr(pesan);
  };

  /** Tiket MFA kedaluwarsa (10 menit): tutup dialog dan ulangi dari kata sandi. */
  const tiketHabis = (x: unknown) => {
    if (!(x instanceof ApiError && x.code === 'MFA_TIKET_TIDAK_VALID')) return false;
    kembali(x.message);
    return true;
  };

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pass) return setErr('Isi username dan kata sandi terlebih dahulu.');
    login.mutate(
      { username: username.trim(), password: pass, ingat },
      {
        onSuccess: (hasil) => {
          if ('langkah' in hasil) setLangkah(hasil.langkah);
        },
        onError: (x) => setErr(errorMessage(x)),
      },
    );
  };

  const selesaiMfa = ({ user, sisaKodePemulihan }: { user: SessionUser; sisaKodePemulihan?: number }) => {
    if (sisaKodePemulihan !== undefined) {
      toast(
        sisaKodePemulihan > 0
          ? `Masuk dengan kode pemulihan. Sisa ${sisaKodePemulihan} kode; buat ulang di Pengaturan › Akun Saya bila hampir habis.`
          : 'Kode pemulihan terakhir sudah dipakai. Segera buat kode baru di Pengaturan › Akun Saya.',
      );
    }
    masuk(user);
  };

  return (
    <div className="grid min-h-screen grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] bg-canvas">
      <div className="relative flex flex-col gap-6 sm:gap-9 overflow-hidden bg-navy px-6 py-8 sm:py-12 text-white sm:px-14 sm:min-h-[560px]">
        <div className="absolute -top-[120px] -right-[120px] size-[360px] rounded-full bg-accent opacity-95" />
        <div className="absolute -top-10 -right-10 size-[200px] rounded-full bg-navy" />
        <div className="absolute -bottom-[110px] -left-[90px] size-[280px] rounded-full border-[44px] border-primary opacity-50" />
        <div className="relative flex items-center gap-3">
          <LogoSekar ubin className="size-10 sm:size-[52px] rounded-2xl p-1 sm:p-1.5" />
          <div className="font-display text-2xl sm:text-[30px] font-extrabold tracking-[.04em]">SEKAR</div>
        </div>
        <div className="relative flex max-w-[460px] flex-col gap-3 sm:gap-4">
          <div className="font-display text-2xl sm:text-[44px] leading-[1.08] sm:leading-[1.05] font-bold tracking-[-.02em] text-balance">
            Kelola Event, Catat Keuangan, <span className="text-accent">Tertata.</span>
          </div>
          <div className="text-sm sm:text-base leading-[1.6] text-pretty text-on-navy">
            Sistem Event, Keuangan, dan Administrasi Terintegrasi. Dari rencana hingga laporan, semua dalam satu sistem.
          </div>
        </div>
        <div className="relative flex flex-1 items-center justify-center max-sm:hidden">
          {/* Master: branding/SEKAR_Front.png. Versi web dibuat ulang bila master diganti. */}
          <img
            src="/ilustrasi/login-1400.webp"
            srcSet="/ilustrasi/login-800.webp 800w, /ilustrasi/login-1400.webp 1400w"
            sizes="(min-width: 840px) 50vw, 100vw"
            width={1400}
            height={771}
            alt="Ilustrasi panggung event SEKAR dengan tim yang mengelola acara dari laptop"
            decoding="async"
            fetchPriority="high"
            className="h-auto w-full max-w-[680px] animate-fade-up drop-shadow-[0_24px_40px_rgba(0,0,0,.28)]"
          />
        </div>
        <div className="relative flex flex-wrap gap-4 sm:gap-5 text-xs sm:text-[13px] text-on-navy">
          {[
            ['#F5B800', 'Kelola event'],
            ['#1E9E63', 'Catat keuangan'],
            ['#4E8AF5', 'Administrasi tertata'],
          ].map(([c, l]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[400px] flex-col gap-7">
          <form onSubmit={kirim} noValidate className="flex animate-fade-up-fast flex-col gap-7">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold tracking-[.14em] text-accent-ink uppercase">{org?.nama ? `${org.nama} · Akses internal` : 'Akses internal'}</div>
              <h1 className="m-0 font-display text-[34px] font-bold tracking-[-.02em] text-navy">Masuk ke SEKAR</h1>
              <div className="text-sm text-ink-slate">Gunakan akun tim{org?.nama ? ` ${org.nama}` : ''} kamu.</div>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-label">
                Username
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErr('');
                  }}
                  className={kelasInputLogin}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-label">
                Kata sandi
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setErr('');
                  }}
                  className={kelasInputLogin}
                />
              </label>
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 text-ink-body">
                  <input type="checkbox" checked={ingat} onChange={(e) => setIngat(e.target.checked)} />
                  Ingat saya
                </label>
                <button type="button" onClick={() => setLupa(!lupa)} aria-expanded={lupa} className="cursor-pointer border-none bg-transparent p-0 text-primary hover:text-primary-hover">
                  Lupa kata sandi?
                </button>
              </div>
              {lupa && (
                <div className="rounded-xl bg-primary-bg px-3.5 py-[11px] text-[13px] text-primary-hover">
                  Hubungi admin {org?.nama ?? 'organisasi'} untuk mengatur ulang kata sandi lewat menu Pengaturan › Pengguna.
                </div>
              )}
            </div>
            {err && (
              <div className="-mt-3">
                <PesanGalat>{err}</PesanGalat>
              </div>
            )}
            <button type="submit" disabled={login.isPending} className={kelasTombolUtama}>
              {login.isPending ? 'Memeriksa…' : 'Masuk'}
            </button>
          </form>

          {langkah === 'mfa' && (
            <VerifikasiMfa
              verifikasi={verifikasi}
              onBerhasil={selesaiMfa}
              onBatal={() => kembali()}
              tanganiGalat={tiketHabis}
            />
          )}

          {langkah === 'pasang-mfa' && (
            <Modal onClose={() => kembali()} align="top" className="max-w-[560px] overflow-hidden rounded-[28px] shadow-modal">
              {(titleId) => (
                <div className="flex flex-col">
                  <div className="relative flex items-start gap-4 bg-[linear-gradient(180deg,#EEF4FF_0%,#FFFFFF_100%)] px-[26px] pt-7 pb-5">
                    <span className="flex size-12 flex-none animate-pop items-center justify-center rounded-2xl bg-primary-bg">
                      <span className="animate-mengambang">
                        <Icon name="shield" size={26} stroke="#2F6FED" strokeWidth={1.8} />
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="text-xs font-bold tracking-[.14em] text-accent-ink uppercase">Verifikasi dua langkah</div>
                      <h2 id={titleId} className="m-0 font-display text-[22px] font-bold text-navy">
                        Pasang Google Authenticator
                      </h2>
                      <p className="m-0 text-[13px] leading-normal text-ink-slate">
                        {org?.nama ?? 'Organisasi Anda'} mewajibkan verifikasi dua langkah. Pasang sekali ini; berikutnya cukup masukkan kode dari aplikasi
                        saat masuk.
                      </p>
                    </div>
                    <TombolTutup onClick={() => kembali()} label="Batal" />
                  </div>
                  <div className="px-[26px] pt-2 pb-7">
                    <PasangMfa
                      mulai={() =>
                        pasangMfaLogin.mulai().catch((x: unknown) => {
                          tiketHabis(x);
                          throw x;
                        })
                      }
                      aktifkan={async (k) => {
                        try {
                          const hasil = await pasangMfaLogin.aktifkan(k);
                          userBaru.current = hasil.user;
                          return hasil.kodePemulihan;
                        } catch (x) {
                          tiketHabis(x);
                          throw x;
                        }
                      }}
                      labelSelesai="Masuk ke SEKAR"
                      onSelesai={() => userBaru.current && masuk(userBaru.current)}
                    />
                  </div>
                </div>
              )}
            </Modal>
          )}

          <div className="text-center text-xs text-ink-subtle">
            © {tahun}
            {org?.nama ? ` ${org.nama}` : ''} · SEKAR{versi ? ` v${versi}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
