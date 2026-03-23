/**
 * @file LivingSkyLoadingView.test.tsx
 * @description TDD tests for LivingSkyLoadingView — golden-hour splash screen.
 * hq-oq1gk
 *
 * Covers:
 *  - Renders the skyline with testID living-sky-loading-skyline
 *  - Renders the brand spinner
 *  - Uses golden-hour state (totalMinutes=1170)
 *  - Passes state with high rimOpacity (golden hour signature)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LivingSkyLoadingView } from '../LivingSkyLoadingView';

const mockUseLivingSky = jest.fn();

jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: (minutes: number) => mockUseLivingSky(minutes),
}));

jest.mock('@/components/LivingSkyMountainSkyline', () => ({
  LivingSkyMountainSkyline: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'living-sky'} />;
  },
}));

jest.mock('@/components/BrandedSpinner', () => ({
  BrandedSpinner: () => {
    const { View } = require('react-native');
    return <View testID="branded-spinner" />;
  },
}));

const GOLDEN_HOUR_MINUTES = 1170;

const mockGoldenHourState = {
  skyColors: ['#201840', '#5C2C60', '#C85038', '#F08828'] as [string, string, string, string],
  glowColors: ['#FFD050', '#E05000'] as [string, string],
  ridgeColors: { r1: '#140230', r2: '#300850', r3: '#4C1468', r4: '#703480', tree: '#080118' },
  sunPos: { cx: 920, cy: 140, r: 18, opacity: 0.95 },
  moonPos: { cx: 200, cy: 200, opacity: 0, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
  starOpacity: 0,
  cloudOpacity: 0,
  birdOpacity: 1,
  fireflyOpacity: 0.08,
  owlOpacity: 0,
  rimOpacity: 0.95,
  rimColor: '#FF7010',
  navBg: '#F5EFE6',
  navText: '#3D2310',
  season: 'summer' as const,
  precipitationOpacity: 0,
  precipitationType: 'none' as const,
};

describe('LivingSkyLoadingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLivingSky.mockReturnValue(mockGoldenHourState);
  });

  it('renders the skyline with testID living-sky-loading-skyline', () => {
    const { getByTestId } = render(<LivingSkyLoadingView />);
    expect(getByTestId('living-sky-loading-skyline')).toBeTruthy();
  });

  it('renders the branded spinner', () => {
    const { getByTestId } = render(<LivingSkyLoadingView />);
    expect(getByTestId('branded-spinner')).toBeTruthy();
  });

  it('calls useLivingSky with golden-hour totalMinutes (1170)', () => {
    render(<LivingSkyLoadingView />);
    expect(mockUseLivingSky).toHaveBeenCalledWith(GOLDEN_HOUR_MINUTES);
  });

  it('receives state with high rimOpacity (golden hour signature)', () => {
    const { getByTestId } = render(<LivingSkyLoadingView />);
    // Component renders without crashing with golden-hour state
    expect(getByTestId('living-sky-loading-skyline')).toBeTruthy();
    expect(mockUseLivingSky).toHaveBeenCalledWith(GOLDEN_HOUR_MINUTES);
    const state = mockUseLivingSky.mock.results[0].value;
    expect(state.rimOpacity).toBeGreaterThan(0.5);
  });

  it('has testID living-sky-loading-view on root container', () => {
    const { getByTestId } = render(<LivingSkyLoadingView />);
    expect(getByTestId('living-sky-loading-view')).toBeTruthy();
  });
});
