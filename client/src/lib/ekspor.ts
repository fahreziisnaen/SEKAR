export type Sel = string | number;

/**
 * CSV dengan pemisah titik koma — Excel berlokal Indonesia memakai `;` sebagai
 * pemisah daftar, sehingga kolom terbaca benar saat file dibuka langsung.
 */
export function keCsv(baris: Sel[][]): string {
  const sel = (v: Sel) => {
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return baris.map((b) => b.map(sel).join(';')).join('\r\n');
}

export function unduhCsv(namaFile: string, baris: Sel[][]) {
  // BOM agar Excel membaca UTF-8 (tanda "–", "·", dll.) dengan benar.
  const blob = new Blob(['﻿' + keCsv(baris)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `Laporan Keuangan`, `Slekoors Annual Gathering` → `laporan-keuangan-slekoors-annual-gathering.csv` */
export function namaFileCsv(...bagian: string[]): string {
  return (
    bagian
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.csv'
  );
}
