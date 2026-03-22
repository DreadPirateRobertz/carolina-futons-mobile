/**
 * Tests for Q&A section on ProductDetailScreen — cm-wf3.
 *
 * Covers: question list rendering, empty state, error state, loading skeleton,
 * submit form (validation, success, error).
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

// ── Standard ProductDetailScreen mocks ────────────────────────────────────────

jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));
jest.mock('@/hooks/useProductReviews', () => ({
  useProductReviews: () => ({
    aggregate: { averageRating: 0, totalReviews: 0 },
    reviews: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@/hooks/usePremium', () => ({ usePremium: () => ({ isPremium: false }) }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'member-1', displayName: 'Test User' }, isAuthenticated: true }),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
}));
jest.mock('@/hooks/useRecommendations', () => {
  const trackView = jest.fn();
  return { useRecommendations: () => ({ similarItems: [], trackView }) };
});
jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ recommendations: [] }),
}));
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => null,
  WixProvider: ({ children }: any) => children,
}));
jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({ addItem: jest.fn(), items: [], itemCount: 0, subtotal: 0 }),
}));
jest.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({ isInWishlist: jest.fn(() => false), toggle: jest.fn() }),
  WishlistProvider: ({ children }: any) => children,
}));
jest.mock('@/contexts/CompareContext', () => ({
  useCompare: () => ({ isComparing: false, add: jest.fn(), remove: jest.fn(), items: [] }),
  CompareProvider: ({ children }: any) => children,
}));
jest.mock('@/hooks/useBackInStockSubscription', () => ({
  useBackInStockSubscription: () => ({ isSubscribed: false, loading: false, toggle: jest.fn() }),
}));
jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: () => ({ label: null, color: null }),
}));
jest.mock('@/hooks/useReviews', () => ({
  useReviews: () => ({
    reviews: [],
    summary: { averageRating: 0, totalReviews: 0, distribution: [0, 0, 0, 0, 0] },
    sort: 'helpful',
    setSort: jest.fn(),
    isSubmitting: false,
    submitReview: jest.fn(),
    markHelpful: jest.fn(),
    showForm: false,
    setShowForm: jest.fn(),
    hasReviews: false,
    submitError: null,
    submitSuccess: false,
    clearSubmitStatus: jest.fn(),
  }),
}));
jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => ({
    code: null,
    loading: false,
    error: null,
    creditsEarned: 0,
    referralCount: 0,
    shareUrl: null,
    referredByCode: null,
    storeReferredByCode: jest.fn(),
  }),
}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/hooks/useRecentlyViewed', () => {
  const addViewed = jest.fn();
  return {
    useRecentlyViewed: () => ({ recentProducts: [], addViewed, clearAll: jest.fn(), count: 0 }),
  };
});

// ── useProductQA mock ─────────────────────────────────────────────────────────

const mockSubmitQuestion = jest.fn();
const mockClearSubmitStatus = jest.fn();
const mockUseProductQA = jest.fn();
jest.mock('@/hooks/useProductQA', () => ({
  useProductQA: () => mockUseProductQA(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const product = PRODUCTS[0];

const Q_ANSWERED = {
  id: 'q-1',
  productId: product.id,
  question: 'What size fits a small room?',
  answer: 'We recommend the Twin.',
  authorName: 'Jane D.',
  createdDate: '2026-03-01T10:00:00Z',
  answered: true,
};

const QA_LOADED = {
  questions: [Q_ANSWERED],
  loading: false,
  fetchError: null,
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
  submitQuestion: mockSubmitQuestion,
  clearSubmitStatus: mockClearSubmitStatus,
};

const QA_LOADING = { ...QA_LOADED, questions: [], loading: true };
const QA_EMPTY = { ...QA_LOADED, questions: [] };
const QA_ERROR = { ...QA_LOADED, questions: [], fetchError: 'Network error' };
const QA_SUBMIT_ERROR = { ...QA_LOADED, submitError: 'Failed to submit' };
const QA_SUBMIT_SUCCESS = { ...QA_LOADED, submitSuccess: true };

function renderScreen() {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ProductDetailScreen slug={product.slug} onAddToCart={jest.fn()} onBack={jest.fn()} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProductQA.mockReturnValue(QA_LOADED);
  mockSubmitQuestion.mockResolvedValue(undefined);
});

// ── Section 1: Q&A section rendering ─────────────────────────────────────────

describe('Q&A section — with questions', () => {
  it('renders the Q&A section', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-section')).toBeTruthy();
  });

  it('renders a QuestionCard for each question', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('question-card-q-1')).toBeTruthy();
  });
});

// ── Section 2: Empty state ────────────────────────────────────────────────────

describe('Q&A empty state', () => {
  beforeEach(() => mockUseProductQA.mockReturnValue(QA_EMPTY));

  it('shows empty state message', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-empty')).toBeTruthy();
  });
});

// ── Section 3: Loading ────────────────────────────────────────────────────────

describe('Q&A loading state', () => {
  beforeEach(() => mockUseProductQA.mockReturnValue(QA_LOADING));

  it('shows loading skeleton', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-loading')).toBeTruthy();
  });
});

// ── Section 4: Error state ────────────────────────────────────────────────────

describe('Q&A error state', () => {
  beforeEach(() => mockUseProductQA.mockReturnValue(QA_ERROR));

  it('shows error message', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-error')).toBeTruthy();
  });
});

// ── Section 5: Submit form ────────────────────────────────────────────────────

describe('Q&A submit form', () => {
  it('renders the question input', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-input')).toBeTruthy();
  });

  it('renders the submit button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-submit-btn')).toBeTruthy();
  });

  it('calls submitQuestion with input text when submitted', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('product-qa-input'), 'Does it come in blue?');
    fireEvent.press(getByTestId('product-qa-submit-btn'));
    await waitFor(() => expect(mockSubmitQuestion).toHaveBeenCalledWith('Does it come in blue?'));
  });

  it('shows submit error message', () => {
    mockUseProductQA.mockReturnValue(QA_SUBMIT_ERROR);
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-submit-error')).toBeTruthy();
  });

  it('shows success message after submit', () => {
    mockUseProductQA.mockReturnValue(QA_SUBMIT_SUCCESS);
    const { getByTestId } = renderScreen();
    expect(getByTestId('product-qa-submit-success')).toBeTruthy();
  });
});
