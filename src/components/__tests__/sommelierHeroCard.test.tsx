// src/components/__tests__/SommelierHeroCard.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SommelierHeroCard } from '../SommelierHeroCard';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      sandBase: '#E8D5B7',
      sunsetCoral: '#E8845C',
      offWhite: '#FAF7F2',
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

const mockOnSeePicks = jest.fn();
const DISMISSED_KEY = '@cf_sommelier_hero_dismissed';
const sampleResult = {
  memberId: 'm1',
  topStyle: 'Modern Minimalist',
  flavors: ['Firm', 'Queen'],
  recommendations: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

it('renders null while checking dismissed state', () => {
  (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
  const { queryByTestId } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  expect(queryByTestId('sommelier-hero-card')).toBeNull();
});

it('renders card with topStyle and flavors', async () => {
  const { getByText, getByTestId } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByTestId('sommelier-hero-card')).toBeTruthy());
  expect(getByText('Modern Minimalist')).toBeTruthy();
  expect(getByText('Firm')).toBeTruthy();
});

it('calls onSeePicks when CTA pressed', async () => {
  const { getByText } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByText(/see your picks/i)).toBeTruthy());
  fireEvent.press(getByText(/see your picks/i));
  expect(mockOnSeePicks).toHaveBeenCalled();
});

it('dismiss button sets AsyncStorage flag and hides card', async () => {
  const { getByTestId, queryByTestId } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByTestId('sommelier-hero-dismiss')).toBeTruthy());
  fireEvent.press(getByTestId('sommelier-hero-dismiss'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(DISMISSED_KEY, 'true');
  await waitFor(() => expect(queryByTestId('sommelier-hero-card')).toBeNull());
});

it('renders nothing when previously dismissed', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
  const { queryByTestId } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => {});
  expect(queryByTestId('sommelier-hero-card')).toBeNull();
});

it('dismiss button has accessibilityLabel', async () => {
  const { getByTestId } = render(
    <SommelierHeroCard result={sampleResult} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByTestId('sommelier-hero-dismiss')).toBeTruthy());
  expect(getByTestId('sommelier-hero-dismiss').props.accessibilityLabel).toBeTruthy();
});

it('renders without crashing when flavors is null', async () => {
  const resultNullFlavors = { ...sampleResult, flavors: null as unknown as string[] };
  const { getByTestId } = render(
    <SommelierHeroCard result={resultNullFlavors} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByTestId('sommelier-hero-card')).toBeTruthy());
});

it('renders without crashing when flavors is undefined', async () => {
  const resultUndefinedFlavors = { ...sampleResult, flavors: undefined as unknown as string[] };
  const { getByTestId } = render(
    <SommelierHeroCard result={resultUndefinedFlavors} onSeePicks={mockOnSeePicks} />,
  );
  await waitFor(() => expect(getByTestId('sommelier-hero-card')).toBeTruthy());
});
