import { colors } from '@/theme/tokens';

// ── 7-layer mountain configs (distant → front) ──────────────────────
// baseHeight: fraction of viewBox height where ridge sits (0 = top, 1 = bottom)

export const MOUNTAIN_LAYER_CONFIGS = [
  { name: 'distant', baseHeight: 0.32, seed: 42 },
  { name: 'far', baseHeight: 0.41, seed: 17 },
  { name: 'back', baseHeight: 0.48, seed: 73 },
  { name: 'mid-far', baseHeight: 0.55, seed: 29 },
  { name: 'mid', baseHeight: 0.62, seed: 61 },
  { name: 'mid-near', baseHeight: 0.72, seed: 88 },
  { name: 'front', baseHeight: 0.8, seed: 55 },
] as const;

// Atmospheric opacity ramp: distant (faint) → front (solid)
export const STANDARD_OPACITIES = [0.12, 0.18, 0.25, 0.38, 0.5, 0.68, 0.85];
export const TRANSPARENT_OPACITIES = [0.12, 0.18, 0.28, 0.35, 0.42, 0.52, 0.6];

// Standard layer colors: distant blue haze → espresso foreground
export const STANDARD_LAYER_COLORS = [
  colors.mountainBlue,
  colors.mountainBlue,
  colors.espresso,
  colors.espresso,
  colors.espresso,
  colors.espresso,
  colors.espresso,
];

export const TRANSPARENT_LAYER_COLORS = [
  colors.mountainBlueLight,
  colors.mountainBlueLight,
  colors.mountainBlueLight,
  colors.sandBase,
  colors.sandBase,
  colors.espressoLight,
  colors.espressoLight,
];

// ── Multi-stop gradient presets (5-6 stops for rich sky) ─────────────

export interface GradientStop {
  offset: string;
  color: string;
  opacity: number;
}

export const GRADIENT_PRESETS_MULTI: Record<string, GradientStop[]> = {
  sunrise: [
    { offset: '0%', color: colors.skyGradientTop, opacity: 1 },
    { offset: '20%', color: colors.mountainBlueLight, opacity: 0.9 },
    { offset: '45%', color: colors.skyGradientBottom, opacity: 0.7 },
    { offset: '70%', color: colors.sandLight, opacity: 0.8 },
    { offset: '85%', color: colors.sunsetCoralLight, opacity: 0.5 },
    { offset: '100%', color: colors.sandLight, opacity: 0.6 },
  ],
  sunset: [
    { offset: '0%', color: colors.mountainBlueDark, opacity: 0.6 },
    { offset: '15%', color: colors.sunsetCoral, opacity: 0.7 },
    { offset: '35%', color: colors.skyGradientBottom, opacity: 0.8 },
    { offset: '55%', color: colors.sunsetCoralLight, opacity: 0.7 },
    { offset: '80%', color: colors.sunsetCoralLight, opacity: 0.5 },
    { offset: '100%', color: colors.sandLight, opacity: 0.4 },
  ],
};

// ── Seeded pseudo-random for deterministic path wobble ───────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── C-curve bezier mountain path generator ───────────────────────────

export function buildCBezierMountainPath(
  vbH: number,
  baseHeightFraction: number,
  seed: number,
  vbW: number = 1440,
  segments: number = 10,
): string {
  const rand = seededRandom(seed);
  const baseY = vbH * baseHeightFraction;
  const amplitude = vbH * 0.15;
  const segWidth = vbW / segments;

  let d = `M0,${vbH} L0,${Math.round(baseY)}`;

  for (let i = 0; i < segments; i++) {
    const x3 = (i + 1) * segWidth;
    const x0 = i * segWidth;
    const wobble1 = (rand() - 0.5) * amplitude;
    const wobble2 = (rand() - 0.5) * amplitude;
    const wobble3 = (rand() - 0.5) * amplitude * 0.8;
    const cp1x = x0 + segWidth * 0.33;
    const cp1y = baseY + wobble1;
    const cp2x = x0 + segWidth * 0.66;
    const cp2y = baseY + wobble2;
    const endY = baseY + wobble3;
    d += ` C${Math.round(cp1x)},${Math.round(cp1y)} ${Math.round(cp2x)},${Math.round(cp2y)} ${Math.round(x3)},${Math.round(endY)}`;
  }

  d += ` L${vbW},${vbH} Z`;
  return d;
}

// ── Compact path builder for small illustrations (280×200) ───────────

export function buildSmallMountainPath(
  vbW: number,
  vbH: number,
  baseHeightFraction: number,
  seed: number,
  segments: number = 6,
): string {
  return buildCBezierMountainPath(vbH, baseHeightFraction, seed, vbW, segments);
}

// ── Detail element builders ──────────────────────────────────────────

export interface BirdConfig {
  path: string;
  strokeWidth: number;
  x: number;
  y: number;
}

export function buildBirds(vbW: number, vbH: number): BirdConfig[] {
  const spread = vbW / 5;
  return [
    { path: `M${spread},${vbH * 0.18} C${spread + 5},${vbH * 0.15} ${spread + 10},${vbH * 0.14} ${spread + 15},${vbH * 0.16} C${spread + 20},${vbH * 0.14} ${spread + 25},${vbH * 0.15} ${spread + 30},${vbH * 0.18}`, strokeWidth: 1.2, x: spread, y: vbH * 0.18 },
    { path: `M${spread * 2.5},${vbH * 0.13} C${spread * 2.5 + 4},${vbH * 0.1} ${spread * 2.5 + 7},${vbH * 0.09} ${spread * 2.5 + 10},${vbH * 0.11} C${spread * 2.5 + 13},${vbH * 0.09} ${spread * 2.5 + 16},${vbH * 0.1} ${spread * 2.5 + 20},${vbH * 0.13}`, strokeWidth: 1.0, x: spread * 2.5, y: vbH * 0.13 },
    { path: `M${spread * 3.5},${vbH * 0.2} C${spread * 3.5 + 3},${vbH * 0.18} ${spread * 3.5 + 5},${vbH * 0.17} ${spread * 3.5 + 8},${vbH * 0.19} C${spread * 3.5 + 11},${vbH * 0.17} ${spread * 3.5 + 13},${vbH * 0.18} ${spread * 3.5 + 16},${vbH * 0.2}`, strokeWidth: 0.8, x: spread * 3.5, y: vbH * 0.2 },
    { path: `M${spread * 4},${vbH * 0.15} C${spread * 4 + 3},${vbH * 0.13} ${spread * 4 + 6},${vbH * 0.12} ${spread * 4 + 8},${vbH * 0.14} C${spread * 4 + 10},${vbH * 0.12} ${spread * 4 + 13},${vbH * 0.13} ${spread * 4 + 16},${vbH * 0.15}`, strokeWidth: 0.9, x: spread * 4, y: vbH * 0.15 },
  ];
}

export interface TreeConfig {
  trunk: { x: number; y: number; width: number; height: number };
  canopyLayers: { path: string; opacity: number }[];
}

export function buildPineTrees(vbW: number, vbH: number): TreeConfig[] {
  const positions = [vbW * 0.14, vbW * 0.65, vbW * 0.85];
  return positions.map((x) => {
    const trunkH = vbH * 0.15;
    const trunkW = vbW * 0.003;
    const trunkY = vbH * 0.7;
    const spread = vbW * 0.014;
    return {
      trunk: { x, y: trunkY, width: trunkW, height: trunkH },
      canopyLayers: [
        { path: `M${x - spread},${trunkY + trunkH * 0.35} C${x - spread * 0.5},${trunkY - trunkH * 0.1} ${x + spread * 0.5},${trunkY - trunkH * 0.1} ${x + spread},${trunkY + trunkH * 0.35}`, opacity: 0.45 },
        { path: `M${x - spread * 0.8},${trunkY + trunkH * 0.2} C${x - spread * 0.3},${trunkY - trunkH * 0.25} ${x + spread * 0.3},${trunkY - trunkH * 0.25} ${x + spread * 0.8},${trunkY + trunkH * 0.2}`, opacity: 0.55 },
        { path: `M${x - spread * 0.6},${trunkY + trunkH * 0.05} C${x - spread * 0.15},${trunkY - trunkH * 0.35} ${x + spread * 0.15},${trunkY - trunkH * 0.35} ${x + spread * 0.6},${trunkY + trunkH * 0.05}`, opacity: 0.65 },
      ],
    };
  });
}

export interface FloraConfig {
  stem: { x1: number; y1: number; x2: number; y2: number; strokeWidth: number };
  bloom: { cx: number; cy: number; r: number; color: string };
}

export function buildFlora(vbW: number, vbH: number): FloraConfig[] {
  const positions = [
    { x: vbW * 0.1, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.11, bloomColor: colors.sandBase },
    { x: vbW * 0.47, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.49, bloomColor: colors.mountainBlueLight },
    { x: vbW * 0.9, bloomColor: colors.sunsetCoral },
    { x: vbW * 0.92, bloomColor: colors.sandBase },
  ];
  return positions.map(({ x, bloomColor }) => ({
    stem: { x1: x, y1: vbH * 0.9, x2: x + 1, y2: vbH * 0.84, strokeWidth: 1 },
    bloom: { cx: x, cy: vbH * 0.83, r: vbW * 0.002 + 1.5, color: bloomColor },
  }));
}
