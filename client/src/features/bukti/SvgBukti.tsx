import { HALAMAN, TEMPLATE, type Halaman } from './tataLetak';
import { KELUARGA } from './font';

const ANCHOR = { kiri: 'start', kanan: 'end', tengah: 'middle' } as const;

/** Renderer SVG untuk pratinjau dan cetak. Ukuran mengikuti `className`/`style`; rasio A4 tetap. */
export function SvgBukti({ halaman, className, style, judul }: { halaman: Halaman; className?: string; style?: React.CSSProperties; judul: string }) {
  return (
    <svg
      viewBox={`0 0 ${HALAMAN.lebar} ${HALAMAN.tinggi}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={judul}
      className={className}
      style={style}
      textRendering="geometricPrecision"
    >
      {halaman.ops.map((o, i) => {
        switch (o.t) {
          case 'latar':
            return <image key={i} href={TEMPLATE.src} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none" />;
          case 'gambar':
            return (
              <image
                key={i}
                href={o.src}
                x={o.x}
                y={o.y}
                width={o.w}
                height={o.h}
                preserveAspectRatio={o.rata === 'kiri' ? 'xMinYMid meet' : 'xMidYMid meet'}
                style={o.campur ? { mixBlendMode: o.campur } : undefined}
              />
            );
          case 'kotak':
            return (
              <rect
                key={i}
                x={o.x}
                y={o.y}
                width={o.w}
                height={o.h}
                rx={o.r}
                fill={o.isi}
                fillOpacity={o.opasitas ?? 1}
                stroke={o.garis}
                strokeWidth={o.garis ? o.tebal : undefined}
              />
            );
          case 'lingkaran':
            return <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill={o.isi} />;
          case 'garis':
            return <line key={i} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={o.warna} strokeWidth={o.tebal} />;
          case 'ikon':
            return (
              <g key={i} transform={`translate(${o.x} ${o.y}) scale(${o.ukuran / 24})`}>
                <path d={o.d} fill="none" stroke={o.warna} strokeWidth={o.tebal} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          case 'teks':
            return (
              <text
                key={i}
                x={o.x}
                y={o.y}
                fontFamily={KELUARGA[o.font.keluarga]}
                fontWeight={o.font.berat}
                fontSize={o.font.ukuran}
                fill={o.warna}
                textAnchor={ANCHOR[o.rata]}
                xmlSpace="preserve"
              >
                {o.teks}
              </text>
            );
        }
      })}
    </svg>
  );
}
