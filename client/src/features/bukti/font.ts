import display800 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff?url';
import sans400 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff?url';
import sans500 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff?url';
import sans600 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff?url';
import sans700 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff?url';
import type { Font, KeluargaFont, Ukur } from './tataLetak';

/**
 * Berkas font statis yang SAMA dipakai pratinjau (SVG), PNG (Canvas), dan PDF (ditanam lewat
 * pdf-lib), sehingga lebar teks & pemotongan baris identik di semua keluaran.
 */
export const BERKAS_FONT: Record<KeluargaFont, Partial<Record<Font['berat'], string>>> = {
  sans: { 400: sans400, 500: sans500, 600: sans600, 700: sans700 },
  display: { 800: display800 },
};

export const KELUARGA: Record<KeluargaFont, string> = { sans: 'SekarBuktiSans', display: 'SekarBuktiDisplay' };

export function urlFont(font: Pick<Font, 'keluarga' | 'berat'>): string {
  const url = BERKAS_FONT[font.keluarga][font.berat];
  if (!url) throw new Error(`Font ${font.keluarga} ${font.berat} tidak tersedia untuk bukti.`);
  return url;
}

let siap: Promise<void> | null = null;

/** Mendaftarkan & memuat semua font bukti di dokumen (sekali). */
export function siapkanFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return Promise.resolve();
  siap ??= Promise.all(
    (Object.keys(BERKAS_FONT) as KeluargaFont[]).flatMap((keluarga) =>
      Object.entries(BERKAS_FONT[keluarga]).map(async ([berat, url]) => {
        const face = new FontFace(KELUARGA[keluarga], `url(${url}) format('woff')`, { weight: berat });
        document.fonts.add(await face.load());
      }),
    ),
  ).then(() => undefined);
  return siap;
}

/** Perkiraan lebar bila Canvas tidak tersedia (mis. lingkungan tes). */
export const ukurPerkiraan: Ukur = (teks, font) => teks.length * font.ukuran * (font.keluarga === 'display' ? 0.6 : 0.55);

/** Pengukur lebar teks berbasis Canvas memakai font bukti yang sudah dimuat. */
export function ukurKanvas(): Ukur {
  const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (!ctx) return ukurPerkiraan;
  const cache = new Map<string, number>();
  return (teks, font) => {
    const kunci = `${font.keluarga}|${font.berat}|${teks}`;
    let per100 = cache.get(kunci);
    if (per100 === undefined) {
      ctx.font = `${font.berat} 100px "${KELUARGA[font.keluarga]}"`;
      per100 = ctx.measureText(teks).width;
      cache.set(kunci, per100);
    }
    return (per100 / 100) * font.ukuran;
  };
}
