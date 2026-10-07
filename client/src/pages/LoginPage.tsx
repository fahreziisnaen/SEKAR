import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { LogoSekar } from '../components/icons';
import { PesanGalat } from '../components/Status';
import { useHariIni, useInfo, useLogin, useMe, useOrganisasiPublik } from '../hooks/queries';
import { errorMessage } from '../lib/api';

const kelasInputLogin =
  'rounded-[14px] border border-line-input bg-white px-4 py-[13px] text-[15px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(47,111,237,.12)]';

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const org = useOrganisasiPublik().data;
  const versi = useInfo().data?.versi;
  const tahun = useHariIni().slice(0, 4);
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [ingat, setIngat] = useState(false);
  const [err, setErr] = useState('');
  const [lupa, setLupa] = useState(false);

  const dari = (location.state as { dari?: string } | null)?.dari;
  if (me.data) return <Navigate to={dari && !dari.startsWith('/login') ? dari : '/'} replace />;

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pass) return setErr('Isi email dan kata sandi terlebih dahulu.');
    login.mutate({ email: email.trim(), password: pass, ingat }, { onError: (x) => setErr(errorMessage(x)) });
  };

  return (
    <div className="grid min-h-screen grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] bg-canvas">
      <div className="relative flex min-h-[560px] flex-col gap-9 overflow-hidden bg-navy px-6 py-12 text-white sm:px-14">
        <div className="absolute -top-[120px] -right-[120px] size-[360px] rounded-full bg-accent opacity-95" />
        <div className="absolute -top-10 -right-10 size-[200px] rounded-full bg-navy" />
        <div className="absolute -bottom-[110px] -left-[90px] size-[280px] rounded-full border-[44px] border-primary opacity-50" />
        <div className="relative flex items-center gap-3">
          <LogoSekar ubin className="size-[52px] rounded-2xl p-1.5" />
          <div className="font-display text-[30px] font-extrabold tracking-[.04em]">SEKAR</div>
        </div>
        <div className="relative flex max-w-[460px] flex-col gap-4">
          <div className="font-display text-[44px] leading-[1.05] font-bold tracking-[-.02em] text-balance">
            Kelola Event, Catat Keuangan, <span className="text-accent">Tertata.</span>
          </div>
          <div className="text-base leading-[1.6] text-pretty text-on-navy">
            Sistem Event, Keuangan, dan Administrasi Terintegrasi. Dari rencana hingga laporan, semua dalam satu sistem.
          </div>
        </div>
        <div
          aria-hidden="true"
          className="relative flex min-h-[200px] flex-1 items-center justify-center rounded-3xl border border-dashed border-white/22 p-5 text-center font-mono text-xs text-on-navy-dim"
          style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 10px,rgba(255,255,255,.02) 10px 20px)' }}
        >
          ilustrasi flat: panggung event, tim di depan laptop
        </div>
        <div className="relative flex flex-wrap gap-5 text-[13px] text-on-navy">
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
        <form onSubmit={kirim} noValidate className="flex w-full max-w-[400px] flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold tracking-[.14em] text-accent-ink uppercase">{org?.nama ? `${org.nama} · Akses internal` : 'Akses internal'}</div>
            <h1 className="m-0 font-display text-[34px] font-bold tracking-[-.02em] text-navy">Masuk ke SEKAR</h1>
            <div className="text-sm text-ink-slate">Gunakan akun tim{org?.nama ? ` ${org.nama}` : ''} kamu.</div>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-label">
              Email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
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
          <button
            type="submit"
            disabled={login.isPending}
            className="cursor-pointer rounded-[14px] border-none bg-primary p-[15px] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(47,111,237,.9)] hover:bg-primary-hover disabled:opacity-70"
          >
            {login.isPending ? 'Memeriksa…' : 'Masuk'}
          </button>
          <div className="text-center text-xs text-ink-subtle">
            © {tahun}
            {org?.nama ? ` ${org.nama}` : ''} · SEKAR{versi ? ` v${versi}` : ''}
          </div>
        </form>
      </div>
    </div>
  );
}
