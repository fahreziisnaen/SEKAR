import { useRef, useState } from 'react';
import { Modal, TombolTutup } from '../../components/Modal';
import { PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button, Field, Input, Select, cx } from '../../components/ui';
import { labelUnggah, ProgresUnggah } from '../../components/ProgresUnggah';
import { useCekUkuranBerkas, useMaster, useUnggahDokumen } from '../../hooks/queries';
import { errorMessage } from '../../lib/api';

/** `Surat_Undangan.final.pdf` → [`Surat_Undangan.final`, `pdf`] */
export function pecahNamaFile(nama: string): [string, string] {
  const i = nama.lastIndexOf('.');
  return i > 0 ? [nama.slice(0, i), nama.slice(i + 1).toLowerCase()] : [nama, ''];
}

/** Nama dokumen bawaan dari nama berkas: `Surat_Undangan-Mitra.pdf` → `Surat Undangan Mitra`. */
export function namaDariFile(nama: string): string {
  return pecahNamaFile(nama)[0].replace(/[_-]+/g, ' ').trim();
}

export const TERIMA_DOKUMEN = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp';

export function UnggahModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const toast = useToast();
  const master = useMaster();
  const unggah = useUnggahDokumen();
  const cekUkuran = useCekUkuranBerkas();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nama, setNama] = useState('');
  const [jenisId, setJenisId] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [seret, setSeret] = useState(false);
  const [err, setErr] = useState('');
  const jenis = master.data?.jenisDokumen ?? [];
  const jenisTerpilih = jenisId || jenis[0]?.id || 0;

  const pilih = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    if (!nama) setNama(namaDariFile(f.name));
    setErr('');
  };

  const simpan = () => {
    if (!file) return setErr('Pilih berkas yang akan diunggah.');
    const terlaluBesar = cekUkuran(file);
    if (terlaluBesar) return setErr(terlaluBesar);
    if (!nama.trim()) return setErr('Isi nama dokumen terlebih dahulu.');
    if (!jenisTerpilih) return setErr('Jenis dokumen belum tersedia. Tambahkan di menu Pengaturan.');
    unggah.mutate(
      { eventId, nama: nama.trim(), jenisId: jenisTerpilih, file },
      {
        onSuccess: () => {
          toast('Dokumen berhasil diunggah');
          onClose();
        },
        onError: (e) => setErr(errorMessage(e)),
      },
    );
  };

  return (
    <Modal onClose={onClose} className="max-w-[480px] rounded-3xl p-[26px]">
      {(titleId) => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              Upload Dokumen
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <input ref={fileRef} type="file" accept={TERIMA_DOKUMEN} className="hidden" onChange={(e) => pilih(e.target.files?.[0])} />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setSeret(true);
            }}
            onDragLeave={() => setSeret(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSeret(false);
              pilih(e.dataTransfer.files[0]);
            }}
            className={cx('rounded-2xl border-2 border-dashed bg-surface-muted p-[26px] text-center text-[13px] text-ink-muted', seret ? 'border-primary' : 'border-line-dash')}
          >
            {file ? <span className="font-semibold text-success-ink">✓ {file.name}</span> : 'Tarik file ke sini atau '}
            <button type="button" onClick={() => fileRef.current?.click()} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-primary">
              {file ? ' · ganti' : 'pilih file'}
            </button>
            <br />
            PDF, DOCX, XLSX, JPG, PNG
          </div>
          <Field label="Nama dokumen">
            <Input
              value={nama}
              maxLength={160}
              onChange={(e) => {
                setNama(e.target.value);
                setErr('');
              }}
              placeholder="Contoh: Surat Undangan Mitra"
              className="py-[11px]"
            />
          </Field>
          <Field label="Jenis">
            <Select value={jenisTerpilih} onChange={(e) => setJenisId(Number(e.target.value))} className="px-3">
              {jenis.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </Select>
          </Field>
          <ProgresUnggah progres={unggah.progres} nama={file?.name} />
          <PesanGalat>{err}</PesanGalat>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} disabled={unggah.isPending} className="px-[18px] py-[11px] text-sm disabled:opacity-50">
              Batal
            </Button>
            <Button onClick={simpan} disabled={unggah.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              {labelUnggah(unggah.progres, 'Unggah')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
