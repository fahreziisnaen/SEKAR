import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Modal, TombolTutup } from '../../components/Modal';
import { Konfirmasi, PesanGalat } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { Button, Field, Input, MoneyInput, Select, TextArea, cx } from '../../components/ui';
import { useHapusEvent, useIzin, usePengguna, useUbahEvent } from '../../hooks/queries';
import { errorMessage, fieldErrors } from '../../lib/api';
import { LABEL_STATUS_EVENT, STATUS_EVENT, TAHAP } from '../../lib/label';
import type { EventDetail, Pengguna, StatusEvent } from '../../types';

/** Pilihan anggota tim berbentuk chip; dipakai juga di wizard Buat Event. */
export function PilihTim({ pengguna, terpilih, onChange }: { pengguna: Pengguna[]; terpilih: number[]; onChange: (ids: number[]) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3" role="group" aria-label="Tim event">
      {pengguna.map((p) => {
        const sel = terpilih.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(sel ? terpilih.filter((x) => x !== p.id) : [...terpilih, p.id])}
            className={cx('flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] p-3 text-left', sel ? 'border-primary bg-primary-bg' : 'border-line-ctl bg-white')}
          >
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-navy text-xs font-bold text-accent" aria-hidden="true">
              {p.nama
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold text-navy">{p.nama}</span>
              <span className="truncate text-xs text-ink-muted">{p.jabatan ?? '—'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EventFormModal({ event: e, onClose }: { event: EventDetail; onClose: () => void }) {
  const ubah = useUbahEvent(e.id);
  const hapus = useHapusEvent();
  const pengguna = usePengguna();
  const boleh = useIzin();
  const toast = useToast();
  const navigate = useNavigate();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [f, setF] = useState({
    nama: e.nama,
    tanggal: e.tanggal,
    waktu: e.waktu ?? '',
    lokasi: e.lokasi,
    venue: e.venue ?? '',
    deskripsi: e.deskripsi ?? '',
    picId: e.pic.id,
    anggotaIds: e.anggota.map((a) => a.id),
    status: e.status,
    tahap: e.tahap,
    budget: String(e.budget || ''),
    targetPemasukan: String(e.targetPemasukan || ''),
    estimasiPengeluaran: String(e.estimasiPengeluaran || ''),
  });
  const aktif = (pengguna.data ?? []).filter((p) => p.aktif || p.id === f.picId || f.anggotaIds.includes(p.id));
  const galat = fieldErrors(ubah.error);

  const kirim = (ev: FormEvent) => {
    ev.preventDefault();
    ubah.mutate(
      {
        ...f,
        budget: Number(f.budget || 0),
        targetPemasukan: Number(f.targetPemasukan || 0),
        estimasiPengeluaran: Number(f.estimasiPengeluaran || 0),
      },
      {
        onSuccess: () => {
          toast('Perubahan event disimpan');
          onClose();
        },
      },
    );
  };

  return (
    <Modal onClose={onClose} align="top" className="max-w-[760px] rounded-3xl shadow-modal">
      {(titleId) => (
        <form onSubmit={kirim} noValidate className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-[26px] py-[22px]">
            <div id={titleId} className="font-display text-[22px] font-bold text-navy">
              Ubah Event
            </div>
            <TombolTutup onClick={onClose} />
          </div>
          <div className="flex flex-col gap-[18px] px-[26px] py-6">
            <Field label="Nama Event *">
              <Input value={f.nama} maxLength={160} onChange={(x) => setF({ ...f, nama: x.target.value })} />
            </Field>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              <Field label="Tanggal *">
                <Input type="date" value={f.tanggal} onChange={(x) => setF({ ...f, tanggal: x.target.value })} className="py-[11px]" />
              </Field>
              <Field label="Jam">
                <Input value={f.waktu} maxLength={60} onChange={(x) => setF({ ...f, waktu: x.target.value })} placeholder="08.00 – 17.00 WIB" />
              </Field>
              <Field label="Kota *">
                <Input value={f.lokasi} maxLength={120} onChange={(x) => setF({ ...f, lokasi: x.target.value })} />
              </Field>
              <Field label="Venue">
                <Input value={f.venue} maxLength={200} onChange={(x) => setF({ ...f, venue: x.target.value })} />
              </Field>
            </div>
            <Field label="Deskripsi">
              <TextArea rows={3} value={f.deskripsi} onChange={(x) => setF({ ...f, deskripsi: x.target.value })} />
            </Field>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              <Field label="Status">
                <Select value={f.status} onChange={(x) => setF({ ...f, status: x.target.value as StatusEvent })}>
                  {STATUS_EVENT.map((s) => (
                    <option key={s} value={s}>
                      {LABEL_STATUS_EVENT[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tahap timeline">
                <Select value={f.tahap} onChange={(x) => setF({ ...f, tahap: Number(x.target.value) })}>
                  {TAHAP.map((t, i) => (
                    <option key={t} value={i}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="PIC *">
                <Select value={f.picId} onChange={(x) => setF({ ...f, picId: Number(x.target.value) })}>
                  {aktif.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="text-[13px] font-semibold text-ink-label">Tim event</div>
            <PilihTim pengguna={aktif} terpilih={f.anggotaIds} onChange={(anggotaIds) => setF({ ...f, anggotaIds })} />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              <Field label="Budget">
                <MoneyInput value={f.budget} onChange={(budget) => setF({ ...f, budget })} />
              </Field>
              <Field label="Target pemasukan">
                <MoneyInput value={f.targetPemasukan} onChange={(targetPemasukan) => setF({ ...f, targetPemasukan })} />
              </Field>
              <Field label="Estimasi pengeluaran">
                <MoneyInput value={f.estimasiPengeluaran} onChange={(estimasiPengeluaran) => setF({ ...f, estimasiPengeluaran })} />
              </Field>
            </div>
            <PesanGalat>{ubah.error ? (galat.nama ?? galat.tanggal ?? galat.lokasi ?? errorMessage(ubah.error)) : ''}</PesanGalat>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 border-t border-line-soft px-[26px] py-[18px]">
            {boleh('hapusEvent') && (
              <Button variant="secondary" onClick={() => setKonfirmasi(true)} className="border-danger-dash px-4 py-[11px] text-sm text-danger-ink hover:border-danger">
                Hapus Event
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="secondary" onClick={onClose} className="px-[18px] py-[11px] text-sm">
              Batal
            </Button>
            <Button type="submit" disabled={ubah.isPending} className="px-5 py-[11px] text-sm disabled:opacity-60">
              {ubah.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
          {konfirmasi && (
            <Konfirmasi
              judul="Hapus event?"
              pesan={
                <>
                  Event <b>{e.nama}</b> beserta seluruh transaksi, dokumen, peserta, vendor, dan kebutuhannya akan dihapus permanen.
                </>
              }
              label="Hapus Event"
              memproses={hapus.isPending}
              galat={hapus.error}
              onBatal={() => setKonfirmasi(false)}
              onKonfirmasi={() =>
                hapus.mutate(e.id, {
                  onSuccess: () => {
                    toast(`Event “${e.nama}” dihapus`);
                    navigate('/event', { replace: true });
                  },
                })
              }
            />
          )}
        </form>
      )}
    </Modal>
  );
}
