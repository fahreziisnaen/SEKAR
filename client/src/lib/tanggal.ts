/** Tanggal hari ini (`YYYY-MM-DD`) menurut zona waktu aplikasi (dari server); default zona browser. */
export function hariIni(zonaWaktu?: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zonaWaktu, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function akhirBulan(tahun: number, bulan: number): number {
  return new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
}

const dua = (n: number) => String(n).padStart(2, '0');

export interface Periode {
  kunci: string;
  label: string;
  dari: string | null;
  sampai: string | null;
}

/** Pilihan periode laporan, dihitung relatif terhadap hari ini. */
export function daftarPeriode(hari: string): Periode[] {
  const [y, m] = hari.split('-').map(Number);
  const q = Math.floor((m - 1) / 3);
  const awalQ = q * 3 + 1;
  return [
    { kunci: 'semua', label: 'Sepanjang event', dari: null, sampai: null },
    { kunci: 'bulan-ini', label: 'Bulan ini', dari: `${y}-${dua(m)}-01`, sampai: `${y}-${dua(m)}-${dua(akhirBulan(y, m))}` },
    { kunci: 'kuartal-ini', label: `Kuartal ${q + 1} ${y}`, dari: `${y}-${dua(awalQ)}-01`, sampai: `${y}-${dua(awalQ + 2)}-${dua(akhirBulan(y, awalQ + 2))}` },
    { kunci: 'tahun-ini', label: `Tahun ${y}`, dari: `${y}-01-01`, sampai: `${y}-12-31` },
    { kunci: 'tahun-lalu', label: `Tahun ${y - 1}`, dari: `${y - 1}-01-01`, sampai: `${y - 1}-12-31` },
  ];
}

/** Query string `?dari=…&sampai=…` untuk sebuah periode (kosong bila tanpa batas). */
export function queryPeriode(p: Pick<Periode, 'dari' | 'sampai'>, extra: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams();
  if (p.dari) q.set('dari', p.dari);
  if (p.sampai) q.set('sampai', p.sampai);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}
