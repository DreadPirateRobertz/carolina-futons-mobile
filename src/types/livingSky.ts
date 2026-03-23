/**
 * LivingSkyState — finalized interface per melania (hq-wisp-aojs).
 * Produced by useLivingSky() (bishop's hq-u0aqm hook).
 * Consumed by LivingSkyMountainSkyline renderer (ripley's hq-tvwtf).
 */

export interface LivingSkyState {
  /** 4 sky gradient stops, top→bottom */
  skyColors: [string, string, string, string];
  /** Sun/moon glow radial gradient: [inner, outer] */
  glowColors: [string, string];
  /** Ridge fill colors + foreground tree color */
  ridgeColors: { r1: string; r2: string; r3: string; r4: string; tree: string };
  /** Sun position, radius, and opacity (0 = night/set) */
  sunPos: { cx: number; cy: number; r: number; opacity: number };
  /** Moon position, opacity, phase (0=new, 0.5=full), and shadow offset for crescent */
  moonPos: {
    cx: number;
    cy: number;
    opacity: number;
    phase: number;
    shadowOffset: { dx: number; dy: number };
  };
  starOpacity: number;
  cloudOpacity: number;
  birdOpacity: number;
  fireflyOpacity: number;
  owlOpacity: number;
  /** Ridge-top rim light opacity (dawn/golden hour) */
  rimOpacity: number;
  rimColor: string;
  /** Nav bar background color (follows time-of-day palette) */
  navBg: string;
  /** Nav bar text color */
  navText: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  /** 0–1 opacity for precipitation overlay */
  precipitationOpacity: number;
  /** 'snow' | 'mist' | 'none' */
  precipitationType: 'snow' | 'mist' | 'none';
}

/** Midday summer state — used as default before useLivingSky hook lands */
export const DEFAULT_SKY_STATE: LivingSkyState = {
  skyColors: ['#87CEEB', '#A8D8EA', '#C5E8F5', '#D8EFF8'],
  glowColors: ['rgba(255,200,100,0.4)', 'rgba(255,200,100,0)'],
  ridgeColors: {
    r1: '#2D4A3E',
    r2: '#3D5C6E',
    r3: '#5B8FA8',
    r4: '#8BB5C9',
    tree: '#1E3329',
  },
  sunPos: { cx: 520, cy: 20, r: 14, opacity: 1 },
  moonPos: { cx: -100, cy: 30, opacity: 0, phase: 0.5, shadowOffset: { dx: 0, dy: 0 } },
  starOpacity: 0,
  cloudOpacity: 0.15,
  birdOpacity: 0.3,
  fireflyOpacity: 0,
  owlOpacity: 0,
  rimOpacity: 0,
  rimColor: '#FFD080',
  navBg: '#1A3A4A',
  navText: '#E8D5B7',
  season: 'summer',
  precipitationOpacity: 0,
  precipitationType: 'none',
};
