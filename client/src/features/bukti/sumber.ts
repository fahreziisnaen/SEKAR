/**
 * Gambar privat (tanda tangan) dimuat sekali lewat sesi sebagai Blob, lalu dirujuk lewat
 * `blob:` URL oleh SVG & Canvas. Renderer PDF membaca bytes dari registri ini — `fetch()`
 * ke URL `blob:` diblokir Content-Security-Policy (connect-src 'self').
 */
const registri = new Map<string, Blob>();

export function daftarkanBlob(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  registri.set(url, blob);
  return url;
}

export function lepasBlob(url: string): void {
  registri.delete(url);
  URL.revokeObjectURL(url);
}

export function blobTerdaftar(url: string): Blob | undefined {
  return registri.get(url);
}
