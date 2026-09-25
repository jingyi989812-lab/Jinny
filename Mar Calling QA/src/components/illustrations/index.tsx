/**
 * Hand-drawn style SVG illustrations. Pure inline SVG — no external assets.
 * Charcoal outlines, flat pastel fills, rounded joins: webtoon × city-pop.
 */
import type { CSSProperties } from 'react';
import type { AvatarStyle } from '@/types/staff';

const INK = '#2A2630';
const S = { stroke: INK, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function Sparkle({ size = 22, color = '#FFE08A', style, className }: { size?: number; color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className} aria-hidden>
      <path d="M12 1.5 C13 8 16 11 22.5 12 C16 13 13 16 12 22.5 C11 16 8 13 1.5 12 C8 11 11 8 12 1.5Z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Heart({ size = 20, color = '#F6C6CC', style, className }: { size?: number; color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className} aria-hidden>
      <path d="M12 21 C5 16 2 12.5 2 8.5 C2 5.5 4.3 3.3 7 3.3 C9 3.3 10.8 4.5 12 6.3 C13.2 4.5 15 3.3 17 3.3 C19.7 3.3 22 5.5 22 8.5 C22 12.5 19 16 12 21Z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Squiggle({ width = 140, color = '#E2A23A', style }: { width?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={width} height={14} viewBox="0 0 140 14" style={style} aria-hidden preserveAspectRatio="none">
      <path d="M2 9 C 16 2, 26 13, 40 7 S 64 2, 78 8 S 104 13, 118 6 S 134 5, 138 7" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 400" width="100%" role="img" aria-label="A friendly MARCOM consultant wearing a headset in a bright office at sunset">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAD8DD" />
          <stop offset="0.55" stopColor="#FFE6C7" />
          <stop offset="1" stopColor="#FFF4D6" />
        </linearGradient>
        <clipPath id="win">
          <rect x="44" y="24" width="432" height="246" rx="26" />
        </clipPath>
      </defs>

      {/* window */}
      <rect x="44" y="24" width="432" height="246" rx="26" fill="url(#sky)" />
      <g clipPath="url(#win)">
        {/* city-pop striped sun */}
        <circle cx="340" cy="150" r="62" fill="#FFD36E" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="270" y={158 + i * 13} width="140" height={4 + i * 1.6} fill="#FFE6C7" />
        ))}
        {/* clouds */}
        <path d="M86 86 q10 -18 30 -10 q14 -14 30 2 q18 0 16 14 h-82 q-6 -6 6 -6z" fill="#fff" opacity="0.9" />
        <path d="M388 64 q8 -12 22 -6 q10 -10 22 2 q14 0 12 10 h-60 q-4 -6 4 -6z" fill="#fff" opacity="0.8" />
        {/* skyline back */}
        <path d="M44 270 V190 h28 v-24 h26 v40 h22 v-58 h34 v42 h20 v-18 h30 v68 h24 v-50 h36 v36 h26 v-72 h30 v60 h22 v-30 h34 v52 h28 v-28 h36 V270Z" fill="#D9CFEA" />
        {/* skyline front */}
        <path d="M44 270 V222 h40 v-20 h30 v34 h34 v-48 h28 v58 h40 v-26 h26 v30 h30 v-62 h38 v54 h32 v-34 h30 v44 h36 v-20 h38 V270Z" fill="#B9D6B0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        {[
          [124, 200], [124, 214], [134, 200], [134, 214], [300, 214], [312, 214], [300, 226], [312, 226], [360, 236], [372, 236], [196, 222], [206, 222],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="6" height="7" rx="1.5" fill="#FFF7DC" />
        ))}
      </g>
      <rect x="44" y="24" width="432" height="246" rx="26" fill="none" {...S} strokeWidth={3} />
      <line x1="260" y1="26" x2="260" y2="268" stroke={INK} strokeWidth="3" />

      {/* plant */}
      <g>
        <path d="M78 300 C60 270 58 246 74 232 C84 254 88 276 86 300" fill="#8CC08F" {...S} />
        <path d="M92 300 C92 262 104 236 124 226 C124 256 112 282 100 300" fill="#B9D6B0" {...S} />
        <path d="M84 300 C70 284 44 282 36 270 C58 262 80 276 90 298" fill="#A8CFA0" {...S} />
        <path d="M62 300 h52 l-8 50 h-36z" fill="#F6C6CC" {...S} />
      </g>

      {/* character — body */}
      <path d="M150 336 C150 286 174 262 212 262 C250 262 274 286 274 336Z" fill="#F6C6CC" {...S} />
      <path d="M196 262 L212 286 L228 262" fill="#FFFDF8" {...S} />
      <rect x="203" y="238" width="18" height="28" rx="8" fill="#F3D2B3" {...S} />
      {/* hair back */}
      <path d="M160 196 C156 140 186 118 214 118 C246 118 270 142 266 196 C266 226 262 250 250 262 C238 250 240 226 238 212 L188 212 C186 230 188 252 174 262 C162 250 160 226 160 196Z" fill="#3A2E2E" {...S} />
      {/* face */}
      <ellipse cx="213" cy="192" rx="44" ry="48" fill="#F3D2B3" {...S} />
      {/* bangs */}
      <path d="M168 186 C168 146 190 130 214 130 C240 130 260 148 258 186 C246 166 232 156 222 150 C214 166 190 176 168 186Z" fill="#3A2E2E" {...S} />
      {/* eyes (happy arcs) */}
      <path d="M190 198 q8 -9 16 0" fill="none" {...S} />
      <path d="M222 198 q8 -9 16 0" fill="none" {...S} />
      <ellipse cx="186" cy="214" rx="8" ry="5" fill="#F6A9B4" opacity="0.8" />
      <ellipse cx="242" cy="214" rx="8" ry="5" fill="#F6A9B4" opacity="0.8" />
      <path d="M202 220 q12 12 24 0" fill="#fff" {...S} />
      {/* headset */}
      <path d="M162 196 C158 128 268 124 264 196" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M162 196 C158 128 268 124 264 196" fill="none" stroke="#FFE08A" strokeWidth="3" strokeLinecap="round" />
      <rect x="150" y="184" width="22" height="34" rx="10" fill="#FFE08A" {...S} />
      <rect x="254" y="184" width="22" height="34" rx="10" fill="#FFE08A" {...S} />
      <path d="M160 214 C160 238 176 244 196 236" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="199" cy="235" r="6" fill={INK} />

      {/* waving hand */}
      <g>
        <path d="M262 300 C274 272 282 250 290 232" fill="none" stroke="#F6C6CC" strokeWidth="18" strokeLinecap="round" />
        <path d="M262 300 C274 272 282 250 290 232" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0" opacity="0" />
        <circle cx="294" cy="222" r="14" fill="#F3D2B3" {...S} />
        <path d="M312 204 q6 -4 10 -12 M316 220 q8 0 14 -4" fill="none" {...S} />
      </g>

      {/* desk */}
      <rect x="18" y="330" width="484" height="20" rx="8" fill="#E9D5B4" {...S} />
      <path d="M40 350 v40 M480 350 v40" {...S} />
      {/* laptop */}
      <path d="M318 264 h118 a8 8 0 0 1 8 8 v58 h-134 v-58 a8 8 0 0 1 8 -8z" fill={INK} {...S} />
      <path d="M296 330 h170 l-10 -2" fill="none" {...S} />
      <g transform="translate(377 297)">
        <path d="M0 10 C-9 4 -12 -1 -12 -5 C-12 -9 -9 -11 -6 -11 C-3 -11 -1 -9 0 -7 C1 -9 3 -11 6 -11 C9 -11 12 -9 12 -5 C12 -1 9 4 0 10Z" fill="#F6C6CC" />
      </g>
      {/* mug */}
      <path d="M458 298 h30 v28 a8 8 0 0 1 -8 8 h-14 a8 8 0 0 1 -8 -8z" fill="#FFFDF8" {...S} />
      <path d="M488 306 q12 2 0 16" fill="none" {...S} />
      <path d="M466 288 q4 -8 0 -14 M478 288 q4 -8 0 -14" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* notebook */}
      <g transform="rotate(-6 120 318)">
        <rect x="120" y="306" width="70" height="22" rx="4" fill="#FFE08A" {...S} />
        <path d="M132 314 h40 M132 320 h28" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* sparkles */}
      <g className="twinkle"><path d="M110 40 C111 48 114 51 122 52 C114 53 111 56 110 64 C109 56 106 53 98 52 C106 51 109 48 110 40Z" fill="#FFE08A" stroke={INK} strokeWidth="1.8" /></g>
      <g className="twinkle" style={{ animationDelay: '0.8s' }}><path d="M452 110 C453 116 455 118 461 119 C455 120 453 122 452 128 C451 122 449 120 443 119 C449 118 451 116 452 110Z" fill="#fff" stroke={INK} strokeWidth="1.8" /></g>
      <g className="twinkle" style={{ animationDelay: '1.4s' }}><path d="M300 36 C301 42 303 44 309 45 C303 46 301 48 300 54 C299 48 297 46 291 45 C297 44 299 42 300 36Z" fill="#F6C6CC" stroke={INK} strokeWidth="1.8" /></g>
    </svg>
  );
}

export function Avatar({ style, size = 56, mood = 'happy', title }: { style: AvatarStyle; size?: number; mood?: 'happy' | 'focus'; title?: string }) {
  const hair = style.hair;
  const back: Record<AvatarStyle['hairStyle'], string> = {
    long: 'M26 46 Q24 18 50 17 Q76 18 74 46 L77 82 Q64 76 61 64 L39 64 Q36 76 23 82 Z',
    bob: 'M25 50 Q23 18 50 17 Q77 18 75 50 L76 64 Q70 68 63 63 L37 63 Q30 68 24 64 Z',
    bun: 'M28 44 Q28 20 50 19 Q72 20 72 44 Z',
    ponytail: 'M28 44 Q28 20 50 19 Q72 20 72 44 Z',
    short: 'M28 42 Q28 19 50 18 Q72 19 72 42 Z',
  };
  const fringe: Record<AvatarStyle['hairStyle'], string> = {
    long: 'M28 44 Q30 22 50 22 Q70 22 72 44 Q62 34 54 30 Q46 38 28 44Z',
    bob: 'M27 42 Q29 21 50 21 Q71 21 73 42 L27 42Z',
    bun: 'M29 42 Q31 22 50 22 Q69 22 71 42 Q58 30 50 30 Q42 30 29 42Z',
    ponytail: 'M29 42 Q31 22 50 22 Q69 22 71 42 Q62 28 46 30 Q36 32 29 42Z',
    short: 'M29 40 Q31 21 50 21 Q69 21 71 40 Q64 30 52 32 Q40 28 29 40Z',
  };
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title ?? 'Illustrated avatar'}>
      <rect width="100" height="100" fill="#FFF7DC" />
      <circle cx="82" cy="18" r="10" fill="#FFE08A" opacity="0.7" />
      {style.hairStyle === 'ponytail' && <path d="M70 34 Q88 44 80 70 Q72 58 66 46Z" fill={hair} stroke={INK} strokeWidth="2" strokeLinejoin="round" />}
      {style.hairStyle === 'bun' && <circle cx="50" cy="15" r="9" fill={hair} stroke={INK} strokeWidth="2" />}
      <path d="M18 104 Q18 74 50 72 Q82 74 82 104Z" fill={style.shirt} stroke={INK} strokeWidth="2" />
      <rect x="44" y="60" width="12" height="16" rx="5" fill={style.skin} stroke={INK} strokeWidth="2" />
      <path d={back[style.hairStyle]} fill={hair} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="50" cy="46" rx="21" ry="23" fill={style.skin} stroke={INK} strokeWidth="2" />
      <path d={fringe[style.hairStyle]} fill={hair} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {mood === 'happy' ? (
        <>
          <path d="M39 49 q4 -5 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M53 49 q4 -5 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="43" cy="48" r="2.2" fill={INK} />
          <circle cx="57" cy="48" r="2.2" fill={INK} />
        </>
      )}
      <ellipse cx="37" cy="55" rx="4" ry="2.4" fill="#F6A9B4" opacity="0.85" />
      <ellipse cx="63" cy="55" rx="4" ry="2.4" fill="#F6A9B4" opacity="0.85" />
      <path d="M45 57 q5 5 10 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {style.accessory === 'glasses' && (
        <g fill="none" stroke={INK} strokeWidth="1.8">
          <circle cx="43" cy="48" r="6" />
          <circle cx="57" cy="48" r="6" />
          <path d="M49 48 h2" />
        </g>
      )}
      {style.accessory === 'earrings' && (
        <>
          <circle cx="29" cy="58" r="2.4" fill="#FFE08A" stroke={INK} strokeWidth="1.4" />
          <circle cx="71" cy="58" r="2.4" fill="#FFE08A" stroke={INK} strokeWidth="1.4" />
        </>
      )}
      {style.accessory === 'clip' && <path d="M60 28 l8 -4 l2 4 l-8 4z" fill="#F6C6CC" stroke={INK} strokeWidth="1.4" />}
      {/* headset */}
      <path d="M27 46 Q26 16 50 16 Q74 16 73 46" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="22" y="40" width="9" height="15" rx="4" fill="#FFE08A" stroke={INK} strokeWidth="1.8" />
      <rect x="69" y="40" width="9" height="15" rx="4" fill="#FFE08A" stroke={INK} strokeWidth="1.8" />
      <path d="M27 54 Q28 64 40 62" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="41" cy="62" r="2.4" fill={INK} />
    </svg>
  );
}

export function EmptyIllustration({ size = 180 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 220 176" role="img" aria-label="A headset resting on an open notebook">
      <ellipse cx="110" cy="160" rx="90" ry="10" fill="#EBE7E0" />
      <g transform="rotate(-4 110 120)">
        <path d="M34 110 L110 124 L186 110 L186 150 L110 162 L34 150Z" fill="#FFFDF8" {...S} />
        <path d="M110 124 V162" {...S} />
        <path d="M50 124 l44 7 M50 134 l40 6 M126 131 l44 -7 M126 141 l36 -6" stroke="#D9CFEA" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M62 102 C58 38 162 38 158 102" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M62 102 C58 38 162 38 158 102" fill="none" stroke="#FFE08A" strokeWidth="4" strokeLinecap="round" />
      <rect x="46" y="86" width="26" height="36" rx="12" fill="#F6C6CC" {...S} />
      <rect x="148" y="86" width="26" height="36" rx="12" fill="#F6C6CC" {...S} />
      <path d="M58 120 C60 140 82 142 96 136" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="98" cy="135" r="6" fill={INK} />
      <g className="twinkle"><path d="M184 30 C185 38 188 41 196 42 C188 43 185 46 184 54 C183 46 180 43 172 42 C180 41 183 38 184 30Z" fill="#FFE08A" stroke={INK} strokeWidth="1.8" /></g>
      <g className="twinkle" style={{ animationDelay: '1s' }}><path d="M30 34 C31 40 33 42 39 43 C33 44 31 46 30 52 C29 46 27 44 21 43 C27 42 29 40 30 34Z" fill="#B9D6B0" stroke={INK} strokeWidth="1.8" /></g>
    </svg>
  );
}

export function PlantGrowth({ size = 150, level = 3 }: { size?: number; level?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label="A growing plant">
      <path d="M48 104 h54 l-8 40 h-38z" fill="#F6C6CC" {...S} />
      <path d="M44 100 h62 v10 h-62z" fill="#FAD8DD" {...S} />
      <path d="M75 100 C75 80 75 60 75 40" fill="none" {...S} />
      {level >= 1 && <path d="M75 86 C60 86 50 76 48 64 C62 64 72 72 75 86Z" fill="#B9D6B0" {...S} />}
      {level >= 2 && <path d="M75 72 C90 72 100 62 102 50 C88 50 78 58 75 72Z" fill="#8CC08F" {...S} />}
      {level >= 3 && <path d="M75 52 C64 50 58 40 58 30 C70 32 76 40 75 52Z" fill="#A8CFA0" {...S} />}
      {level >= 3 && <circle cx="75" cy="34" r="9" fill="#FFE08A" {...S} />}
      <g className="twinkle"><path d="M118 26 C119 32 121 34 127 35 C121 36 119 38 118 44 C117 38 115 36 109 35 C115 34 117 32 118 26Z" fill="#FFE08A" stroke={INK} strokeWidth="1.6" /></g>
    </svg>
  );
}

export function AcademyIllustration({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 180 144" role="img" aria-label="A stack of books with a graduation cap">
      <rect x="30" y="100" width="120" height="22" rx="5" fill="#B9D6B0" {...S} />
      <rect x="40" y="78" width="104" height="22" rx="5" fill="#F6C6CC" {...S} />
      <rect x="34" y="56" width="112" height="22" rx="5" fill="#FFE08A" {...S} />
      <path d="M46 67 h60 M52 89 h50 M42 111 h70" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M90 14 L140 32 L90 50 L40 32Z" fill={INK} {...S} />
      <path d="M62 40 v14 q28 14 56 0 v-14" fill="#3A3542" {...S} />
      <path d="M140 32 v22" {...S} />
      <circle cx="140" cy="58" r="5" fill="#FFE08A" {...S} />
    </svg>
  );
}

export function Medal({ tint = 'yellow', size = 76, emoji, locked }: { tint?: string; size?: number; emoji: string; locked?: boolean }) {
  const fills: Record<string, [string, string]> = {
    yellow: ['#FFE08A', '#FFF7DC'],
    pink: ['#F6C6CC', '#FDEEF0'],
    green: ['#B9D6B0', '#EDF5EA'],
    lilac: ['#D8CFF2', '#F3EFFB'],
  };
  const [outer, inner] = fills[tint] ?? fills.yellow;
  return (
    <div style={{ position: 'relative', width: size, height: size + 14 }} aria-hidden>
      <svg width={size} height={size + 14} viewBox="0 0 80 94">
        <path d="M24 60 L16 92 L30 84 L38 94 L42 64Z" fill={locked ? '#EBE7E0' : '#F6C6CC'} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M56 60 L64 92 L50 84 L42 94 L38 64Z" fill={locked ? '#EBE7E0' : '#B9D6B0'} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path
          d="M40 4 L47 9 L55 7 L59 14 L67 16 L67 24 L73 30 L70 37 L73 45 L67 50 L67 58 L59 60 L55 67 L47 65 L40 70 L33 65 L25 67 L21 60 L13 58 L13 50 L7 45 L10 37 L7 30 L13 24 L13 16 L21 14 L25 7 L33 9Z"
          fill={locked ? '#EBE7E0' : outer}
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="40" cy="37" r="22" fill={locked ? '#F5F3EF' : inner} stroke={INK} strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <span style={{ position: 'absolute', left: 0, right: 0, top: size * 0.31, textAlign: 'center', fontSize: size * 0.34, lineHeight: 1 }}>{locked ? '🔒' : emoji}</span>
    </div>
  );
}
