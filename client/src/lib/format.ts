const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function pecah(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** `2025-04-12` → `12 Apr 2025` */
export function formatTanggal(iso: string): string {
  if (!iso) return '-';
  const [y, m, d] = pecah(iso);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** `2025-04-12` → `12 April 2025` */
export function formatTanggalPanjang(iso: string): string {
  if (!iso) return '-';
  const [y, m, d] = pecah(iso);
  return `${d} ${BULAN_PANJANG[m - 1]} ${y}`;
}

/** `2025-04-12` → `Sabtu, 12 April 2025` */
export function formatHariTanggal(iso: string): string {
  const [y, m, d] = pecah(iso);
  const hari = HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${hari}, ${formatTanggalPanjang(iso)}`;
}

/** Pemisah ribuan gaya Indonesia tanpa bergantung pada data ICU lingkungan. */
export function angka(n: number): string {
  return Math.abs(Math.round(n || 0))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `8600000` → `Rp 8.600.000`, `-5000` → `- Rp 5.000` */
export function rupiah(n: number): string {
  return (n < 0 ? '- ' : '') + 'Rp ' + angka(n);
}

/** Rupiah bertanda untuk kolom untung/rugi: `+ Rp 1.000` / `− Rp 1.000`. */
export function rupiahBertanda(n: number): string {
  return (n < 0 ? '− ' : '+ ') + rupiah(Math.abs(n));
}

/** Inisial dua huruf; kata `abaikan` (mis. nama organisasi) dilewati agar nama event tetap khas. */
export function inisial(nama: string, abaikan?: string | null): string {
  const lewati = abaikan?.trim().toLowerCase();
  return nama
    .split(' ')
    .filter((w) => w && w.toLowerCase() !== lewati)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Persentase bulat; 0 bila penyebut kosong. */
export function persen(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}

/** Ambil hanya digit dari input nominal. */
export function hanyaDigit(v: string): string {
  return v.replace(/\D/g, '');
}

/** Nama event tanpa awalan nama organisasi: `Slekoors Charity Run` → `Charity Run`. */
export function tanpaAwalan(nama: string, awalan?: string | null): string {
  if (!awalan) return nama;
  const sisa = nama.slice(awalan.length).trim();
  return nama.toLowerCase().startsWith(awalan.toLowerCase() + ' ') && sisa ? sisa : nama;
}
