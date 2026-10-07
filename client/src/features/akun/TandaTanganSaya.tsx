import { useEffect, useRef, useState } from 'react';
import { labelUnggah, ProgresUnggah } from '../../components/ProgresUnggah';
import { Konfirmasi } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui';
import { pathTandaTangan, useHapusTandaTangan, useMe, useUnggahTandaTangan } from '../../hooks/queries';
import { ambilBlob, errorMessage } from '../../lib/api';

const MAKS_BYTES = 2 * 1024 * 1024;
const LATAR_PETAK = 'repeating-conic-gradient(#F1F4F9 0 25%, #FFFFFF 0 50%) 0 0 / 16px 16px';

/** Tanda tangan milik pengguna yang login; otomatis dipakai di Bukti Penerimaan Dana. */
export function TandaTanganSaya() {
  const me = useMe().data;
  const unggah = useUnggahTandaTangan();
  const hapus = useHapusTandaTangan();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [gagalMuat, setGagalMuat] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const path = me ? pathTandaTangan(me.id, me.tandaTangan) : null;

  useEffect(() => {
    setGagalMuat(false);
    if (!path) {
      setPratinjau(null);
      return;
    }
    let url: string | null = null;
    let aktif = true;
    ambilBlob(path)
      .then((blob) => {
        if (!aktif) return;
        url = URL.createObjectURL(blob);
        setPratinjau(url);
      })
      .catch(() => {
        if (!aktif) return;
        setPratinjau(null);
        setGagalMuat(true);
      });
    return () => {
      aktif = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  const pilih = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (file.size > MAKS_BYTES) return toast('Ukuran gambar tanda tangan maksimal 2 MB.');
    unggah.mutate(file, {
      onSuccess: () => toast(me?.tandaTangan ? 'Tanda tangan diperbarui' : 'Tanda tangan disimpan'),
      onError: (e) => toast(errorMessage(e)),
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-[13px] font-bold text-navy">Tanda tangan</div>
      <div className="flex flex-wrap items-center gap-[18px]">
        <div
          className="flex h-[96px] w-[240px] max-w-full items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-line-dash"
          style={{ background: pratinjau ? LATAR_PETAK : '#F8FAFC' }}
        >
          {pratinjau ? (
            <img src={pratinjau} alt={`Tanda tangan ${me?.nama ?? ''}`} className="max-h-[80px] max-w-[220px] object-contain mix-blend-multiply" />
          ) : (
            <span className="px-4 text-center text-xs text-ink-muted">{!path ? 'Belum ada tanda tangan' : gagalMuat ? 'Gambar tidak dapat dimuat. Unggah ulang.' : 'Memuat…'}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pilih(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={unggah.isPending} className="px-3.5 py-2 text-[13px] disabled:opacity-60">
              {labelUnggah(unggah.progres, me?.tandaTangan ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan')}
            </Button>
            {me?.tandaTangan && (
              <Button variant="secondary" onClick={() => setKonfirmasi(true)} className="px-3.5 py-2 text-[13px]">
                Hapus
              </Button>
            )}
          </div>
          <ProgresUnggah progres={unggah.progres} nama="tanda tangan" className="max-w-[340px]" />
          <span className="max-w-[340px] text-xs leading-normal text-ink-muted">
            PNG transparan disarankan; JPG/WEBP berlatar putih juga bisa (latar putih otomatis menyatu). Maks. 2 MB. Dipakai otomatis pada Bukti Penerimaan
            Dana yang Anda catat atau event yang Anda pimpin sebagai PIC.
          </span>
        </div>
      </div>
      {konfirmasi && (
        <Konfirmasi
          judul="Hapus tanda tangan?"
          pesan="Bukti penerimaan berikutnya akan menampilkan garis tanda tangan kosong sampai Anda mengunggah lagi."
          label="Hapus"
          memproses={hapus.isPending}
          galat={hapus.error}
          onBatal={() => setKonfirmasi(false)}
          onKonfirmasi={() =>
            hapus.mutate(undefined, {
              onSuccess: () => {
                setKonfirmasi(false);
                toast('Tanda tangan dihapus');
              },
            })
          }
        />
      )}
    </div>
  );
}
