// The website's copies of the app's signature pieces: Lune, the aura orb, medals and quest rings.
// Same shapes and colours as src/components/Lune.tsx and src/components/glow/*.
import type { Badge } from '@/logic/rewards';

export type LuneMood = 'happy' | 'cheer' | 'worried' | 'sleepy';

const INK = '#2B1D33';
const ARM = '#DCD8FB';
const SHADE = '#A49AE8';
const EARS: Record<LuneMood, [number, number]> = {
  happy: [-12, 14],
  cheer: [-26, 26],
  worried: [-104, 104],
  sleepy: [-62, 18],
};
const ARMS: Record<LuneMood, [number, number]> = {
  happy: [22, -125],
  cheer: [122, -122],
  worried: [-38, 38],
  sleepy: [14, -14],
};

function Arm({ x, y, a }: { x: number; y: number; a: number }) {
  const l = 28;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <rect x={-8} y={-4} width={16} height={l + 4} rx={8} fill={ARM} />
      <rect x={1} y={0} width={7} height={l} rx={3.5} fill={SHADE} opacity={0.35} />
      <circle cx={0} cy={l} r={9.5} fill={ARM} />
      <circle cx={-6} cy={l + 6} r={3.6} fill={ARM} />
      <circle cx={0} cy={l + 8} r={3.6} fill={ARM} />
      <circle cx={6} cy={l + 6} r={3.6} fill={ARM} />
    </g>
  );
}

function Eye({ x, y, r, kind }: { x: number; y: number; r: number; kind: 'open' | 'joy' | 'closed' }) {
  if (kind === 'joy')
    return (
      <path
        d={`M${x - r} ${y + r * 0.35}Q${x} ${y - r * 1.1} ${x + r} ${y + r * 0.35}`}
        stroke={INK}
        strokeWidth={r * 0.42}
        strokeLinecap="round"
        fill="none"
      />
    );
  if (kind === 'closed')
    return (
      <path
        d={`M${x - r} ${y - r * 0.1}Q${x} ${y + r * 0.9} ${x + r} ${y - r * 0.1}`}
        stroke={INK}
        strokeWidth={r * 0.36}
        strokeLinecap="round"
        fill="none"
      />
    );
  return (
    <g className="eye" style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y} rx={r * 0.82} ry={r} fill={INK} />
      <circle cx={x + r * 0.28} cy={y - r * 0.38} r={r * 0.36} fill="#fff" />
      <circle cx={x - r * 0.3} cy={y + r * 0.4} r={r * 0.16} fill="#fff" opacity={0.8} />
    </g>
  );
}

/** Lune, the lavender bunny. Bobs and blinks with CSS (off with reduced motion). */
export function Lune({ mood = 'happy', size = 120, id = 'l' }: { mood?: LuneMood; size?: number; id?: string }) {
  const [el, er] = EARS[mood];
  const [al, ar] = ARMS[mood];
  const kind = mood === 'cheer' ? 'joy' : mood === 'sleepy' ? 'closed' : 'open';
  const ey = mood === 'happy' ? 102 : 104;
  const r = mood === 'happy' ? 11 : 10;
  const fur = `url(#fur-${id})`;
  return (
    <svg className="lune" viewBox="0 0 200 220" width={size} height={size * 1.1} aria-hidden="true">
      <defs>
        <linearGradient id={`fur-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ECEBFF" />
          <stop offset="1" stopColor="#C9C3F6" />
        </linearGradient>
        <linearGradient id={`ear-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC1A0" />
          <stop offset="1" stopColor="#F58AB4" />
        </linearGradient>
      </defs>
      <ellipse cx={100} cy={210} rx={44} ry={6} fill="#3A2350" opacity={0.13} />
      <g className="bob">
        {[
          [80, el],
          [120, er],
        ].map(([px, a]) => (
          <g key={px} transform={`translate(${px} 62) rotate(${a})`}>
            <ellipse cx={0} cy={-38} rx={15} ry={40} fill={fur} />
            <ellipse cx={0} cy={-36} rx={7.5} ry={29} fill={`url(#ear-${id})`} />
          </g>
        ))}
        <circle cx={140} cy={178} r={13} fill="#fff" />
        <ellipse cx={100} cy={166} rx={38} ry={36} fill={fur} />
        <ellipse cx={100} cy={174} rx={25} ry={23} fill="#FBFAFF" />
        {[78, 122].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={201} rx={19} ry={9} fill="#E4E1FF" />
            <ellipse cx={x} cy={203} rx={8} ry={4} fill="#F9B7CC" />
          </g>
        ))}
        <ellipse cx={100} cy={104} rx={58} ry={50} fill={fur} />
        <ellipse cx={100} cy={130} rx={44} ry={16} fill={SHADE} opacity={0.18} />
        <ellipse cx={76} cy={72} rx={20} ry={9} fill="#fff" opacity={0.7} transform="rotate(-18 76 72)" />
        <ellipse cx={64} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={0.42} />
        <ellipse cx={136} cy={120} rx={11} ry={6.5} fill="#FF8FB5" opacity={0.42} />
        <path d="M95 113Q100 110 105 113Q103 118 100 119Q97 118 95 113Z" fill="#F58AB4" />
        <Eye x={78} y={ey} r={r} kind={kind} />
        <Eye x={122} y={ey} r={r} kind={kind} />
        {mood === 'happy' ? (
          <path
            d="M100 119Q100 126 93 126M100 119Q100 126 107 126"
            stroke={INK}
            strokeWidth={2.8}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {mood === 'cheer' ? (
          <>
            <path d="M89 121Q100 142 111 121Z" fill={INK} />
            <path d="M94 132Q100 136 106 132" stroke="#FF6F9C" strokeWidth={4} strokeLinecap="round" />
          </>
        ) : null}
        {mood === 'worried' ? (
          <>
            <path d="M70 89L83.6 82M130 89L116.4 82" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
            <path
              d="M90 128Q95 122 100 127Q105 132 110 126"
              stroke={INK}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
            <path d="M150 76q7 11 0 15q-7-4 0-15z" fill="#BFE3FF" />
          </>
        ) : null}
        {mood === 'sleepy' ? (
          <>
            <ellipse cx={100} cy={126} rx={4} ry={3.4} fill={INK} />
            <text x={152} y={64} fontSize={20} fontWeight={800} fill="#8A8CF7">
              z
            </text>
            <text x={167} y={50} fontSize={14} fontWeight={800} fill="#8A8CF7" opacity={0.75}>
              z
            </text>
          </>
        ) : null}
        <Arm x={70} y={152} a={al} />
        <Arm x={130} y={152} a={ar} />
      </g>
    </svg>
  );
}

/** The aura orb with a thin progress ring and the percentage in big thin type. */
export function Orb({ p, size = 220, label = 'Today’s glow' }: { p: number; size?: number; label?: string }) {
  const R = 96;
  const C = 2 * Math.PI * R;
  return (
    <div
      className="orb"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(p * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}>
      <div className="orb-glow" />
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <circle cx={100} cy={100} r={R} fill="none" stroke="var(--line2)" strokeWidth={1.5} />
        <circle
          className="orb-ring"
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke="var(--text)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray={`${C * Math.min(1, p)} ${C}`}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="orb-num">
        <b>{Math.round(p * 100)}</b>
        <sup>%</sup>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Small stroke icons standing in for the app's SF Symbols. */
const ICONS: Record<string, string> = {
  flame: 'M12 3c1 3 4 5 4 9a4 4 0 01-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z',
  star: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
  drop: 'M12 4c3 4 6 7 6 10a6 6 0 01-12 0c0-3 3-6 6-10z',
  waves: 'M3 10c3-2 6 2 9 0s6-2 9 0M3 15c3-2 6 2 9 0s6-2 9 0',
  sunrise: 'M4 17h16M7 17a5 5 0 0110 0M12 5v3M5 9l2 2M19 9l-2 2',
  moon: 'M15 4a7 7 0 107 9 6 6 0 01-7-9z',
  camera: 'M4 8h4l2-2h4l2 2h4v10H4zM12 16a3 3 0 100-6 3 3 0 000 6z',
  photos: 'M5 7h12v11H5zM8 4h12v11',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  back: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  plane: 'M3 14l7-2 4-8h2l-1 8 6 2v2l-6-1-1 5h-2l-1-5-8 1z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  run: 'M13 4a2 2 0 100 4 2 2 0 000-4zM9 21l3-6 3 2v4M7 12l3-3 4 1 3 3',
  flower:
    'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 4c2 0 3 2 3 4s-1 2-3 2-3 0-3-2 1-4 3-4zM12 20c-2 0-3-2-3-4s1-2 3-2 3 0 3 2-1 4-3 4zM4 12c0-2 2-3 4-3s2 1 2 3 0 3-2 3-4-1-4-3zM20 12c0 2-2 3-4 3s-2-1-2-3 0-3 2-3 4 1 4 3z',
  sparkles:
    'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z',
  crown: 'M4 18h16M5 16l-1-9 5 4 3-6 3 6 5-4-1 9z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  check: 'M5 12l5 5 9-10',
};
const SF: Record<string, string> = {
  'flame.fill': 'flame',
  'crown.fill': 'crown',
  'globe.europe.africa.fill': 'globe',
  'star.fill': 'star',
  'star.circle.fill': 'star',
  'drop.fill': 'drop',
  'water.waves': 'waves',
  'sunrise.fill': 'sunrise',
  'moon.stars.fill': 'moon',
  'camera.fill': 'camera',
  'photo.stack.fill': 'photos',
  'shield.fill': 'shield',
  'arrow.uturn.up': 'back',
  calendar: 'calendar',
  airplane: 'plane',
  'sun.max.fill': 'sun',
  'figure.run': 'run',
  'camera.macro': 'flower',
  sparkles: 'sparkles',
  'moon.fill': 'moon',
  'sun.haze.fill': 'sun',
  'flask.fill': 'drop',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const d = ICONS[SF[name] ?? name] ?? ICONS.sparkles;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Medal({ badge, size = 54 }: { badge: Pick<Badge, 'icon' | 'tone' | 'got'>; size?: number }) {
  return (
    <span className={`medal ${badge.got ? `on t-${badge.tone}` : ''}`} style={{ width: size, height: size }}>
      <Icon name={badge.icon} size={size * 0.42} />
    </span>
  );
}

export function QuestRing({ p }: { p: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  if (p >= 1)
    return (
      <span className="qdone">
        <Icon name="check" size={15} />
      </span>
    );
  return (
    <svg viewBox="0 0 34 34" width={34} height={34} aria-hidden="true">
      <defs>
        <linearGradient id="qr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB27A" />
          <stop offset="0.55" stopColor="#F06FA5" />
          <stop offset="1" stopColor="#9B7BF2" />
        </linearGradient>
      </defs>
      <circle cx={17} cy={17} r={r} fill="none" stroke="var(--line2)" strokeWidth={3} />
      {p > 0 ? (
        <circle
          cx={17}
          cy={17}
          r={r}
          fill="none"
          stroke="url(#qr)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform="rotate(-90 17 17)"
        />
      ) : null}
    </svg>
  );
}
