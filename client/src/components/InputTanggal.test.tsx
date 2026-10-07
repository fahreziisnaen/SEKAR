import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InputTanggal } from './InputTanggal';
import { Modal } from './Modal';

function Uji({ awal = '2025-04-12', onChange = () => {} }: { awal?: string; onChange?: (v: string) => void }) {
  const [v, setV] = useState(awal);
  return (
    <InputTanggal
      aria-label="Tanggal"
      value={v}
      onChange={(x) => {
        setV(x);
        onChange(x);
      }}
      bolehKosong
    />
  );
}

describe('InputTanggal', () => {
  it('memilih tanggal lewat kalender, termasuk pindah bulan', async () => {
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<Uji onChange={onChange} />);
    const pemicu = screen.getByRole('button', { name: 'Tanggal: 12 April 2025' });
    await u.click(pemicu);
    const kalender = screen.getByRole('dialog', { name: 'Pilih tanggal' });
    expect(within(kalender).getByText('April 2025')).toBeInTheDocument();
    expect(within(kalender).getByRole('button', { name: 'Sabtu, 12 April 2025' })).toHaveAttribute('aria-pressed', 'true');
    // Minggu pertama dimulai hari Senin: 31 Maret 2025 tampil sebelum 1 April.
    expect(within(kalender).getByRole('button', { name: 'Senin, 31 Maret 2025' })).toBeInTheDocument();

    await u.click(within(kalender).getByRole('button', { name: 'Bulan berikutnya' }));
    expect(within(kalender).getByText('Mei 2025')).toBeInTheDocument();
    await u.click(within(kalender).getByRole('button', { name: 'Kamis, 15 Mei 2025' }));
    expect(onChange).toHaveBeenLastCalledWith('2025-05-15');
    expect(screen.queryByRole('dialog', { name: 'Pilih tanggal' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tanggal: 15 Mei 2025' })).toBeInTheDocument();
  });

  it('bisa dipakai dengan keyboard dan dikosongkan bila opsional', async () => {
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<Uji onChange={onChange} />);
    await u.click(screen.getByRole('button', { name: /^Tanggal:/ }));
    expect(screen.getByRole('button', { name: 'Sabtu, 12 April 2025' })).toHaveFocus();
    await u.keyboard('{ArrowRight}{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Minggu, 20 April 2025' })).toHaveFocus();
    await u.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: 'Selasa, 20 Mei 2025' })).toHaveFocus();
    await u.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('2025-05-20');

    await u.click(screen.getByRole('button', { name: /^Tanggal:/ }));
    await u.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('button', { name: 'Tanggal: belum dipilih' })).toBeInTheDocument();
  });

  it('Escape menutup kalender saja, bukan modal yang membungkusnya', async () => {
    const tutupModal = vi.fn();
    const u = userEvent.setup();
    render(
      <Modal onClose={tutupModal}>
        {(id) => (
          <div>
            <h2 id={id}>Formulir</h2>
            <Uji />
          </div>
        )}
      </Modal>,
    );
    await u.click(screen.getByRole('button', { name: /^Tanggal:/ }));
    expect(screen.getByRole('dialog', { name: 'Pilih tanggal' })).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Pilih tanggal' })).not.toBeInTheDocument();
    expect(tutupModal).not.toHaveBeenCalled();
    await u.keyboard('{Escape}');
    expect(tutupModal).toHaveBeenCalledTimes(1);
  });
});
