import { KELUARGA, siapkanFont } from './font';
import { TEMPLATE, type Halaman } from './tataLetak';

/** 300 DPI: 297 × 210 mm → 3508 × 2480 px. */
export const PX_PER_MM = 300 / 25.4;

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gambar ${src} gagal dimuat.`));
    img.src = src;
  });
}

/** Renderer Canvas → PNG A4 landscape 300 DPI dari operasi tata letak yang sama dengan pratinjau. */
export async function buatPng(halaman: Halaman): Promise<Blob> {
  await siapkanFont();
  const s = PX_PER_MM;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(halaman.lebar * s);
  canvas.height = Math.round(halaman.tinggi * s);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pembuatan gambar.');

  const sumber = [...new Set(halaman.ops.flatMap((o) => (o.t === 'latar' ? [TEMPLATE.src] : o.t === 'gambar' ? [o.src] : [])))];
  const gambar = new Map(await Promise.all(sumber.map(async (src) => [src, await muatGambar(src)] as const)));

  ctx.textBaseline = 'alphabetic';
  for (const o of halaman.ops) {
    ctx.save();
    switch (o.t) {
      case 'latar':
      case 'gambar': {
        const img = gambar.get(o.t === 'latar' ? TEMPLATE.src : o.src)!;
        if (o.t === 'gambar') {
          // Logo & tanda tangan: pertahankan rasio di dalam kotak.
          const k = Math.min(o.w / img.naturalWidth, o.h / img.naturalHeight);
          const w = img.naturalWidth * k;
          const h = img.naturalHeight * k;
          if (o.campur) ctx.globalCompositeOperation = o.campur;
          ctx.drawImage(img, (o.x + (o.rata === 'kiri' ? 0 : (o.w - w) / 2)) * s, (o.y + (o.h - h) / 2) * s, w * s, h * s);
        } else ctx.drawImage(img, o.x * s, o.y * s, o.w * s, o.h * s);
        break;
      }
      case 'kotak':
        ctx.beginPath();
        ctx.roundRect(o.x * s, o.y * s, o.w * s, o.h * s, o.r * s);
        ctx.globalAlpha = o.opasitas ?? 1;
        ctx.fillStyle = o.isi;
        ctx.fill();
        if (o.garis) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = o.garis;
          ctx.lineWidth = (o.tebal ?? 0.3) * s;
          ctx.stroke();
        }
        break;
      case 'lingkaran':
        ctx.beginPath();
        ctx.arc(o.cx * s, o.cy * s, o.r * s, 0, Math.PI * 2);
        ctx.fillStyle = o.isi;
        ctx.fill();
        break;
      case 'garis':
        ctx.beginPath();
        ctx.moveTo(o.x1 * s, o.y1 * s);
        ctx.lineTo(o.x2 * s, o.y2 * s);
        ctx.strokeStyle = o.warna;
        ctx.lineWidth = o.tebal * s;
        ctx.stroke();
        break;
      case 'ikon':
        ctx.translate(o.x * s, o.y * s);
        ctx.scale((o.ukuran / 24) * s, (o.ukuran / 24) * s);
        ctx.strokeStyle = o.warna;
        ctx.lineWidth = o.tebal;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(o.d));
        break;
      case 'teks':
        ctx.font = `${o.font.berat} ${o.font.ukuran * s}px "${KELUARGA[o.font.keluarga]}"`;
        ctx.fillStyle = o.warna;
        ctx.textAlign = o.rata === 'kanan' ? 'right' : o.rata === 'tengah' ? 'center' : 'left';
        ctx.fillText(o.teks, o.x * s, o.y * s);
        break;
    }
    ctx.restore();
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat PNG.'))), 'image/png'));
}
