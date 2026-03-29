/**
 * @module livingSky
 * @description Core interpolation engine for the Living Blue Ridge Sky.
 * Pure TypeScript — no DOM or React Native dependencies, fully testable.
 *
 * Ported from cfutons/src/public/living-sky.js (Phase 7 engine).
 * The 16-keyframe tables are the canonical source of truth for all sky state.
 *
 * Exports:
 *   computeLivingSky(totalMinutes, opts?) → LivingSkyState
 *   getSeason(date?) → Season
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type AnimationHint = 'slow-drift' | 'flicker' | 'shimmer' | null;
export type PrecipType = 'snow' | 'mist' | 'none';

export interface SunPos {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}

export interface MoonPos {
  cx: number;
  cy: number;
  opacity: number;
  phase: number;
  shadowOffset: { dx: number; dy: number };
}

export interface RidgeColors {
  r1: string;
  r2: string;
  r3: string;
  r4: string;
  tree: string;
}

export interface LivingSkyState {
  skyColors: [string, string, string, string];
  glowColors: [string, string];
  ridgeColors: RidgeColors;
  sunPos: SunPos;
  moonPos: MoonPos;
  starOpacity: number;
  cloudOpacity: number;
  birdOpacity: number;
  fireflyOpacity: number;
  owlOpacity: number;
  rimOpacity: number;
  rimColor: string;
  navBg: string;
  navText: string;
  season: Season;
  precipitationOpacity: number;
  precipitationType: PrecipType;
  weatherLabel: string;
  animationHint: AnimationHint;
}

// ── Sky table — 16 keyframes × sky/glow/sun/wildlife state ───────────────────

interface SkyKeyframe {
  h: number;
  sky: [string, string, string, string];
  glow: [string, string];
  sunCX: number; sunCY: number; sunR: number; sunOp: number;
  starOp: number; moonOp: number; cloudOp: number; birdOp: number;
  rimOp: number; rimCol: string;
  navBg: string; navText: string;
  fireflyOp: number; owlOp: number;
}

const SKY_TABLE: SkyKeyframe[] = [
  { h: 0,    sky: ['#050810','#080D1C','#0D1628','#141E30'], glow: ['transparent','transparent'], sunCX:520,  sunCY:220, sunR:14, sunOp:0,    starOp:0.9,  moonOp:1,    cloudOp:0,    birdOp:0,    rimOp:0.12, rimCol:'#4A6E8A', navBg:'#0A0F1C', navText:'#8BAFC8', fireflyOp:0.55, owlOp:0.9  },
  { h: 4,    sky: ['#050810','#080D1C','#0D1628','#141E30'], glow: ['transparent','transparent'], sunCX:520,  sunCY:220, sunR:14, sunOp:0,    starOp:0.85, moonOp:0.9,  cloudOp:0,    birdOp:0,    rimOp:0.12, rimCol:'#4A6E8A', navBg:'#0A0F1C', navText:'#8BAFC8', fireflyOp:0.4,  owlOp:0.85 },
  { h: 5,    sky: ['#18182A','#301830','#D07858','#F0A858'], glow: ['#E89050','#D06828'],          sunCX:70,   sunCY:148, sunR:12, sunOp:0.65, starOp:0.25, moonOp:0.15, cloudOp:0.55, birdOp:0,    rimOp:0.25, rimCol:'#F0A060', navBg:'#1A100C', navText:'#C8A880', fireflyOp:0.1,  owlOp:0.5  },
  { h: 6,    sky: ['#2A2440','#5A4060','#E89060','#F8C060'], glow: ['#F8C840','#E07820'],          sunCX:150,  sunCY:138, sunR:13, sunOp:0.8,  starOp:0.05, moonOp:0,    cloudOp:0.85, birdOp:0,    rimOp:0.35, rimCol:'#F8A050', navBg:'#1E150C', navText:'#D4B888', fireflyOp:0,    owlOp:0.15 },
  { h: 7,    sky: ['#607888','#8AA0B0','#BED0DC','#D4E4F0'], glow: ['#F8E8C8','#E8D0A0'],          sunCX:220,  sunCY:128, sunR:14, sunOp:0.9,  starOp:0,    moonOp:0,    cloudOp:0.7,  birdOp:0,    rimOp:0.3,  rimCol:'#F8E0A8', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 8.5,  sky: ['#4A6A88','#7090A8','#A8C4D8','#C4D8EC'], glow: ['#F0E4C0','#E0C880'],          sunCX:300,  sunCY:108, sunR:14, sunOp:0.95, starOp:0,    moonOp:0,    cloudOp:0.28, birdOp:0,    rimOp:0.18, rimCol:'#F8E8C0', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 10,   sky: ['#3860A0','#608098','#98B8CC','#B4CCE0'], glow: ['transparent','transparent'], sunCX:410,  sunCY:74,  sunR:15, sunOp:1,    starOp:0,    moonOp:0,    cloudOp:0,    birdOp:0,    rimOp:0.08, rimCol:'#FFFAE0', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 12,   sky: ['#2858A0','#4878A8','#88B0C4','#A4C8DC'], glow: ['transparent','transparent'], sunCX:524,  sunCY:52,  sunR:16, sunOp:1,    starOp:0,    moonOp:0,    cloudOp:0,    birdOp:0,    rimOp:0.04, rimCol:'#FFFCE8', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 14,   sky: ['#3060A8','#588898','#90B4C8','#ACCCE0'], glow: ['transparent','transparent'], sunCX:658,  sunCY:70,  sunR:15, sunOp:1,    starOp:0,    moonOp:0,    cloudOp:0,    birdOp:0,    rimOp:0.06, rimCol:'#FFFCE8', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 16,   sky: ['#385A98','#607C98','#98B0C0','#B4C8D8'], glow: ['transparent','transparent'], sunCX:768,  sunCY:94,  sunR:15, sunOp:1,    starOp:0,    moonOp:0,    cloudOp:0,    birdOp:0,    rimOp:0.12, rimCol:'#F8E8C0', navBg:'#ffffff',  navText:'#1E2A3A', fireflyOp:0,    owlOp:0    },
  { h: 17.5, sky: ['#2C2458','#6C3868','#C86040','#F0A030'], glow: ['#FFD840','#E05800'],          sunCX:848,  sunCY:116, sunR:17, sunOp:1,    starOp:0,    moonOp:0,    cloudOp:0,    birdOp:0.7,  rimOp:0.7,  rimCol:'#FF9010', navBg:'#F5EFE6', navText:'#3D2310', fireflyOp:0,    owlOp:0    },
  { h: 18.5, sky: ['#201840','#5C2C60','#C85038','#F08828'], glow: ['#FFD050','#E05000'],          sunCX:920,  sunCY:140, sunR:18, sunOp:0.95, starOp:0,    moonOp:0,    cloudOp:0,    birdOp:1,    rimOp:0.95, rimCol:'#FF7010', navBg:'#F5EFE6', navText:'#3D2310', fireflyOp:0.08, owlOp:0    },
  { h: 19.5, sky: ['#100E1E','#381630','#801C20','#C04020'], glow: ['#E05018','#A03010'],          sunCX:985,  sunCY:155, sunR:13, sunOp:0.3,  starOp:0.2,  moonOp:0.5,  cloudOp:0,    birdOp:0.25, rimOp:0.2,  rimCol:'#E06018', navBg:'#160A08', navText:'#C8A880', fireflyOp:0.6,  owlOp:0.25 },
  { h: 20.5, sky: ['#070B14','#0E1422','#181E2E','#20283A'], glow: ['transparent','transparent'], sunCX:1060, sunCY:220, sunR:12, sunOp:0,    starOp:0.55, moonOp:0.88, cloudOp:0,    birdOp:0,    rimOp:0.14, rimCol:'#3C608A', navBg:'#0C1020', navText:'#8BAFC8', fireflyOp:0.85, owlOp:0.65 },
  { h: 22,   sky: ['#050810','#080D1C','#0D1628','#141E30'], glow: ['transparent','transparent'], sunCX:1060, sunCY:220, sunR:12, sunOp:0,    starOp:0.85, moonOp:1,    cloudOp:0,    birdOp:0,    rimOp:0.15, rimCol:'#4A6E8A', navBg:'#080D18', navText:'#8BAFC8', fireflyOp:0.7,  owlOp:1    },
  { h: 24,   sky: ['#050810','#080D1C','#0D1628','#141E30'], glow: ['transparent','transparent'], sunCX:520,  sunCY:220, sunR:14, sunOp:0,    starOp:0.9,  moonOp:1,    cloudOp:0,    birdOp:0,    rimOp:0.15, rimCol:'#4A6E8A', navBg:'#080D18', navText:'#8BAFC8', fireflyOp:0.55, owlOp:0.9  },
];

// ── Ridge table — 16 keyframes ────────────────────────────────────────────────

interface RidgeKeyframe {
  h: number;
  r1: string; r2: string; r3: string; r4: string; tree: string;
}

const RIDGE_TABLE: RidgeKeyframe[] = [
  { h: 0,    r4:'#3C4E6A', r3:'#283860', r2:'#162850', r1:'#0C1838', tree:'#080E1E' },
  { h: 4,    r4:'#3A4C68', r3:'#26365E', r2:'#14264C', r1:'#0A1636', tree:'#070D1C' },
  { h: 5,    r4:'#C888A8', r3:'#9A6080', r2:'#6C3060', r1:'#3A1040', tree:'#1A0620' },
  { h: 6,    r4:'#B87E98', r3:'#8A5070', r2:'#5C2450', r1:'#32103C', tree:'#160820' },
  { h: 7,    r4:'#96B8C8', r3:'#6A90A8', r2:'#426874', r1:'#224850', tree:'#101E28' },
  { h: 8.5,  r4:'#90B4C2', r3:'#648CA0', r2:'#3C6470', r1:'#1E444C', tree:'#0E1C24' },
  { h: 10,   r4:'#B4D0E0', r3:'#80A8C4', r2:'#4A7898', r1:'#1E4858', tree:'#0E1E28' },
  { h: 12,   r4:'#AECCD8', r3:'#7AA4BE', r2:'#487494', r1:'#1C4454', tree:'#0C1C26' },
  { h: 14,   r4:'#B0CED8', r3:'#7CA2BA', r2:'#4A7490', r1:'#1E4452', tree:'#0E1E28' },
  { h: 16,   r4:'#A8C8D8', r3:'#7498B2', r2:'#466E98', r1:'#205080', tree:'#102030' },
  { h: 17.5, r4:'#8860A0', r3:'#602870', r2:'#3E0850', r1:'#1C0430', tree:'#0C0218' },
  { h: 18.5, r4:'#703480', r3:'#4C1468', r2:'#300850', r1:'#140230', tree:'#080118' },
  { h: 19.5, r4:'#3A1C40', r3:'#26102E', r2:'#160820', r1:'#0A0412', tree:'#04020A' },
  { h: 20.5, r4:'#2C3858', r3:'#1C2848', r2:'#0E1838', r1:'#081026', tree:'#050C16' },
  { h: 21,   r4:'#2E3E5E', r3:'#1E2E54', r2:'#121E44', r1:'#0A1430', tree:'#060C1E' },
  { h: 24,   r4:'#3C4E6A', r3:'#283860', r2:'#162850', r1:'#0C1838', tree:'#080E1E' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parseColor(c: string): [number, number, number, number] {
  if (!c || c === 'transparent') return [0, 0, 0, 0];
  const rgba = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return [
      parseInt(rgba[1], 10),
      parseInt(rgba[2], 10),
      parseInt(rgba[3], 10),
      rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
    ];
  }
  const hex = c.replace('#', '');
  if (hex.length === 3) {
    return [parseInt(hex[0]+hex[0],16), parseInt(hex[1]+hex[1],16), parseInt(hex[2]+hex[2],16), 1];
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16), 1];
  }
  if (hex.length === 8) {
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16), parseInt(hex.slice(6,8),16)/255];
  }
  return [0, 0, 0, 1];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const p1 = parseColor(c1), p2 = parseColor(c2);
  const r = Math.round(lerp(p1[0], p2[0], t));
  const g = Math.round(lerp(p1[1], p2[1], t));
  const b = Math.round(lerp(p1[2], p2[2], t));
  const a = lerp(p1[3], p2[3], t);
  if (a < 0.01) return 'transparent';
  if (a > 0.98) return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

function getInterpolated<T extends { h: number }>(table: T[], hour: number): { a: T; b: T; t: number } {
  let i = 0;
  while (i < table.length - 1 && table[i + 1].h <= hour) i++;
  const a = table[i];
  const b = table[Math.min(i + 1, table.length - 1)];
  const t = (b.h === a.h) ? 1 : (hour - a.h) / (b.h - a.h);
  return { a, b, t };
}

// ── Moon phase ────────────────────────────────────────────────────────────────

const KNOWN_NEW_MOON = new Date('2025-01-29T12:36:00Z').getTime();
const LUNAR_CYCLE = 29.53058867;

function getMoonPhase(date: Date): number {
  const diff = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  return ((diff % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
}

function moonShadowOffset(phase: number): number {
  const angle = (phase / LUNAR_CYCLE) * Math.PI * 2;
  const illum = (1 - Math.cos(angle)) / 2;
  return (1 - illum * 2) * 14;
}

function computeMoonPosition(hour: number): { cx: number; cy: number } {
  let moonAngle = 0;
  if (hour >= 18 || hour < 6) {
    const moonHour = hour >= 18 ? hour - 18 : hour + 6;
    moonAngle = (moonHour / 12) * Math.PI;
  }
  const cx = 520 + Math.cos(Math.PI - moonAngle) * 320;
  const cy = 140 - Math.sin(moonAngle) * 110;
  return { cx, cy };
}

// ── Season ────────────────────────────────────────────────────────────────────

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

// ── Seasonal ridge modifier ───────────────────────────────────────────────────

const FALL_WARMTH:  Record<string, number> = { r1: 0.85, r2: 0.65, r3: 0.35, r4: 0.12 };
const WINTER_FADE:  Record<string, number> = { r1: 0.5,  r2: 0.45, r3: 0.35, r4: 0.2  };

function seasonalColor(hex: string, element: string, season: Season): string {
  if (season === 'summer') return hex;
  const [r, g, b, a] = parseColor(hex);
  if (a < 0.01) return hex;
  if (season === 'fall') {
    const w = FALL_WARMTH[element] ?? 0.12;
    return `rgb(${Math.min(255, Math.round(r + 70 * w))},${Math.round(g * (1 - 0.25 * w))},${Math.round(b * (1 - 0.55 * w))})`;
  }
  if (season === 'winter') {
    const avg = (r + g + b) / 3;
    const f = WINTER_FADE[element] ?? 0.2;
    return `rgb(${Math.min(255, Math.round(lerp(r, avg, f) + 18))},${Math.min(255, Math.round(lerp(g, avg, f) + 18))},${Math.min(255, Math.round(lerp(b, avg, f) + 28))})`;
  }
  // spring
  return `rgb(${Math.max(0, Math.round(r - 8))},${Math.min(255, Math.round(g + 18))},${Math.round(b)})`;
}

// ── Precipitation ─────────────────────────────────────────────────────────────

function computePrecipitation(season: Season, cloudOpacity: number, hour: number): { type: PrecipType; opacity: number } {
  if (season === 'winter' && cloudOpacity > 0) {
    return { type: 'snow', opacity: Math.max(0, 0.55 - Math.abs(hour - 12) * 0.02) };
  }
  if (season === 'spring' && cloudOpacity > 0.4) {
    return { type: 'mist', opacity: 0.38 };
  }
  return { type: 'none', opacity: 0 };
}

// ── Animation / weather labels ────────────────────────────────────────────────


function computeAnimationHint(hour: number, precipType: PrecipType, fireflyOpacity: number, cloudOpacity: number): AnimationHint {
  if (precipType !== 'none') return 'shimmer';
  if (fireflyOpacity > 0.3)  return 'flicker';
  if (cloudOpacity > 0.5 || (hour >= 17 && hour < 19)) return 'slow-drift';
  return null;
}

function computeWeatherLabel(hour: number, season: Season, precipType: PrecipType): string {
  if (precipType === 'snow') return 'winter snow drifting through the mountain hollows';
  if (precipType === 'mist') return 'mist rising off the ridge';
  if (hour < 5)  return 'still night over the Blue Ridge';
  if (hour < 7)  return season === 'winter' ? 'cold mountain dawn' : 'misty mountain dawn';
  if (hour < 10) return 'crisp mountain morning';
  if (hour < 14) return 'clear Blue Ridge afternoon';
  if (hour < 17) return 'hazy afternoon over the ridge';
  if (hour < 19) return 'golden hour on the mountain';
  if (hour < 21) return 'mountain dusk settling in';
  return 'night over the Blue Ridge';
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface ComputeLivingSkyOptions {
  isCFPlus?: boolean;
}

/**
 * Compute the full LivingSkyState for a given time of day.
 *
 * @param totalMinutes - Minutes since midnight (0..1440). Wraps automatically.
 * @param opts.isCFPlus - CF+ perk: golden hour appears 60 min earlier.
 */
export function computeLivingSky(totalMinutes: number, { isCFPlus = false }: ComputeLivingSkyOptions = {}): LivingSkyState {
  if (typeof totalMinutes !== 'number' || !Number.isFinite(totalMinutes)) {
    throw new TypeError(`computeLivingSky: totalMinutes must be a finite number, got ${totalMinutes}`);
  }
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const effectiveMins = isCFPlus ? (((mins - 60) % 1440) + 1440) % 1440 : mins;
  const hour = effectiveMins / 60;

  const now = new Date();
  const season = getSeason(now);

  // Sky interpolation
  const { a: sa, b: sb, t: st } = getInterpolated(SKY_TABLE, hour);

  const skyColors: [string, string, string, string] = [
    lerpColor(sa.sky[0], sb.sky[0], st),
    lerpColor(sa.sky[1], sb.sky[1], st),
    lerpColor(sa.sky[2], sb.sky[2], st),
    lerpColor(sa.sky[3], sb.sky[3], st),
  ];
  const glowColors: [string, string] = [
    lerpColor(sa.glow[0], sb.glow[0], st),
    lerpColor(sa.glow[1], sb.glow[1], st),
  ];

  const sunPos: SunPos = {
    cx:      lerp(sa.sunCX, sb.sunCX, st),
    cy:      lerp(sa.sunCY, sb.sunCY, st),
    r:       lerp(sa.sunR,  sb.sunR,  st),
    opacity: lerp(sa.sunOp, sb.sunOp, st),
  };

  const starOpacity    = lerp(sa.starOp,    sb.starOp,    st);
  const cloudOpacity   = lerp(sa.cloudOp,   sb.cloudOp,   st);
  const birdOpacity    = lerp(sa.birdOp,    sb.birdOp,    st);
  const fireflyOpacity = lerp(sa.fireflyOp, sb.fireflyOp, st);
  const owlOpacity     = lerp(sa.owlOp,     sb.owlOp,     st);
  const rimOpacity     = lerp(sa.rimOp,     sb.rimOp,     st);
  const rimColor       = lerpColor(sa.rimCol,  sb.rimCol,  st);
  const navBg          = lerpColor(sa.navBg,   sb.navBg,   st);
  const navText        = lerpColor(sa.navText, sb.navText, st);

  // Ridge interpolation
  const { a: ra, b: rb, t: rt } = getInterpolated(RIDGE_TABLE, hour);
  const ridgeColors: RidgeColors = {
    r1:   seasonalColor(lerpColor(ra.r1,   rb.r1,   rt), 'r1',   season),
    r2:   seasonalColor(lerpColor(ra.r2,   rb.r2,   rt), 'r2',   season),
    r3:   seasonalColor(lerpColor(ra.r3,   rb.r3,   rt), 'r3',   season),
    r4:   seasonalColor(lerpColor(ra.r4,   rb.r4,   rt), 'r4',   season),
    tree: lerpColor(ra.tree, rb.tree, rt),
  };

  // Moon
  const moonPhase = getMoonPhase(now);
  const { cx: moonCx, cy: moonCy } = computeMoonPosition(hour);
  const moonPos: MoonPos = {
    cx: moonCx,
    cy: moonCy,
    opacity: lerp(sa.moonOp, sb.moonOp, st),
    phase: moonPhase,
    shadowOffset: { dx: moonShadowOffset(moonPhase), dy: 0 },
  };

  const precip = computePrecipitation(season, cloudOpacity, hour);
  const weatherLabel  = computeWeatherLabel(hour, season, precip.type);
  const animationHint = computeAnimationHint(hour, precip.type, fireflyOpacity, cloudOpacity);

  return {
    skyColors,
    glowColors,
    ridgeColors,
    sunPos,
    moonPos,
    starOpacity,
    cloudOpacity,
    birdOpacity,
    fireflyOpacity,
    owlOpacity,
    rimOpacity,
    rimColor,
    navBg,
    navText,
    season,
    precipitationOpacity: precip.opacity,
    precipitationType: precip.type,
    weatherLabel,
    animationHint,
  };
}
