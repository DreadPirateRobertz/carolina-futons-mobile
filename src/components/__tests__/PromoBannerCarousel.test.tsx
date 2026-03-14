import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PromoBannerCarousel, type PromoBannerItem } from '../PromoBannerCarousel';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      espresso: '#3A2518',
      sunsetCoral: '#E8845C',
      mountainBlue: '#5B8FA8',
      espressoLight: '#6B5B50',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilyBold: 'System',
      h3: { fontSize: 20 },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, pill: 999 },
  }),
}));

jest.mock('@/theme/tokens', () => ({
  darkPalette: {
    textPrimary: '#F5F0EB',
    textMuted: '#A89888',
    surfaceElevated: '#3A2F28',
  },
  colors: {},
}));

jest.mock('@/components/GlassCard', () => {
  const { createElement } = require('react');
  return {
    GlassCard: ({ children, style, testID }: any) =>
      createElement('View', { style, testID }, children),
  };
});

const TEST_ITEMS: PromoBannerItem[] = [
  {
    id: 'test-1',
    title: 'Free Shipping',
    subtitle: 'On all orders',
    ctaText: 'Shop Now',
    deepLink: 'carolinafutons://shop',
    emoji: '🚚',
    accentColor: '#5B8FA8',
  },
  {
    id: 'test-2',
    title: 'Spring Sale',
    subtitle: '20% off everything',
    ctaText: 'Browse',
    deepLink: 'carolinafutons://collections/spring',
    emoji: '🌿',
    accentColor: '#E8845C',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PromoBannerCarousel', () => {
  it('renders carousel with default promos', () => {
    const { getByTestId } = render(<PromoBannerCarousel />);
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
  });

  it('renders custom promo items', () => {
    const { getByText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(getByText('Free Shipping')).toBeTruthy();
  });

  it('renders dot indicators for multiple items', () => {
    const { getByTestId } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(getByTestId('promo-dots')).toBeTruthy();
  });

  it('does not render dots for single item', () => {
    const { queryByTestId } = render(<PromoBannerCarousel items={[TEST_ITEMS[0]]} />);
    expect(queryByTestId('promo-dots')).toBeNull();
  });

  it('returns null for empty items', () => {
    const { queryByTestId } = render(<PromoBannerCarousel items={[]} />);
    expect(queryByTestId('promo-banner-carousel')).toBeNull();
  });

  it('opens deep link on banner press', () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);

    fireEvent.press(getByText('Shop Now'));
    expect(openURLSpy).toHaveBeenCalledWith('carolinafutons://shop');
  });

  it('renders CTA text for each banner', () => {
    const { getByText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(getByText('Shop Now')).toBeTruthy();
    expect(getByText('Browse')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(getByText('On all orders')).toBeTruthy();
  });
});
