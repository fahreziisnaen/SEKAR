import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { OverlayProvider } from './components/Overlays';
import { GagalMemuat, Memuat } from './components/Status';
import { EventAktifProvider } from './hooks/eventAktif';
import { sesiDiakhiriPengguna, useMe, useOrganisasiPublik } from './hooks/queries';
import { AppShell } from './layout/AppShell';
import { AdministrasiPage } from './pages/AdministrasiPage';
import { BerandaPage } from './pages/BerandaPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventListPage } from './pages/EventListPage';
import { EventNewPage } from './pages/EventNewPage';
import { KeuanganPage } from './pages/KeuanganPage';
import { LaporanPage } from './pages/LaporanPage';
import { LoginPage } from './pages/LoginPage';
import { PengaturanPage } from './pages/PengaturanPage';

/** Sesi selalu diverifikasi server (`/api/auth/me`), tidak pernah dari penyimpanan lokal. */
function WajibMasuk({ children }: { children: ReactNode }) {
  const me = useMe();
  const { pathname, search } = useLocation();
  if (me.isPending) return <Memuat className="min-h-screen" />;
  if (me.isError) return <GagalMemuat error={me.error} onRetry={() => void me.refetch()} className="m-6" />;
  if (!me.data) return <Navigate to="/login" replace state={sesiDiakhiriPengguna() ? null : { dari: pathname + search }} />;
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
