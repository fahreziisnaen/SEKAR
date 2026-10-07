import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, TombolTutup } from '../../components/Modal';
import { Memuat, PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui';
import { pathTandaTangan, useEventDetail, useOrganisasi, useOrganisasiPublik, usePengguna } from '../../hooks/queries';
import { ambilBlob } from '../../lib/api';
import type { Transaksi } from '../../types';
import { dataBukti, kekuranganBukti, type TandaTanganTermuat } from './data';
import { siapkanFont, ukurKanvas } from './font';
import { daftarkanBlob, lepasBlob } from './sumber';
import { SvgBukti } from './SvgBukti';
import { tataLetakBukti } from './tataLetak';

function unduhBlob(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Hanya halaman bukti yang dicetak (lihat `.sekar-cetak-bukti` di index.css). */
function cetak() {
  document.body.classList.add('cetak-bukti');
  const selesai = () => {
    document.body.classList.remove('cetak-bukti');
    window.removeEventListener('afterprint', selesai);
  };
  window.addEventListener('afterprint', selesai);
  window.print();
}

export function BuktiPenerimaanModal({ tx, onClose }: { tx: Transaksi; onClose: () => void }) {
  const event = useEventDetail(tx.eventId);
  const org = useOrganisasi();
  const orgPublik = useOrganisasiPublik();
  const pengguna = usePengguna();
  const toast = useToast();
  const [ttd, setTtd] = useState<TandaTanganTermuat | null>(null);
  const [fontSiap, setFontSiap] = useState(false);
  const [proses, setProses] = useState<'png' | 'pdf' | null>(null);
  const kurang = kekuranganBukti(tx);

  useEffect(() => {
    let aktif = true;
    siapkanFont()
      .catch(() => undefined)
      .finally(() => aktif && setFontSiap(true));
    return () => {
      aktif = false;
    };
  }, []);

  // Tanda tangan pencatat & PIC. Versi diambil dari daftar pengguna (paling baru), lalu gambarnya
  // dimuat lewat sesi; yang gagal/kosong cukup tampil sebagai garis tanda tangan.
  const picId = event.data?.pic.id;
  const versi = (id: number, cadangan: string | null) => pengguna.data?.find((p) => p.id === id)?.tandaTangan ?? cadangan;
  const versiPencatat = versi(tx.dibuatOleh.id, tx.dibuatOleh.tandaTangan);
  const versiPic = picId ? versi(picId, event.data!.pic.tandaTangan) : null;
  const daftarSiap = !pengguna.isPending;
  useEffect(() => {
    if (!picId || !daftarSiap) return;
    let aktif = true;
    const url: string[] = [];
    const sasaran = new Map<number, string | null>([
      [tx.dibuatOleh.id, versiPencatat],
      [picId, versiPic],
    ]);
    void Promise.all(
      [...sasaran].map(async ([id, v]) => {
        const path = pathTandaTangan(id, v);
        if (!path) return [id, null] as const;
        try {
          const u = daftarkanBlob(await ambilBlob(path));
          url.push(u);
          return [id, u] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((hasil) => {
      const termuat: TandaTanganTermuat = {};
      for (const [id, u] of hasil) if (u) termuat[id] = u;
      if (aktif) setTtd(termuat);
    });
    return () => {
      aktif = false;
      url.forEach(lepasBlob);
    };
  }, [tx.dibuatOleh.id, versiPencatat, picId, versiPic, daftarSiap]);

  const data = useMemo(() => {
    if (!event.data || orgPublik.isPending || org.isPending || kurang.length || !ttd) return null;
    return dataBukti(tx, event.data, { ...(orgPublik.data ?? { nama: null, logoUrl: null }), kota: org.data?.kota ?? null }, ttd);
  }, [tx, event.data, org.data, org.isPending, orgPublik.data, orgPublik.isPending, kurang.length, ttd]);
  // Pengukuran teks butuh font yang sudah dimuat agar pemotongan baris sama dengan PNG/PDF.
  const halaman = useMemo(() => (data && fontSiap ? tataLetakBukti(data, ukurKanvas()) : null), [data, fontSiap]);
  const namaBerkas = `Bukti-Penerimaan-${tx.nomorBukti ?? tx.id}`;
  const judul = `Bukti Penerimaan Dana ${tx.nomorBukti ?? ''}`.trim();

  const unduh = async (jenis: 'png' | 'pdf') => {
    if (!halaman) return;
    setProses(jenis);
    try {
      if (jenis === 'png') {
        const { buatPng } = await import('./kanvas');
        unduhBlob(await buatPng(halaman), `${namaBerkas}.png`);
      } else {
        const { buatPdf } = await import('./pdf');
        unduhBlob(await buatPdf(halaman, { judul, penulis: data?.organizationName ?? null }), `${namaBerkas}.pdf`);
      }
      toast(`Bukti diunduh (${jenis.toUpperCase()})`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Bukti gagal dibuat.');
    } finally {
      setProses(null);
    }
  };

  return (
    // Di atas panel Detail Transaksi (z-51) karena bisa dibuka dari sana; di bawah toast (z-60).
    <Modal onClose={onClose} align="top" lapisan="z-55" className="max-w-[1080px] rounded-3xl shadow-modal">
      {(titleId) => (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line-soft px-[26px] py-[18px]">
            <div className="min-w-0">
              <div id={titleId} className="font-display text-[22px] font-bold text-navy">
                Bukti Penerimaan Dana
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-ink-muted">{tx.nomorBukti ?? 'Belum bernomor'} · A4 landscape</div>
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <div className="bg-canvas px-4 py-5 sm:px-[26px]">
            {kurang.length > 0 ? (
              <PesanGalat>
                Bukti penerimaan belum dapat dibuat. Lengkapi: {kurang.join(', ')}.
              </PesanGalat>
            ) : event.isError ? (
              <PesanGalat>Data event tidak dapat dimuat.</PesanGalat>
            ) : halaman ? (
              <SvgBukti halaman={halaman} judul={judul} className="block h-auto w-full rounded-lg bg-white shadow-[0_18px_40px_-24px_rgba(18,38,74,.45)]" />
            ) : (
              <Memuat label="Menyiapkan bukti…" />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line-soft px-[26px] py-[18px]">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Tutup
            </Button>
            <Button variant="secondary" disabled={!halaman} onClick={cetak} className="px-[18px] py-[11px] text-sm disabled:opacity-50">
              Cetak Bukti
            </Button>
            <Button variant="secondary" disabled={!halaman || proses !== null} onClick={() => void unduh('png')} className="px-[18px] py-[11px] text-sm disabled:opacity-50">
              {proses === 'png' ? 'Membuat PNG…' : 'Unduh PNG'}
            </Button>
            <Button disabled={!halaman || proses !== null} onClick={() => void unduh('pdf')} className="px-5 py-[11px] text-sm disabled:opacity-50">
              {proses === 'pdf' ? 'Membuat PDF…' : 'Unduh PDF'}
            </Button>
          </div>
          {halaman &&
            createPortal(
              <div className="sekar-cetak-bukti" aria-hidden="true">
                <SvgBukti halaman={halaman} judul={judul} style={{ width: '297mm', height: '210mm', display: 'block' }} />
              </div>,
              document.body,
            )}
        </div>
      )}
    </Modal>
  );
}
