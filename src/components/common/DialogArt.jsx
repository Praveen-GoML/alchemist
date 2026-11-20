import React from 'react';

/**
 * Spot illustrations for the dialog modal.
 * Flat vector style with soft gradients; all colours come from CSS variables
 * (--tone is set per dialog variant), so they follow light/dark themes.
 */

const mix = (pct, c = '#fff') => `color-mix(in srgb, var(--tone) ${pct}%, ${c})`;

function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-main`} x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" style={{ stopColor: mix(62) }} />
        <stop offset="1" style={{ stopColor: 'var(--tone)' }} />
      </linearGradient>
      <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--tone)' }} />
        <stop offset="1" style={{ stopColor: mix(78, '#000') }} />
      </linearGradient>
      <linearGradient id={`${id}-soft`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: mix(26, 'var(--surface)') }} />
        <stop offset="1" style={{ stopColor: mix(10, 'var(--surface)') }} />
      </linearGradient>
    </defs>
  );
}

/* shared backdrop: organic blob + ground shadow */
const Backdrop = () => (
  <>
    <path className="da-blob" d="M38 96C30 52 66 22 112 24c46 2 92 20 96 66 4 42-34 70-84 72-48 2-78-22-86-66z" />
    <ellipse className="da-ground" cx="120" cy="162" rx="64" ry="7" />
  </>
);

const Sparkle = ({ x, y, s = 1, o = 1 }) => (
  <path className="da-spark" transform={`translate(${x} ${y}) scale(${s})`} opacity={o} d="M0-9C1.500-3 3-1.500 9 0 3 1.500 1.500 3 0 9-1.500 3-3 1.500-9 0-3-1.500-1.500-3 0-9z" />
);
const Dot = ({ x, y, r = 3, o = 0.6 }) => <circle className="da-dot" cx={x} cy={y} r={r} opacity={o} />;

/* ── Delete: bin with paper flying out ── */
const danger = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="dgr" />
    <Backdrop />
    {/* papers */}
    <g transform="rotate(-16 78 60)">
      <rect className="da-paper" x="62" y="34" width="32" height="40" rx="5" />
      <path className="da-pline" d="M69 46h18M69 54h18M69 62h11" />
    </g>
    <g transform="rotate(18 168 54)">
      <rect className="da-paper" x="152" y="28" width="30" height="38" rx="5" />
      <path className="da-pline" d="M158 40h17M158 48h17M158 56h10" />
    </g>
    {/* bin */}
    <path d="M82 76h76l-6.500 74a9 9 0 0 1-9 8.200H97.500a9 9 0 0 1-9-8.200z" fill="url(#dgr-main)" />
    <path d="M82 76h76l-1.200 14H83.200z" fill="rgba(0,0,0,.12)" />
    <path className="da-slat" d="M103 94v50M120 94v50M137 94v50" />
    {/* lid */}
    <g transform="rotate(-9 150 66)">
      <rect x="72" y="58" width="96" height="14" rx="7" fill="url(#dgr-dark)" />
      <rect x="107" y="46" width="26" height="14" rx="7" fill="url(#dgr-dark)" />
    </g>
    <path className="da-motion" d="M52 96h14M48 108h12M176 100h14M180 112h10" />
    <Sparkle x={196} y={44} s={0.9} /><Sparkle x={40} y={62} s={0.6} o={0.7} />
    <Dot x={206} y={92} /><Dot x={34} y={128} r={4} />
  </svg>
);

/* ── Not allowed: padlock in front of a shield ── */
const lock = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="lck" />
    <Backdrop />
    <path className="da-shield" d="M120 26 178 46v36c0 38-25 60-58 72-33-12-58-34-58-72V46z" />
    <path className="da-shield-in" d="M120 38 166 54v28c0 30-19 48-46 58-27-10-46-28-46-58V54z" fill="url(#lck-soft)" />
    {/* shackle */}
    <path className="da-shackle" d="M102 88V76a18 18 0 0 1 36 0v12" />
    {/* body */}
    <rect x="86" y="86" width="68" height="52" rx="13" fill="url(#lck-main)" />
    <rect x="86" y="86" width="68" height="14" rx="7" fill="rgba(255,255,255,.18)" />
    <circle cx="120" cy="108" r="6.500" className="da-hole" />
    <rect x="117" y="110" width="6" height="14" rx="3" className="da-hole" />
    {/* key */}
    <g transform="translate(178 132) rotate(-32)">
      <circle className="da-key" cx="0" cy="0" r="9" fill="none" />
      <path className="da-key" d="M9 0h24M26 0v8M33 0v6" />
    </g>
    <Sparkle x={42} y={50} s={0.8} /><Sparkle x={200} y={62} s={0.6} o={0.7} />
    <Dot x={206} y={112} r={4} /><Dot x={36} y={118} />
  </svg>
);

/* ── Success: badge with check and confetti ── */
const success = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="suc" />
    <Backdrop />
    <circle className="da-halo" cx="120" cy="86" r="62" />
    <circle className="da-halo2" cx="120" cy="86" r="52" />
    <circle cx="120" cy="86" r="42" fill="url(#suc-main)" />
    <path d="M120 44a42 42 0 0 1 36 20c-12-6-24-8-36-6-14 2-26 8-36 18A42 42 0 0 1 120 44z" fill="rgba(255,255,255,.2)" />
    <path className="da-check" d="m100 88 14 14 27-30" />
    {/* confetti */}
    <rect className="da-c1" x="56" y="40" width="10" height="5" rx="2.500" transform="rotate(-35 56 40)" />
    <rect className="da-c2" x="184" y="48" width="11" height="5" rx="2.500" transform="rotate(30 184 48)" />
    <rect className="da-c3" x="48" y="112" width="9" height="5" rx="2.500" transform="rotate(25 48 112)" />
    <rect className="da-c1" x="190" y="118" width="10" height="5" rx="2.500" transform="rotate(-25 190 118)" />
    <circle className="da-c2" cx="76" cy="30" r="4" /><circle className="da-c3" cx="168" cy="28" r="3.500" />
    <Sparkle x={34} y={78} s={0.8} /><Sparkle x={206} y={86} s={0.9} />
  </svg>
);

/* ── Error: warning sign ── */
const error = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="err" />
    <Backdrop />
    <path d="M120 36 180 138H60z" fill="url(#err-main)" stroke="url(#err-main)" strokeWidth="16" strokeLinejoin="round" />
    <path d="M120 36 180 138H60z" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinejoin="round" transform="translate(0 -3)" />
    <rect className="da-excl" x="114" y="68" width="12" height="38" rx="6" />
    <circle className="da-excl" cx="120" cy="120" r="7" />
    <path className="da-motion" d="M52 70l10 6M44 86h12M188 70l-10 6M196 88h-12" />
    <Sparkle x={42} y={44} s={0.7} /><Sparkle x={202} y={50} s={0.8} o={0.8} />
    <Dot x={206} y={126} r={4} /><Dot x={34} y={132} />
  </svg>
);

/* ── Question / confirm: speech bubbles ── */
const question = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="qst" />
    <Backdrop />
    {/* back bubble */}
    <g>
      <rect x="112" y="84" width="92" height="52" rx="18" fill="url(#qst-soft)" />
      <path d="M186 134l14 16-26-10z" fill={mix(18, 'var(--surface)')} />
      <circle className="da-dots" cx="140" cy="110" r="4.500" /><circle className="da-dots" cx="158" cy="110" r="4.500" /><circle className="da-dots" cx="176" cy="110" r="4.500" />
    </g>
    {/* front bubble */}
    <rect x="40" y="34" width="106" height="78" rx="24" fill="url(#qst-main)" />
    <path d="M62 108 50 138l36-20z" fill="url(#qst-dark)" />
    <path className="da-qm" d="M81 68a17 17 0 1 1 24 15.500c-6 2.500-9 6-9 12" />
    <circle className="da-excl" cx="96" cy="107" r="6" transform="translate(0 -2)" />
    <Sparkle x={196} y={48} s={0.9} /><Sparkle x={34} y={120} s={0.6} o={0.7} />
    <Dot x={210} y={100} r={4} />
  </svg>
);

/* ── Info: notice card ── */
const info = (
  <svg viewBox="0 0 240 180" role="img" aria-hidden="true">
    <Defs id="inf" />
    <Backdrop />
    <rect x="62" y="40" width="116" height="96" rx="16" fill="url(#inf-soft)" />
    <path className="da-pline2" d="M82 118h76M82 106h56" />
    <circle cx="120" cy="72" r="26" fill="url(#inf-main)" />
    <rect className="da-excl" x="117" y="70" width="6" height="18" rx="3" />
    <circle className="da-excl" cx="120" cy="60" r="4" />
    <Sparkle x={196} y={50} s={0.8} /><Sparkle x={40} y={86} s={0.7} o={0.8} />
    <Dot x={204} y={118} r={4} /><Dot x={44} y={136} />
  </svg>
);

export const Art = { danger, lock, success, error, question, info };
export default Art;
