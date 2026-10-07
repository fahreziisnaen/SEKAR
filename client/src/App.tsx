import { lazy, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { OverlayProvider } from './components/Overlays';
import { KerangkaAplikasi } from './components/Kerangka';
import { GagalMemuat } from './components/Status';
import { EventAktifProvider } from './hooks/eventAktif';
import { sesiDiakhiriPengguna, useMe, useOrganisasiPublik } from './hooks/queries';
import { AppShell } from './layout/AppShell';
import { MfaWajib } from './features/mfa/MfaWajib';
import { LoginPage } from './pages/LoginPage';

// Setiap halaman dimuat saat pertama kali dibuka (code splitting); selama itu tampil kerangka.
const BerandaPage = lazy(() => import('./pages/BerandaPage').then((m) => ({ default: m.BerandaPage })));
const EventListPage = lazy(() => import('./pages/EventListPage').then((m) => ({ default: m.EventListPage })));
const EventNewPage = lazy(() => import('./pages/EventNewPage').then((m) => ({ default: m.EventNewPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const KeuanganPage = lazy(() => import('./pages/KeuanganPage').then((m) => ({ default: m.KeuanganPage })));
const AdministrasiPage = lazy(() => import('./pages/AdministrasiPage').then((m) => ({ default: m.AdministrasiPage })));
const LaporanPage = lazy(() => import('./pages/LaporanPage').then((m) => ({ default: m.LaporanPage })));
const PengaturanPage = lazy(() => import('./pages/PengaturanPage').then((m) => ({ default: m.PengaturanPage })));

/** Sesi selalu diverifikasi server (`/api/auth/me`), tidak pernah dari penyimpanan lokal. */
function WajibMasuk({ children }: { children: ReactNode }) {
  const me = useMe();
  const { pathname, search } = useLocation();
  if (me.isPending) return <KerangkaAplikasi />;
  if (me.isError) return <GagalMemuat error={me.error} onRetry={() => void me.refetch()} className="m-6" />;
  if (!me.data) return <Navigate to="/login" replace state={sesiDiakhiriPengguna() ? null : { dari: pathname + search }} />;
  // Organisasi mewajibkan MFA tetapi akun ini belum memasangnya.
  if (me.data.mfa.wajib && !me.data.mfa.aktif) return <MfaWajib />;
  return (
    <EventAktifProvider>
      <OverlayProvider>{children}</OverlayProvider>
    </EventAktifProvider>
  );
}

/** Judul tab browser mengikuti nama organisasi dari Pengaturan. */
function JudulDokumen() {
  const nama = useOrganisasiPublik().data?.nama;
  useEffect(() => {
    document.title = nama ? `SEKAR · ${nama}` : 'SEKAR';
  }, [nama]);
  return null;
}

export function App() {
  return (
    <>
      <JudulDokumen />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <WajibMasuk>
              <AppShell />
            </WajibMasuk>
          }
        >
          <Route index element={<BerandaPage />} />
          <Route path="event" element={<EventListPage />} />
          <Route path="event/baru" element={<EventNewPage />} />
          <Route path="event/:eventId/:tab?" element={<EventDetailPage />} />
          <Route path="keuangan" element={<KeuanganPage />} />
          <Route path="administrasi" element={<AdministrasiPage />} />
          <Route path="laporan" element={<LaporanPage />} />
          <Route path="pengaturan" element={<PengaturanPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
