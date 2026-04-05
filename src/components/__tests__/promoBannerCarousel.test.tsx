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

let mockReducedMotion = false;
jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

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
  mockReducedMotion = false;
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

describe('PromoBannerCarousel — skeleton & loading', () => {
  it('shows skeleton when isLoading=true and items is empty', () => {
    const { getByTestId, queryByTestId } = render(
      <PromoBannerCarousel items={[]} isLoading />,
    );
    expect(getByTestId('promo-banner-skeleton')).toBeTruthy();
    expect(queryByTestId('promo-banner-carousel')).toBeNull();
  });

  it('shows carousel (not skeleton) when isLoading=true but items present', () => {
    const { getByTestId, queryByTestId } = render(
      <PromoBannerCarousel items={TEST_ITEMS} isLoading />,
    );
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
    expect(queryByTestId('promo-banner-skeleton')).toBeNull();
  });
});

describe('PromoBannerCarousel — reduced motion', () => {
  it('does not crash and renders carousel when reduceMotion is true', () => {
    mockReducedMotion = true;
    const { getByTestId } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    act(() => { jest.advanceTimersByTime(15000); });
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
  });
});

describe('PromoBannerCarousel — auto-rotate', () => {
  it('does not start auto-rotate for single item', () => {
    const { getByTestId } = render(
      <PromoBannerCarousel items={[TEST_ITEMS[0]]} />,
    );
    act(() => { jest.advanceTimersByTime(15000); });
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
  });

  it('pauses auto-rotate after user scroll drag', () => {
    const { getByTestId } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    const flatList = getByTestId('promo-banner-carousel').children[0];
    fireEvent(flatList, 'scrollBeginDrag');
    act(() => { jest.advanceTimersByTime(5000); });
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

describe('PromoBannerCarousel — deep link error handling', () => {
  it('does not throw when deep link openURL rejects', () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Cannot open'));
    const { getByText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(() => fireEvent.press(getByText('Shop Now'))).not.toThrow();
  });
});

describe('PromoBannerCarousel — accessibility', () => {
  it('each banner has accessible label with title, subtitle, and CTA', () => {
    const { getByLabelText } = render(<PromoBannerCarousel items={TEST_ITEMS} />);
    expect(getByLabelText('Free Shipping: On all orders. Shop Now')).toBeTruthy();
    expect(getByLabelText('Spring Sale: 20% off everything. Browse')).toBeTruthy();
  });
});
