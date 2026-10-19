import type { CSSProperties } from 'react';
import { cx } from './ui';

/*
 * Ilustrasi datar (SVG) untuk keadaan kosong, senada dengan ilustrasi halaman masuk:
 * panggung biru, lampu kuning, pepohonan hijau, aksen navy. Animasinya halus (melayang & kilau)
 * dan otomatis berhenti bila pengguna memilih "kurangi gerakan".
 */

const NAVY = '#12264A';
const NAVY_2 = '#1C3563';
const BIRU = '#2F6FED';
const BIRU_TUA = '#1F55C4';
const KUNING = '#F5B800';
const HIJAU = '#1E9E63';
const GARIS = '#DCE2EC';
const ABU = '#E3E8F0';
const LATAR = '#EEF4FF';

/** Animasi CSS pada elemen SVG berputar/berskala dari pusat elemennya sendiri. */
const pusat: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

/** Bintang empat sudut yang berkelip. */
function Kilau({ x, y, r, tunda = 0, warna = KUNING }: { x: number; y: number; r: number; tunda?: number; warna?: string }) {
  return (
    <path
      d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
      fill={warna}
      className="animate-kelip"
      style={{ ...pusat, animationDelay: `${tunda}s` }}
    />
  );
}

function Pohon({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="4" width="5" height="30" rx="2" fill="#8A5A3B" />
      <circle cx="0" cy="0" r="17" fill="#3FAE6A" />
      <circle cx="-10" cy="9" r="11" fill="#2E9E5B" />
      <circle cx="11" cy="8" r="10" fill="#55BF7D" />
    </g>
  );
}

/** Belum ada event: kalender melayang di depan panggung. */
export function IlustrasiEvent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={cx('h-auto w-[240px] max-w-full', className)}>
      <ellipse cx="120" cy="84" rx="114" ry="68" fill={LATAR} />
      <ellipse cx="120" cy="142" rx="106" ry="11" fill="#DDEFE4" />
      <Pohon x={34} y={102} />
      <Pohon x={206} y={104} s={0.92} />

      {/* Panggung */}
      <path d="M82 40 120 20 158 40Z" fill={BIRU} />
      <rect x="78" y="39" width="84" height="7" rx="2" fill={BIRU_TUA} />
      <rect x="82" y="46" width="6" height="76" fill="#B8C4D6" />
      <rect x="152" y="46" width="6" height="76" fill="#B8C4D6" />
      <rect x="88" y="48" width="64" height="60" rx="2" fill={NAVY} />
      {/* Sorot lampu: transparansi di grup agar animasi kelip tetap lembut. */}
      <g opacity=".28">
        <path d="M100 50 90 108h22Z" fill={KUNING} className="animate-kelip" style={pusat} />
        <path d="M140 50 128 108h22Z" fill={KUNING} className="animate-kelip" style={{ ...pusat, animationDelay: '1.2s' }} />
      </g>
      {[100, 120, 140].map((cx) => (
        <circle key={cx} cx={cx} cy="50" r="3" fill={KUNING} />
      ))}
      {/* Lambang di layar panggung */}
      <path d="M120 66c-9-8-17-4-17 2 0 5 8 10 17 16 9-6 17-11 17-16 0-6-8-10-17-2Z" fill={KUNING} />
      <rect x="118.5" y="60" width="3" height="16" rx="1.5" fill={NAVY_2} />
      <rect x="80" y="108" width="80" height="14" rx="2" fill={NAVY_2} />
      <rect x="66" y="88" width="13" height="34" rx="2" fill={NAVY} />
      <circle cx="72.5" cy="98" r="3.5" fill="#2B4A80" />
      <circle cx="72.5" cy="111" r="4.5" fill="#2B4A80" />
      <rect x="161" y="88" width="13" height="34" rx="2" fill={NAVY} />
      <circle cx="167.5" cy="98" r="3.5" fill="#2B4A80" />
      <circle cx="167.5" cy="111" r="4.5" fill="#2B4A80" />

      {/* Kalender melayang */}
      <g className="animate-mengambang">
        <rect x="18" y="46" width="60" height="54" rx="9" fill="#fff" stroke={GARIS} strokeWidth="1.5" />
        <path d="M18 55a9 9 0 0 1 9-9h42a9 9 0 0 1 9 9v6H18Z" fill={BIRU} />
        <rect x="30" y="41" width="4" height="11" rx="2" fill={NAVY} />
        <rect x="62" y="41" width="4" height="11" rx="2" fill={NAVY} />
        {[0, 1, 2].flatMap((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}${c}`} x={25 + c * 9.6} y={67 + r * 9.5} width="6.5" height="6" rx="1.5" fill={r === 1 && c === 2 ? KUNING : ABU} />
          )),
        )}
        <circle cx="76" cy="96" r="9" fill={HIJAU} />
        <path d="M76 91.5v9M71.5 96h9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      <Kilau x={186} y={34} r={6} />
      <Kilau x={58} y={24} r={4.5} tunda={0.8} />
      <Kilau x={172} y={64} r={3.5} tunda={1.6} warna={BIRU} />
    </svg>
  );
}

/** Belum ada transaksi: dompet dengan kartu, struk, dan koin. */
export function IlustrasiDompet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true" className={cx('h-auto w-[200px] max-w-full', className)}>
      <ellipse cx="100" cy="66" rx="94" ry="58" fill={LATAR} />
      <ellipse cx="96" cy="118" rx="62" ry="7" fill={ABU} />

      {/* Struk di belakang */}
      <g transform="rotate(-8 142 52)">
        <path d="M122 20h42v54l-5.25-4-5.25 4-5.25-4-5.25 4-5.25-4-5.25 4-5.25-4-5.25 4Z" fill="#fff" stroke={GARIS} strokeWidth="1.5" />
        <rect x="129" y="30" width="28" height="3.5" rx="1.75" fill={ABU} />
        <rect x="129" y="39" width="22" height="3.5" rx="1.75" fill={ABU} />
        <rect x="129" y="48" width="26" height="3.5" rx="1.75" fill={ABU} />
        <rect x="129" y="58" width="16" height="4" rx="2" fill={HIJAU} opacity=".75" />
      </g>

      {/* Kartu */}
      <rect x="56" y="28" width="56" height="34" rx="5" fill={BIRU} transform="rotate(-11 84 45)" />
      <rect x="66" y="25" width="56" height="34" rx="5" fill={KUNING} transform="rotate(7 94 42)" />
      <rect x="74" y="32" width="14" height="10" rx="2" fill="#FFE08A" transform="rotate(7 94 42)" />

      {/* Dompet */}
      <rect x="42" y="48" width="98" height="62" rx="12" fill={NAVY} />
      <path d="M42 64V60a12 12 0 0 1 12-12h86v16Z" fill={NAVY_2} />
      <rect x="48" y="54" width="86" height="50" rx="8" fill="none" stroke="#fff" strokeOpacity=".16" strokeDasharray="3 3" />
      <rect x="112" y="68" width="34" height="22" rx="8" fill={NAVY_2} />
      <circle cx="124" cy="79" r="4.5" fill={KUNING} />

      {/* Koin & penanda naik/turun */}
      <g className="animate-mengambang">
        <circle cx="166" cy="92" r="11" fill={KUNING} />
        <circle cx="166" cy="92" r="7" fill="none" stroke="#D99A00" strokeWidth="2" />
      </g>
      <g className="animate-mengambang" style={{ animationDelay: '.8s' }}>
        <circle cx="28" cy="78" r="8" fill={KUNING} />
        <circle cx="28" cy="78" r="5" fill="none" stroke="#D99A00" strokeWidth="1.6" />
      </g>
      <g className="animate-mengambang" style={{ animationDelay: '1.4s' }}>
        <circle cx="168" cy="40" r="9" fill={HIJAU} />
        <path d="M168 45v-9.5M164 39.5l4-4 4 4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <Kilau x={34} y={34} r={5} tunda={0.4} />
      <Kilau x={186} y={66} r={3.5} tunda={1.3} warna={BIRU} />
    </svg>
  );
}

/** Transaksi tanpa bukti: struk kosong dengan tanda unggah. */
export function IlustrasiBukti({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 112" aria-hidden="true" className={cx('h-auto w-[180px] max-w-full', className)}>
      <ellipse cx="90" cy="58" rx="86" ry="50" fill={LATAR} />
      <g className="animate-mengambang">
        <path d="M60 14h58v70l-7.25-5-7.25 5-7.25-5-7.25 5-7.25-5-7.25 5-7.25-5-7.25 5Z" fill="#fff" stroke={GARIS} strokeWidth="1.5" />
        <rect x="68" y="25" width="42" height="4" rx="2" fill={ABU} />
        <rect x="68" y="35" width="32" height="4" rx="2" fill={ABU} />
        <rect x="68" y="45" width="38" height="4" rx="2" fill={ABU} />
        <rect x="68" y="60" width="20" height="5" rx="2.5" fill="#C9D2E0" />
        <rect x="96" y="60" width="14" height="5" rx="2.5" fill={BIRU} opacity=".8" />
      </g>
      <circle cx="128" cy="80" r="16" fill="#fff" stroke={BIRU} strokeWidth="2" strokeDasharray="4 3" />
      <path d="M128 87V73M122 79l6-6 6 6" fill="none" stroke={BIRU} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <Kilau x={42} y={30} r={5} />
      <Kilau x={150} y={30} r={4} tunda={1} warna={BIRU} />
    </svg>
  );
}

/** Organisasi belum punya logo: gedung dengan bendera. */
export function IlustrasiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cx('size-10', className)}>
      <rect x="10" y="19" width="28" height="20" rx="2" fill="#E4EDFF" />
      <path d="M7 21 24 11l17 10Z" fill={BIRU} />
      {[15, 22, 29].map((x) => (
        <rect key={x} x={x} y="24" width="4" height="11" rx="1" fill="#9DB7F5" />
      ))}
      <rect x="7" y="38" width="34" height="3.5" rx="1.75" fill={NAVY} />
      <path d="M24 11V2.5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 3h8.5l-2.4 2.6 2.4 2.6H24Z" fill={KUNING} className="animate-kelip" style={{ transformBox: 'fill-box', transformOrigin: 'left center' }} />
    </svg>
  );
}
