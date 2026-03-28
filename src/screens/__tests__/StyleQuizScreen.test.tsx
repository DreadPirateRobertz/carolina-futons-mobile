import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleQuizScreen } from '../StyleQuizScreen';

jest.mock('@/components/ProductCard', () => ({
  ProductCard: ({ testID, onPress }: { testID?: string; onPress?: () => void }) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { testID, onPress });
  },
}));

jest.mock('@/data/products', () => ({
  PRODUCTS: [
    {
      id: 'prod-1',
      slug: 'asheville-full-futon',
      name: 'Asheville Full Futon',
      price: 799,
      images: [],
      inStock: true,
      rating: 4.5,
      reviewCount: 12,
      shortDescription: '',
      badge: null,
    },
    {
      id: 'prod-2',
      slug: 'blue-ridge-queen-futon',
      name: 'Blue Ridge Queen Futon',
      price: 999,
      images: [],
      inStock: true,
      rating: 4.7,
      reviewCount: 8,
      shortDescription: '',
      badge: null,
    },
    {
      id: 'prod-3',
      slug: 'biltmore-loveseat',
      name: 'Biltmore Loveseat',
      price: 649,
      images: [],
      inStock: true,
      rating: 4.3,
      reviewCount: 5,
      shortDescription: '',
      badge: null,
    },
  ],
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sunsetCoral: '#E8845C',
      sunsetCoralLight: '#F2A882',
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      muted: '#999999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { button: 8, pill: 9999, card: 12, md: 8 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      bodyFamilySemiBold: 'SourceSans3_600SemiBold',
    },
    shadows: { button: {}, card: {}, cardHover: {} },
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockUseProductBySlug = jest.fn();
jest.mock('@/hooks/useProduct', () => ({
  useProductBySlug: (slug: string) => mockUseProductBySlug(slug),
  useProduct: jest.fn(() => ({ product: null, isLoading: false, error: null, refresh: jest.fn() })),
}));

const mockStyleQuizComplete = jest.fn();
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    styleQuizComplete: (...args: unknown[]) => mockStyleQuizComplete(...args),
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'member-test' }, isAuthenticated: true }),
}));

jest.mock('@/services/sommelierResults', () => ({
  recordSommelierResult: jest.fn(() => Promise.resolve(true)),
}));

const mockSetItem = AsyncStorage.setItem as jest.Mock;

/**
 * Press through all 5 quiz steps to reach the completion screen.
 * Answers: living-room / modern / sitting / full / 500-1000
 * → recommendation: Coastal Minimalist
 */
function completeQuiz(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.press(getByTestId('quiz-option-living-room')); // roomType
  fireEvent.press(getByTestId('quiz-option-modern')); // stylePreference
  fireEvent.press(getByTestId('quiz-option-sitting')); // primaryUse
  fireEvent.press(getByTestId('quiz-option-full')); // sizeNeeds
  fireEvent.press(getByTestId('quiz-option-500-1000')); // budgetRange
}

describe('StyleQuizScreen', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStyleQuizComplete.mockResolvedValue({ success: true, newTotal: 100 });
    // Default: product not found — tests that need thumbnails override this
    mockUseProductBySlug.mockReturnValue({
      product: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  // ── Rendering ───────────────────────────────────────────────────

  it('renders the first quiz step (room) by default', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-screen')).toBeTruthy();
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
    expect(getByText(/what room/i)).toBeTruthy();
  });

  it('renders all room options', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('quiz-option-living-room')).toBeTruthy();
    expect(getByTestId('quiz-option-bedroom')).toBeTruthy();
    expect(getByTestId('quiz-option-guest-room')).toBeTruthy();
    expect(getByTestId('quiz-option-dorm')).toBeTruthy();
    expect(getByTestId('quiz-option-office')).toBeTruthy();
  });

  it('renders progress indicator', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-progress')).toBeTruthy();
  });

  it('renders back button', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-back-button')).toBeTruthy();
  });

  // ── Navigation ──────────────────────────────────────────────────

  it('auto-advances to style step after room selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
  });

  it('auto-advances to primary use step after style selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    expect(getByTestId('style-quiz-step-2')).toBeTruthy();
  });

  it('auto-advances to size needs step after primary use selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-guest-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-both'));
    expect(getByTestId('style-quiz-step-3')).toBeTruthy();
  });

  it('renders size options on step 3 (twin/full/queen)', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    expect(getByTestId('quiz-option-twin')).toBeTruthy();
    expect(getByTestId('quiz-option-full')).toBeTruthy();
    expect(getByTestId('quiz-option-queen')).toBeTruthy();
  });

  it('auto-advances to budget step after size selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    fireEvent.press(getByTestId('quiz-option-full'));
    expect(getByTestId('style-quiz-step-4')).toBeTruthy();
  });

  it('renders budget options on step 4', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    fireEvent.press(getByTestId('quiz-option-full'));
    expect(getByTestId('quiz-option-under-500')).toBeTruthy();
    expect(getByTestId('quiz-option-500-1000')).toBeTruthy();
    expect(getByTestId('quiz-option-1000-2000')).toBeTruthy();
    expect(getByTestId('quiz-option-over-2000')).toBeTruthy();
  });

  it('shows completion after all 5 questions answered', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });

  it('back button on first step calls onBack prop', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('back button on later steps returns to previous quiz step', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  // ── Completion ──────────────────────────────────────────────────

  it('shows Save Preferences button on completion', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    expect(getByText('Save Preferences')).toBeTruthy();
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
  });

  it('saves preferences with API-contract field names and calls onComplete', async () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('quiz-option-queen'));
    fireEvent.press(getByTestId('quiz-option-1000-2000'));
    fireEvent.press(getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({
          roomType: 'bedroom',
          stylePreference: 'classic',
          primaryUse: 'sleeping',
          sizeNeeds: 'queen',
          budgetRange: '1000-2000',
        }),
      );
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Personality label ────────────────────────────────────────────

  it('shows personality label on completion', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId); // modern + full → Coastal Minimalist
    expect(getByTestId('style-quiz-personality-label')).toBeTruthy();
  });

  it('personality label shows Coastal Minimalist for modern + full', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    const label = getByTestId('style-quiz-personality-label');
    expect(label.props.children).toContain('Coastal Minimalist');
  });

  it('personality label shows Warm Industrial for rustic + full', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('quiz-option-full'));
    fireEvent.press(getByTestId('quiz-option-500-1000'));
    const label = getByTestId('style-quiz-personality-label');
    expect(label.props.children).toContain('Warm Industrial');
  });

  // ── Product grid ─────────────────────────────────────────────────

  it('renders curated product grid on completion', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    expect(getByTestId('style-quiz-product-grid')).toBeTruthy();
  });

  it('product grid has at least one product card', () => {
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('calls onProductPress with slug when product card tapped', () => {
    const onProductPress = jest.fn();
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen
        onComplete={mockOnComplete}
        onBack={mockOnBack}
        onProductPress={onProductPress}
      />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    fireEvent.press(cards[0]);
    expect(onProductPress).toHaveBeenCalledTimes(1);
    expect(typeof onProductPress.mock.calls[0][0]).toBe('string');
  });

  it('does not throw when onProductPress not provided and product tapped', () => {
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    expect(() => fireEvent.press(cards[0])).not.toThrow();
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('quiz options have accessible labels', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    const option = getByTestId('quiz-option-living-room');
    expect(option.props.accessibilityLabel).toBe('Living Room');
    expect(option.props.accessibilityRole).toBe('button');
  });

  it('back button has accessible label', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    const backBtn = getByTestId('style-quiz-back-button');
    expect(backBtn.props.accessibilityLabel).toBe('Go back');
    expect(backBtn.props.accessibilityRole).toBe('button');
  });

  // ── Edge Cases ──────────────────────────────────────────────────

  it('shows alert and does not call onComplete when savePreferences fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockSetItem.mockRejectedValueOnce(new Error('Storage full'));
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    fireEvent.press(getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array));
    });
    expect(mockOnComplete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows personalized completion message with selected style', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('quiz-option-full'));
    fireEvent.press(getByTestId('quiz-option-500-1000'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
    expect(getByText(/rustic/i)).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} testID="custom-quiz" />,
    );
    expect(getByTestId('custom-quiz')).toBeTruthy();
  });

  // ── Product thumbnails (cm-49p) ─────────────────────────────────

  it('shows product thumbnail when image data is available', () => {
    mockUseProductBySlug.mockReturnValue({
      product: {
        id: 'prod-1',
        slug: 'asheville-full',
        name: 'The Asheville',
        images: [{ uri: 'https://example.com/asheville.jpg', alt: 'The Asheville' }],
        price: 378,
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    // completeQuiz selects modern+full → Coastal Minimalist recommendation → slug 'asheville-full-futon'
    expect(getByTestId('quiz-product-img-asheville-full-futon')).toBeTruthy();
  });

  it('shows product name when image data is available', () => {
    mockUseProductBySlug.mockReturnValue({
      product: {
        id: 'prod-1',
        slug: 'asheville-full',
        name: 'The Asheville',
        images: [{ uri: 'https://example.com/asheville.jpg', alt: 'The Asheville' }],
        price: 378,
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId, getAllByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    expect(getAllByText('The Asheville').length).toBeGreaterThan(0);
  });

  it('falls back to slug text when product is not found (graceful degradation)', () => {
    mockUseProductBySlug.mockReturnValue({
      product: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    // Cards still render, no crash
    const cards = getAllByTestId(/^quiz-product-/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('does not crash when product has no images', () => {
    mockUseProductBySlug.mockReturnValue({
      product: {
        id: 'prod-1',
        slug: 'asheville-full',
        name: 'The Asheville',
        images: [],
        price: 378,
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(() => completeQuiz(getByTestId)).not.toThrow();
  });

  it('does not crash when useProductBySlug returns an error', () => {
    mockUseProductBySlug.mockReturnValue({
      product: null,
      isLoading: false,
      error: new Error('Wix unavailable'),
      refresh: jest.fn(),
    });
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(() => completeQuiz(getByTestId)).not.toThrow();
  });

  // ── styleQuizComplete gamification wiring — cfutons_mobile-0l2 ──

  describe('styleQuizComplete gamification', () => {
    it('calls styleQuizComplete with style and size from quiz answers', async () => {
      const { getByTestId } = render(
        <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
      );
      // completeQuiz selects: modern (style) + full (size)
      completeQuiz(getByTestId);
      fireEvent.press(getByTestId('style-quiz-save-button'));
      await waitFor(() => {
        expect(mockStyleQuizComplete).toHaveBeenCalledWith('modern', 'full');
      });
    });

    it('clears daily-quests cache after styleQuizComplete fires', async () => {
      const { getByTestId } = render(
        <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
      );
      completeQuiz(getByTestId);
      fireEvent.press(getByTestId('style-quiz-save-button'));
      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('daily-quests');
      });
    });

    it('handles removeItem rejection gracefully (logs warning, does not throw)', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('storage error'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { getByTestId } = render(
        <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
      );
      completeQuiz(getByTestId);
      fireEvent.press(getByTestId('style-quiz-save-button'));
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          '[StyleQuiz] quest cache clear failed',
          expect.any(Error),
        );
      });
      warnSpy.mockRestore();
    });

    it('onComplete fires even when styleQuizComplete rejects', async () => {
      mockStyleQuizComplete.mockRejectedValue(new Error('network'));
      const { getByTestId } = render(
        <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
      );
      completeQuiz(getByTestId);
      fireEvent.press(getByTestId('style-quiz-save-button'));
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
