/**
 * TDD tests for VideoReviewGallery component — deacon-2c0d / cm-vid.
 *
 * Covers: rendering, loading skeleton, empty state, thumbnail tiles,
 * fullscreen modal open/close, video player setup, accessibility,
 * error state, edge cases.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { VideoReviewGallery } from '../VideoReviewGallery';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-video');

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      white: '#FFFFFF',
      sand: '#EAD9B4',
      error: '#CC0000',
      background: '#FAFAF8',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, lg: 16, pill: 20 },
  }),
}));

const mockUseVideoReviews = jest.fn();
jest.mock('@/hooks/useVideoReviews', () => ({
  useVideoReviews: (...args: unknown[]) => mockUseVideoReviews(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VIDEO_1 = {
  id: 'vr-001',
  productId: 'asheville-full',
  videoUrl: 'https://cdn.example.com/v1.mp4',
  thumbnailUrl: 'https://cdn.example.com/t1.jpg',
  authorName: 'Taylor B.',
  title: 'Perfect sofa-bed',
  duration: 45,
  createdAt: '2026-03-01T14:00:00Z',
  rating: 5,
};

const VIDEO_2 = {
  id: 'vr-002',
  productId: 'asheville-full',
  videoUrl: 'https://cdn.example.com/v2.mp4',
  thumbnailUrl: 'https://cdn.example.com/t2.jpg',
  authorName: 'Jordan K.',
  title: 'Great quality',
  duration: 62,
  createdAt: '2026-02-20T09:30:00Z',
  rating: 4,
};

const DEFAULT_HOOK = {
  videos: [],
  isLoading: false,
  error: null,
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK });
});

// ── Section 1: Rendering ──────────────────────────────────────────────────────

describe('rendering', () => {
  it('renders the gallery container', () => {
    const { getByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByTestId('video-review-gallery')).toBeTruthy();
  });

  it('passes productId to useVideoReviews', () => {
    render(<VideoReviewGallery productId="columbia-queen" />);
    expect(mockUseVideoReviews).toHaveBeenCalledWith('columbia-queen');
  });
});

// ── Section 2: Loading state ──────────────────────────────────────────────────

describe('loading state', () => {
  it('shows loading skeleton when isLoading=true', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, isLoading: true });
    const { getByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByTestId('video-review-skeleton')).toBeTruthy();
  });

  it('hides skeleton when not loading', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, isLoading: false, videos: [VIDEO_1] });
    const { queryByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(queryByTestId('video-review-skeleton')).toBeNull();
  });
});

// ── Section 3: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows empty state when no videos and not loading', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, videos: [] });
    const { getByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByTestId('video-review-empty')).toBeTruthy();
  });

  it('does not show thumbnail tiles when empty', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, videos: [] });
    const { queryAllByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(queryAllByTestId('video-review-thumbnail')).toHaveLength(0);
  });
});

// ── Section 4: Thumbnail tiles ────────────────────────────────────────────────

describe('thumbnail tiles', () => {
  beforeEach(() => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, videos: [VIDEO_1, VIDEO_2] });
  });

  it('renders one thumbnail per video', () => {
    const { getAllByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getAllByTestId('video-review-thumbnail')).toHaveLength(2);
  });

  it('shows author name on each tile', () => {
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByText('Taylor B.')).toBeTruthy();
    expect(getByText('Jordan K.')).toBeTruthy();
  });

  it('shows video title on each tile', () => {
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByText('Perfect sofa-bed')).toBeTruthy();
    expect(getByText('Great quality')).toBeTruthy();
  });

  it('shows formatted duration on each tile', () => {
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    // 45s → "0:45", 62s → "1:02"
    expect(getByText('0:45')).toBeTruthy();
    expect(getByText('1:02')).toBeTruthy();
  });

  it('thumbnail has accessible label', () => {
    const { getAllByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    const tiles = getAllByTestId('video-review-thumbnail');
    expect(tiles[0].props.accessibilityLabel).toBeTruthy();
  });

  it('thumbnail has accessibilityRole button', () => {
    const { getAllByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    const tiles = getAllByTestId('video-review-thumbnail');
    expect(tiles[0].props.accessibilityRole).toBe('button');
  });
});

// ── Section 5: Fullscreen modal ───────────────────────────────────────────────

describe('fullscreen modal', () => {
  beforeEach(() => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, videos: [VIDEO_1, VIDEO_2] });
  });

  it('fullscreen modal is not visible initially', () => {
    const { queryByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(queryByTestId('video-review-fullscreen')).toBeNull();
  });

  it('opens fullscreen modal when thumbnail is pressed', () => {
    const { getAllByTestId, getByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[0]);
    expect(getByTestId('video-review-fullscreen')).toBeTruthy();
  });

  it('closes fullscreen modal when close button pressed', () => {
    const { getAllByTestId, getByTestId, queryByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[0]);
    expect(getByTestId('video-review-fullscreen')).toBeTruthy();

    fireEvent.press(getByTestId('video-review-fullscreen-close'));
    expect(queryByTestId('video-review-fullscreen')).toBeNull();
  });

  it('fullscreen shows video player for selected video', () => {
    const { getAllByTestId, getByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[0]);
    expect(getByTestId('video-review-player')).toBeTruthy();
  });

  it('fullscreen shows author name of selected video', () => {
    const { getAllByTestId, getByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[0]);
    expect(getByTestId('video-review-fullscreen-author').props.children).toBe('Taylor B.');
  });

  it('fullscreen shows title of selected video', () => {
    const { getAllByTestId, getByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[0]);
    expect(getByTestId('video-review-fullscreen-title').props.children).toBe('Perfect sofa-bed');
  });

  it('opens second video when second thumbnail pressed', () => {
    const { getAllByTestId, getByTestId } = render(
      <VideoReviewGallery productId="asheville-full" />,
    );
    fireEvent.press(getAllByTestId('video-review-thumbnail')[1]);
    expect(getByTestId('video-review-fullscreen-author').props.children).toBe('Jordan K.');
  });
});

// ── Section 6: Error state ────────────────────────────────────────────────────

describe('error state', () => {
  it('shows error message when error is set', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, error: 'Failed to load videos' });
    const { getByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByTestId('video-review-error')).toBeTruthy();
  });

  it('does not show thumbnails when error is set', () => {
    mockUseVideoReviews.mockReturnValue({ ...DEFAULT_HOOK, error: 'Failed to load videos' });
    const { queryAllByTestId } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(queryAllByTestId('video-review-thumbnail')).toHaveLength(0);
  });
});

// ── Section 7: Duration formatting ───────────────────────────────────────────

describe('duration formatting', () => {
  it('formats 0 seconds as 0:00', () => {
    mockUseVideoReviews.mockReturnValue({
      ...DEFAULT_HOOK,
      videos: [{ ...VIDEO_1, duration: 0 }],
    });
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByText('0:00')).toBeTruthy();
  });

  it('formats 90 seconds as 1:30', () => {
    mockUseVideoReviews.mockReturnValue({
      ...DEFAULT_HOOK,
      videos: [{ ...VIDEO_1, duration: 90 }],
    });
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByText('1:30')).toBeTruthy();
  });

  it('formats 3600 seconds as 60:00', () => {
    mockUseVideoReviews.mockReturnValue({
      ...DEFAULT_HOOK,
      videos: [{ ...VIDEO_1, duration: 3600 }],
    });
    const { getByText } = render(<VideoReviewGallery productId="asheville-full" />);
    expect(getByText('60:00')).toBeTruthy();
  });
});
