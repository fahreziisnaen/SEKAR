const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const SKALA = ['', 'ribu', 'juta', 'miliar', 'triliun'];

/** 0–999 → kata (huruf kecil). */
function ratusan(n: number): string {
  const kata: string[] = [];
  const r = Math.floor(n / 100);
  const sisa = n % 100;
  if (r === 1) kata.push('seratus');
  else if (r > 1) kata.push(SATUAN[r], 'ratus');
  if (sisa < 12) {
    if (sisa) kata.push(SATUAN[sisa]);
  } else if (sisa < 20) {
    kata.push(SATUAN[sisa - 10], 'belas');
  } else {
    kata.push(SATUAN[Math.floor(sisa / 10)], 'puluh');
    if (sisa % 10) kata.push(SATUAN[sisa % 10]);
  }
  return kata.join(' ');
}

/**
 * Bilangan bulat rupiah → kata Bahasa Indonesia, mis. `1500000` → `Satu Juta Lima Ratus Ribu Rupiah`.
 * Mendukung hingga 999 triliun; "seribu" dipakai untuk tepat 1.000 pada kelompok ribuan.
 */
export function terbilang(nilai: number): string {
  if (!Number.isFinite(nilai) || !Number.isInteger(nilai) || nilai < 0) throw new RangeError('Terbilang hanya untuk bilangan bulat ≥ 0.');
  if (nilai >= 1e15) throw new RangeError('Nilai terlalu besar untuk terbilang.');
  if (nilai === 0) return 'Nol Rupiah';
  const kelompok: number[] = [];
  for (let n = nilai; n > 0; n = Math.floor(n / 1000)) kelompok.push(n % 1000);
  const kata: string[] = [];
  for (let i = kelompok.length - 1; i >= 0; i--) {
    const k = kelompok[i];
    if (!k) continue;
    if (i === 1 && k === 1) kata.push('seribu');
    else kata.push(ratusan(k), SKALA[i]);
  }
  const kalimat = kata.filter(Boolean).join(' ') + ' rupiah';
  return kalimat.replace(/\b\w/g, (c) => c.toUpperCase());
}
