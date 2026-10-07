import { useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Modal, TombolTutup } from '../../components/Modal';
import { useOverlays } from '../../components/Overlays';
import { PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button, Field, Input, MoneyInput, Select, TextArea, cx } from '../../components/ui';
import { useEvents, useHariIni, useMaster, useTambahTransaksi } from '../../hooks/queries';
import { errorMessage } from '../../lib/api';
import { rupiah } from '../../lib/format';
import type { JenisTransaksi } from '../../types';

export function TransaksiModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const toast = useToast();
  const hari = useHariIni();
  const master = useMaster();
  const events = useEvents();
  const simpan = useTambahTransaksi();
  const { lihatBukti } = useOverlays();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    ev: eventId,
    tgl: hari,
    jenis: 'masuk' as JenisTransaksi,
    kategoriId: 0,
    ket: '',
    nom: '',
    metodeId: 0,
    catatan: '',
    pihak: '',
    pihakKeterangan: '',
    bank: '',
    nomorRekening: '',
    nomorReferensi: '',
  });
  const [bukti, setBukti] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const ubah = (patch: Partial<typeof f>) => {
    setF((s) => ({ ...s, ...patch }));
    setErr('');
  };
  const isIn = f.jenis === 'masuk';
  const kategori = (master.data?.kategori ?? []).filter((k) => k.jenis === f.jenis);
  const metode = master.data?.metode ?? [];
  // Pilihan pertama dipakai sampai pengguna memilih sendiri.
  const kategoriId = f.kategoriId || kategori[0]?.id || 0;
  const metodeId = f.metodeId || metode[0]?.id || 0;

  const kirim = () => {
    const nom = Number(f.nom);
    if (!f.ev || !f.tgl) return setErr('Event dan tanggal wajib diisi.');
    if (!kategoriId || !metodeId) return setErr('Kategori dan metode pembayaran belum tersedia. Tambahkan di menu Pengaturan.');
    if (isIn && !f.pihak.trim()) return setErr('Pemberi dana (Diterima dari) wajib diisi untuk pemasukan.');
    if (!f.ket.trim() || !nom) return setErr('Deskripsi dan nominal wajib diisi.');
    simpan.mutate(
      {
        eventId: f.ev,
        tanggal: f.tgl,
        keterangan: f.ket.trim(),
        kategoriId,
        nominal: nom,
        metodeId,
        catatan: f.catatan.trim(),
        pihak: f.pihak.trim(),
        pihakKeterangan: f.pihakKeterangan.trim(),
        bank: f.bank.trim(),
        nomorRekening: f.nomorRekening.trim(),
        nomorReferensi: f.nomorReferensi.trim(),
        bukti,
      },
      {
        onSuccess: (tx) => {
          if (tx.jenis === 'masuk') toast('Pemasukan berhasil dicatat.', { label: 'Lihat Bukti Penerimaan', onClick: () => lihatBukti(tx) });
          else toast(`Pengeluaran ${rupiah(nom)} tercatat`);
          onClose();
        },
        onError: (e) => setErr(errorMessage(e)),
      },
    );
  };

  const tombolJenis = (j: JenisTransaksi) => {
    const aktif = f.jenis === j;
    const masuk = j === 'masuk';
    return (
      <button
        type="button"
        aria-pressed={aktif}
        onClick={() => ubah({ jenis: j, kategoriId: 0 })}
        className={cx(
          'flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 p-[13px] text-sm font-bold',
          aktif ? (masuk ? 'border-success bg-success-bg text-success-ink' : 'border-danger bg-danger-bg text-danger-ink') : 'border-line-ctl bg-white text-ink-body',
        )}
      >
        <Icon name={masuk ? 'up' : 'down'} size={16} strokeWidth={2.4} />
        {masuk ? 'Pemasukan' : 'Pengeluaran'}
      </button>
    );
  };

  return (
    <Modal onClose={onClose} align="top" className="max-w-[640px] rounded-3xl shadow-modal">
      {(titleId) => (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-[26px] py-[22px]">
            <div>
              <div id={titleId} className="font-display text-[22px] font-bold text-navy">
                Tambah Transaksi
              </div>
              <div className="mt-0.5 text-[13px] text-ink-muted">Setiap transaksi terhubung ke satu event</div>
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <div className="flex flex-col gap-4 px-[26px] py-6">
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Jenis transaksi">
              {tombolJenis('masuk')}
              {tombolJenis('keluar')}
            </div>
            <Field label="Nominal *">
              <MoneyInput besar value={f.nom} onChange={(nom) => ubah({ nom })} aria-label="Nominal" />
            </Field>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
              <Field label={isIn ? 'Diterima dari *' : 'Dibayarkan kepada'}>
                <Input
                  value={f.pihak}
                  maxLength={160}
                  onChange={(e) => ubah({ pihak: e.target.value })}
                  placeholder={isIn ? 'Contoh: PT. Maju Bersama Sejahtera' : 'Contoh: Kembang Dekorasi'}
                  className="py-[11px]"
                />
              </Field>
              <Field label={isIn ? 'Keterangan pemberi' : 'Keterangan penerima'}>
                <Input
                  value={f.pihakKeterangan}
                  maxLength={120}
                  onChange={(e) => ubah({ pihakKeterangan: e.target.value })}
                  placeholder={isIn ? 'Contoh: Sponsor Event' : 'Contoh: Vendor dekorasi'}
                  className="py-[11px]"
                />
              </Field>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
              <Field label="Event">
                <Select value={f.ev} onChange={(e) => ubah({ ev: Number(e.target.value) })} className="px-3">
                  {(events.data ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nama}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal">
                <Input type="date" value={f.tgl} onChange={(e) => ubah({ tgl: e.target.value })} className="px-3 py-2.5" />
              </Field>
              <Field label="Kategori">
                <Select value={kategoriId} onChange={(e) => ubah({ kategoriId: Number(e.target.value) })} className="px-3">
                  {kategori.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Metode Pembayaran">
                <Select value={metodeId} onChange={(e) => ubah({ metodeId: Number(e.target.value) })} className="px-3">
                  {metode.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
              <Field label="Bank">
                <Input value={f.bank} maxLength={80} onChange={(e) => ubah({ bank: e.target.value })} placeholder="Opsional" className="py-[11px]" />
              </Field>
              <Field label="Nomor rekening">
                <Input value={f.nomorRekening} maxLength={40} inputMode="numeric" onChange={(e) => ubah({ nomorRekening: e.target.value })} placeholder="Opsional" className="py-[11px]" />
              </Field>
              <Field label="Nomor referensi">
                <Input value={f.nomorReferensi} maxLength={80} onChange={(e) => ubah({ nomorReferensi: e.target.value })} placeholder="Opsional" className="py-[11px]" />
              </Field>
            </div>
            <Field label="Deskripsi *">
              <Input value={f.ket} maxLength={200} onChange={(e) => ubah({ ket: e.target.value })} placeholder="Contoh: Pelunasan dekorasi panggung" className="py-[11px]" />
            </Field>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                setBukti(e.target.files?.[0] ?? null);
                setErr('');
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed border-line-dash bg-surface-muted px-4 py-3.5 text-left hover:border-primary"
            >
              <Icon name="upload" size={22} strokeWidth={1.8} stroke="#2F6FED" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-navy">Bukti Transaksi</span>
                {bukti ? (
                  <span className="text-xs font-semibold text-success-ink">✓ {bukti.name}</span>
                ) : (
                  <span className="text-xs text-ink-muted">Unggah foto nota atau bukti transfer (JPG, PNG, PDF)</span>
                )}
              </span>
            </button>
            <Field label="Catatan">
              <TextArea rows={2} maxLength={500} value={f.catatan} onChange={(e) => ubah({ catatan: e.target.value })} placeholder="Opsional" className="py-[11px]" />
            </Field>
            <PesanGalat>{err}</PesanGalat>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line-soft px-[26px] py-[18px]">
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button onClick={kirim} disabled={simpan.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              {simpan.isPending ? 'Menyimpan…' : isIn ? 'Simpan Pemasukan' : 'Simpan Pengeluaran'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
