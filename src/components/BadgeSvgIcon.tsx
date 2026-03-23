/**
 * @module BadgeSvgIcon
 *
 * React Native SVG badge icon component — ports the Blue Ridge Mountain animal
 * silhouettes from the web badgeIcons.js to react-native-svg.
 *
 * Each badge is a 48×48 circular frame with a filled animal silhouette.
 * Matches the web design: <circle> background at 12% opacity + <path> fill.
 *
 * hq-zarsg
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// ── Badge SVG data ─────────────────────────────────────────────────────────────
// Paths ported from godfrey/src/public/gamificationTokens.js + badgeIcons.js
// Colors from sharedTokens.js badge palette

interface BadgeSvgData {
  label: string;
  color: string;
  path: string;
}

const BADGE_SVG_DATA: Record<string, BadgeSvgData> = {
  first_step: {
    label: 'Eastern Bluebird',
    color: '#E8634B',
    path:
      'M25 12 C22 11 19 12 18 15 L14 14 C12 13 11 15 13 17 L16 18 ' +
      'C15 21 15 25 17 28 L13 33 L15 35 L19 31 ' +
      'C20 33 22 36 24 37 C26 36 28 33 29 31 L33 35 L35 33 L31 28 ' +
      'C33 25 33 21 32 18 L35 17 C37 15 36 13 34 14 L30 15 ' +
      'C29 12 27 11 25 12Z',
  },
  trail_regular: {
    label: 'Black Bear',
    color: '#3D1C02',
    path:
      'M16 14 C13 12 11 14 12 17 C10 17 9 19 10 21 ' +
      'C8 22 8 25 10 27 L9 32 C9 35 11 37 13 37 L14 40 L16 40 L17 37 ' +
      'L22 38 L24 40 L26 40 L28 38 L33 37 L34 40 L36 40 L37 37 ' +
      'C39 37 41 35 41 32 L40 27 C42 25 42 22 40 21 ' +
      'C41 19 40 17 38 17 C39 14 37 12 34 14 ' +
      'C32 11 29 10 24 10 C20 10 18 11 16 14Z',
  },
  visualizer: {
    label: 'Great Horned Owl',
    color: '#5B8FA8',
    path:
      'M20 8 L19 11 L16 13 C13 15 12 18 14 20 ' +
      'C11 22 11 26 14 27 C12 30 13 34 16 35 L14 39 L17 39 L19 36 ' +
      'C21 38 24 39 27 39 C30 38 33 37 34 36 L36 39 L39 39 L37 35 ' +
      'C40 34 41 30 39 27 C42 26 42 22 39 20 C41 18 40 15 37 13 L34 11 L28 8 ' +
      'L26 11 C25 10 23 10 22 11 Z',
  },
  curator: {
    label: 'Luna Moth',
    color: '#2B5FA5',
    path:
      'M24 15 C22 13 17 11 13 13 C9 15 8 19 10 22 ' +
      'C7 23 6 27 9 29 C7 32 9 36 12 37 L11 40 L13 41 L15 38 ' +
      'C18 40 21 41 24 41 C27 41 30 40 33 38 L35 41 L37 40 L36 37 ' +
      'C39 36 41 32 39 29 C42 27 41 23 38 22 ' +
      'C40 19 39 15 35 13 C31 11 26 13 24 15Z ' +
      'M20 40 C19 43 17 45 16 47 L18 47 L22 42 Z ' +
      'M28 40 C29 43 31 45 32 47 L30 47 L26 42 Z',
  },
  week_wanderer: {
    label: 'Red-Tailed Hawk',
    color: '#C8960C',
    path:
      'M24 10 C22 10 20 12 19 14 L8 11 C6 10 5 13 7 14 L17 18 ' +
      'C15 21 15 26 17 29 L10 35 L12 37 L19 32 ' +
      'C20 35 22 38 24 39 C26 38 28 35 29 32 L36 37 L38 35 L31 29 ' +
      'C33 26 33 21 31 18 L41 14 C43 13 42 10 40 11 L29 14 ' +
      'C28 12 26 10 24 10Z',
  },
  streak_chip: {
    label: 'Sharp-shinned Hawk',
    color: '#D4860A',
    path:
      'M24 9 C21 9 18 11 17 13 L13 12 C11 11 10 13 12 15 L15 16 ' +
      'C14 19 14 22 16 25 L11 29 C9 31 11 34 13 32 L18 28 ' +
      'C19 31 21 34 23 37 L22 40 L24 39 L26 40 L25 37 ' +
      'C27 34 29 31 30 28 L35 32 C37 34 39 31 37 29 L32 25 ' +
      'C34 22 34 19 33 16 L36 15 C38 13 37 11 35 12 L31 13 ' +
      'C30 11 27 9 24 9Z',
  },
};

/** All valid badge keys — useful for iteration and validation. */
export const BADGE_SVG_KEYS = Object.keys(BADGE_SVG_DATA) as Array<keyof typeof BADGE_SVG_DATA>;

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  /** Badge key from BADGE_SVG_DATA (e.g. 'week_wanderer', 'streak_chip'). */
  badgeKey: string;
  /** Icon size in dp. Defaults to 48. */
  size?: number;
  testID?: string;
}

/**
 * Renders a Blue Ridge Mountain animal silhouette as an SVG badge icon.
 * Returns null for unknown badge keys.
 */
export function BadgeSvgIcon({ badgeKey, size = 48, testID }: Props) {
  const data = BADGE_SVG_DATA[badgeKey];
  if (!data) return null;

  return (
    <Svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      accessibilityLabel={data.label}
      testID={testID ?? `badge-svg-${badgeKey}`}
    >
      <Circle cx="24" cy="24" r="22" fill={data.color} opacity={0.12} />
      <Path d={data.path} fill={data.color} />
    </Svg>
  );
}
