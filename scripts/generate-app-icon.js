#!/usr/bin/env node
/* eslint-env node */
/**
 * generate-app-icon.js
 *
 * Generates the Carolina Futons mobile app icon SVG using the same
 * 4-ridge atmospheric-perspective mountain language as the web illustrations.
 *
 * Outputs:
 *   assets/icon-master.svg   — 1024×1024 source SVG
 *   assets/icon.png          — 1024×1024 PNG (iOS / Android)
 *   assets/adaptive-icon.png — 1024×1024 PNG (Android adaptive icon foreground)
 *   assets/favicon.png       — 48×48 PNG (web)
 *
 * Requires: rsvg-convert (brew install librsvg)
 *
 * hq-z90wy
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Brand colors (from src/theme/tokens.ts) ──────────────────────────
const C = {
  mountainBlue: '#5B8FA8',
  mountainBlueDark: '#3D6B80',
  mountainBlueLight: '#A8CCD8',
  espresso: '#3A2518',
  espressoLight: '#5C4033',
  sandBase: '#E8D5B7',
  sunsetCoralLight: '#F2A882',
  skyGradientTop: '#B8D4E3',
  skyGradientBottom: '#F0C87A',
};

// ── Seeded PRNG (mirrors seededRandom in shared.ts) ───────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── C-bezier mountain path (mirrors buildCBezierMountainPath) ─────────
function buildMountainPath(vbH, baseHeightFraction, seed, vbW, segments) {
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

// ── 4-ridge selection (matches MOUNTAIN_LAYER_CONFIGS indices 3-6) ────
// mid-far → mid → mid-near → front for strong silhouette at icon sizes
const RIDGES = [
  { name: 'mid-far', baseHeight: 0.44, seed: 29, color: C.mountainBlue, opacity: 0.42 },
  { name: 'mid', baseHeight: 0.55, seed: 61, color: C.mountainBlue, opacity: 0.6 },
  { name: 'mid-near', baseHeight: 0.66, seed: 88, color: C.espressoLight, opacity: 0.78 },
  { name: 'front', baseHeight: 0.76, seed: 55, color: C.espresso, opacity: 0.92 },
];

// ── SVG generator ────────────────────────────────────────────────────
function generateSVG(vbW, vbH, segments) {
  const ridgePaths = RIDGES.map((r) => {
    const d = buildMountainPath(vbH, r.baseHeight, r.seed, vbW, segments);
    return `    <path d="${d}" fill="${r.color}" fill-opacity="${r.opacity}" />`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${vbW}" height="${vbH}"
     viewBox="0 0 ${vbW} ${vbH}">
  <defs>
    <!-- Golden-hour sky gradient: cool blue apex → warm coral/sand horizon -->
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${C.skyGradientTop}"    stop-opacity="1" />
      <stop offset="25%"  stop-color="${C.mountainBlueLight}" stop-opacity="0.85" />
      <stop offset="55%"  stop-color="${C.skyGradientBottom}" stop-opacity="1" />
      <stop offset="78%"  stop-color="${C.sunsetCoralLight}"  stop-opacity="0.90" />
      <stop offset="100%" stop-color="${C.sandBase}"          stop-opacity="1" />
    </linearGradient>
  </defs>

  <!-- Sky background -->
  <rect width="${vbW}" height="${vbH}" fill="url(#sky)" />

  <!-- 4-ridge atmospheric mountain silhouette (distant → foreground) -->
${ridgePaths}
</svg>
`;
}

// ── PNG export via rsvg-convert ───────────────────────────────────────
function exportPng(svgPath, destPath, size) {
  try {
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), svgPath, '-o', destPath]);
    console.log(`  ✓ ${path.basename(destPath)} (${size}×${size})`);
  } catch (e) {
    console.error(`  ✗ PNG export failed for ${destPath}: ${e.message}`);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────
const repoRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(repoRoot, 'assets');

const svgPath = path.join(assetsDir, 'icon-master.svg');
const iconPath = path.join(assetsDir, 'icon.png');
const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
const faviconPath = path.join(assetsDir, 'favicon.png');

console.log('Generating icon-master.svg…');
// 1024×1024 viewBox, 14 segments for smooth curves at this scale
const svg = generateSVG(1024, 1024, 14);
fs.writeFileSync(svgPath, svg, 'utf8');
console.log(`  ✓ icon-master.svg`);

console.log('Exporting PNGs via rsvg-convert…');
exportPng(svgPath, iconPath, 1024);
exportPng(svgPath, adaptivePath, 1024);
exportPng(svgPath, faviconPath, 48);

console.log('\nDone. Icon assets updated in assets/.');
