import React, { createContext, useContext, useCallback, useReducer, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  photos: string[];
  helpfulCount: number;
  createdAt: number;
  /** Set of voter identifiers to prevent double-voting */
  voted: Set<string>;
}

export type SortBy = 'recent' | 'helpful' | 'rating-high' | 'rating-low';

interface ReviewsState {
  reviews: Review[];
  sortBy: SortBy;
  isSubmitting: boolean;
}

type ReviewsAction =
  | {
      type: 'SUBMIT';
      productId: string;
      rating: number;
      title: string;
      body: string;
      photos: string[];
    }
  | { type: 'SET_SORT'; sortBy: SortBy }
  | { type: 'MARK_HELPFUL'; reviewId: string }
  | { type: 'SET_SUBMITTING'; value: boolean };

// ── Reducer ────────────────────────────────────────────────────────────

let nextId = 1;

function reviewsReducer(state: ReviewsState, action: ReviewsAction): ReviewsState {
  switch (action.type) {
    case 'SUBMIT': {
      const review: Review = {
        id: `review-${nextId++}`,
        productId: action.productId,
        rating: action.rating,
        title: action.title,
        body: action.body,
        photos: action.photos,
        helpfulCount: 0,
        createdAt: Date.now(),
        voted: new Set(),
      };
      return { ...state, reviews: [...state.reviews, review] };
    }
    case 'SET_SORT':
      return { ...state, sortBy: action.sortBy };
    case 'MARK_HELPFUL': {
      const voterKey = 'current-user';
      return {
        ...state,
        reviews: state.reviews.map((r) => {
          if (r.id !== action.reviewId) return r;
          if (r.voted.has(voterKey)) return r;
          const voted = new Set(r.voted);
          voted.add(voterKey);
          return { ...r, helpfulCount: r.helpfulCount + 1, voted };
        }),
      };
    }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────

interface ReviewsContextValue {
  state: ReviewsState;
  dispatch: React.Dispatch<ReviewsAction>;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

interface ReviewsProviderProps {
  children: React.ReactNode;
}

export function ReviewsProvider({ children }: ReviewsProviderProps) {
  const [state, dispatch] = useReducer(reviewsReducer, {
    reviews: [],
    sortBy: 'recent' as SortBy,
    isSubmitting: false,
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────

interface SubmitReviewInput {
  rating: number;
  title: string;
  body: string;
  photos: string[];
}

interface UseReviewsReturn {
  reviews: Review[];
  averageRating: number;
  totalCount: number;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  submitReview: (input: SubmitReviewInput) => void;
  markHelpful: (reviewId: string) => void;
  isSubmitting: boolean;
}

export function useReviews(productId: string): UseReviewsReturn {
  const ctx = useContext(ReviewsContext);
  if (!ctx) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }

  const { state, dispatch } = ctx;

  // Filter reviews by productId and apply sorting
  const reviews = useMemo(() => {
    const filtered = state.reviews.filter((r) => r.productId === productId);
    const sorted = [...filtered];
    switch (state.sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'helpful':
        sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
        break;
      case 'rating-high':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating-low':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
    }
    return sorted;
  }, [state.reviews, state.sortBy, productId]);

  const totalCount = reviews.length;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round(sum / reviews.length);
  }, [reviews]);

  const setSortBy = useCallback(
    (sortBy: SortBy) => {
      dispatch({ type: 'SET_SORT', sortBy });
    },
    [dispatch],
  );

  const submitReview = useCallback(
    (input: SubmitReviewInput) => {
      dispatch({
        type: 'SUBMIT',
        productId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        photos: input.photos,
      });
    },
    [dispatch, productId],
  );

  const markHelpful = useCallback(
    (reviewId: string) => {
      dispatch({ type: 'MARK_HELPFUL', reviewId });
    },
    [dispatch],
  );

  return {
    reviews,
    averageRating,
    totalCount,
    sortBy: state.sortBy,
    setSortBy,
    submitReview,
    markHelpful,
    isSubmitting: state.isSubmitting,
  };
}
