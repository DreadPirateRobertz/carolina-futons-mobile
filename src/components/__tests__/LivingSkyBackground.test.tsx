/**
 * @module LivingSkyBackground.test
 *
 * TDD tests for LivingSkyBackground component.
 * Phase 7 — cf-2le
 *
 * Covers:
 *  - renders without crashing
 *  - passes all 4 skyColors to gradient stops
 *  - shows fallback (#1a1a2e) when hook returns invalid colors
 *  - positioned absolute behind content (z-index check)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LivingSkyBackground } from '../LivingSkyBackground';
import type { LivingSkyState } from '@/types/livingSky';

// ── Mock useLivingSky ────────────────────────────────────────────────────────

const mockSkyColors: LivingSkyState['skyColors'] = [
  '#2858A0',
  '#4878A8',
  '#88B0C4',
  '#A4C8DC',
];

const mockState: LivingSkyState = {
  skyColors: mockSkyColors,
  glowColors: ['transparent', 'transparent'],
  ridgeColors: { r1: '#0C1838', r2: '#162850', r3: '#283860', r4: '#3C4E6A', tree: '#080E1E' },
  sunPos: { cx: 524, cy: 52, r: 16, opacity: 1 },
  moonPos: { cx: 100, cy: 100, opacity: 0, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
  starOpacity: 0,
  cloudOpacity: 0,
  birdOpacity: 0,
  fireflyOpacity: 0,
  owlOpacity: 0,
  rimOpacity: 0.04,
  rimColor: '#FFFCE8',
  navBg: '#ffffff',
  navText: '#1E2A3A',
  season: 'summer',
  precipitationOpacity: 0,
  precipitationType: 'none',
};

jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: jest.fn(() => mockState),
}));

import { useLivingSky } from '@/hooks/useLivingSky';
const mockUseLivingSky = useLivingSky as jest.Mock;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LivingSkyBackground', () => {
  beforeEach(() => {
    mockUseLivingSky.mockReturnValue(mockState);
  });

  it('renders without crashing', () => {
    expect(() => render(<LivingSkyBackground />)).not.toThrow();
  });

  it('renders with testID living-sky-background', () => {
    const { getByTestId } = render(<LivingSkyBackground />);
    expect(getByTestId('living-sky-background')).toBeTruthy();
  });

  it('passes skyColors[0] to the first gradient stop', () => {
    const { UNSAFE_getAllByType } = render(<LivingSkyBackground />);
    // react-native-svg Stop mock renders as <Stop stopColor=... />
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Stop } = require('react-native-svg');
    const stops = UNSAFE_getAllByType(Stop);
    expect(stops.length).toBeGreaterThanOrEqual(4);
    const stopColors = stops.map((s) => s.props.stopColor);
    expect(stopColors).toContain(mockSkyColors[0]);
    expect(stopColors).toContain(mockSkyColors[1]);
    expect(stopColors).toContain(mockSkyColors[2]);
    expect(stopColors).toContain(mockSkyColors[3]);
  });

  it('renders fallback view when skyColors is missing', () => {
    mockUseLivingSky.mockReturnValue({ ...mockState, skyColors: undefined });
    const { getByTestId } = render(<LivingSkyBackground />);
    const bg = getByTestId('living-sky-background');
    // fallback renders a plain View with backgroundColor
    expect(bg.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1a1a2e' })]),
    );
  });

  it('is positioned absolute to fill the screen behind content', () => {
    const { getByTestId } = render(<LivingSkyBackground />);
    const bg = getByTestId('living-sky-background');
    const flatStyle = Array.isArray(bg.props.style)
      ? Object.assign({}, ...bg.props.style)
      : bg.props.style ?? {};
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.zIndex).toBeLessThan(0);
  });
});
