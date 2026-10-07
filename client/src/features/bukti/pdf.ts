import fontkit from '@pdf-lib/fontkit';
import { BlendMode, LineCapStyle, PDFDocument, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import { urlFont } from './font';
import { blobTerdaftar } from './sumber';
import { TEMPLATE, type Font, type Halaman } from './tataLetak';

/** 1 mm dalam satuan PDF (point). */
const MM = 72 / 25.4;

function warna(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Path SVG persegi bersudut tumpul dalam mm (koordinat SVG: y ke bawah). */
function persegi(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.min(r, w / 2, h / 2);
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
}

async function ambil(url: string): Promise<ArrayBuffer> {
  const blob = blobTerdaftar(url);
  if (blob) return blob.arrayBuffer();
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Berkas ${url} gagal dimuat.`);
  return res.arrayBuffer();
}

/** PDF hanya menerima PNG/JPG; format lain (mis. WEBP) diubah ke PNG lewat Canvas. */
async function sematkanGambar(doc: PDFDocument, url: string): Promise<PDFImage> {
  const bytes = await ambil(url);
  const kepala = new Uint8Array(bytes.slice(0, 4));
  if (kepala[0] === 0x89 && kepala[1] === 0x50) return doc.embedPng(bytes);
  if (kepala[0] === 0xff && kepala[1] === 0xd8) return doc.embedJpg(bytes);
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext('2d')!.drawImage(bitmap, 0, 0);
  const png = await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('Konversi gambar gagal.'))), 'image/png'));
  return doc.embedPng(await png.arrayBuffer());
}

/**
 * Renderer PDF vektor (A4 landscape): teks tetap tajam & dapat diseleksi, font ditanam (subset).
 * Memakai operasi tata letak yang sama dengan pratinjau.
 */
export async function buatPdf(halaman: Halaman, meta: { judul: string; penulis: string | null }): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(meta.judul);
  if (meta.penulis) doc.setAuthor(meta.penulis);
  doc.setCreator('SEKAR — Sistem Event, Keuangan, dan Administrasi Terintegrasi');
  doc.setProducer('SEKAR');

  const H = halaman.tinggi * MM;
  const page = doc.addPage([halaman.lebar * MM, H]);

  const fonts = new Map<string, PDFFont>();
  const font = async (f: Font) => {
    const kunci = `${f.keluarga}-${f.berat}`;
    if (!fonts.has(kunci)) fonts.set(kunci, await doc.embedFont(await ambil(urlFont(f)), { subset: true }));
    return fonts.get(kunci)!;
  };
  const gambar = new Map<string, PDFImage>();

  for (const o of halaman.ops) {
    switch (o.t) {
      case 'latar':
      case 'gambar': {
        const src = o.t === 'latar' ? TEMPLATE.src : o.src;
        if (!gambar.has(src)) gambar.set(src, await sematkanGambar(doc, src));
        const img = gambar.get(src)!;
        let { x, y, w, h } = o;
        if (o.t === 'gambar') {
          const k = Math.min(o.w / img.width, o.h / img.height);
          w = img.width * k;
          h = img.height * k;
          x = o.x + (o.rata === 'kiri' ? 0 : (o.w - w) / 2);
          y = o.y + (o.h - h) / 2;
        }
        // Bagian latar di luar halaman otomatis terpotong oleh batas halaman.
        page.drawImage(img, {
          x: x * MM,
          y: H - (y + h) * MM,
          width: w * MM,
          height: h * MM,
          ...(o.t === 'gambar' && o.campur ? { blendMode: BlendMode.Multiply } : {}),
        });
        break;
      }
      case 'kotak':
        page.drawSvgPath(persegi(o.x, o.y, o.w, o.h, o.r), {
          x: 0,
          y: H,
          scale: MM,
          color: warna(o.isi),
          opacity: o.opasitas ?? 1,
          ...(o.garis ? { borderColor: warna(o.garis), borderWidth: o.tebal ?? 0.3, borderOpacity: 1 } : {}),
        });
        break;
      case 'lingkaran':
        page.drawCircle({ x: o.cx * MM, y: H - o.cy * MM, size: o.r * MM, color: warna(o.isi) });
        break;
      case 'garis':
        page.drawLine({ start: { x: o.x1 * MM, y: H - o.y1 * MM }, end: { x: o.x2 * MM, y: H - o.y2 * MM }, thickness: o.tebal * MM, color: warna(o.warna) });
        break;
      case 'ikon':
        page.drawSvgPath(o.d, {
          x: o.x * MM,
          y: H - o.y * MM,
          scale: (o.ukuran / 24) * MM,
          borderColor: warna(o.warna),
          borderWidth: o.tebal,
          borderLineCap: LineCapStyle.Round,
        });
        break;
      case 'teks': {
        const pf = await font(o.font);
        const size = o.font.ukuran * MM;
        const lebar = pf.widthOfTextAtSize(o.teks, size);
        const x = o.x * MM - (o.rata === 'kanan' ? lebar : o.rata === 'tengah' ? lebar / 2 : 0);
        page.drawText(o.teks, { x, y: H - o.y * MM, size, font: pf, color: warna(o.warna) });
        break;
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}
