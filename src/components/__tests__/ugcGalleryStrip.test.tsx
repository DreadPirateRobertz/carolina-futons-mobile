/**
 * Tests for UGCGalleryStrip — cm-ae8.
 *
 * Covers: rendering, empty state, loading skeleton, photo tiles,
 * vote button press, accessible labels, featured badge.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UGCGalleryStrip } from '../UGCGalleryStrip';
import type { UGCPhoto, UseUGCPhotosResult } from '@/hooks/useUGCPhotos';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#2C1810',
      espressoLight: '#6B5B4F',
      sandLight: '#F5EDD8',
      white: '#FFFFFF',
      error: '#CC0000',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, pill: 20, lg: 16 },
  }),
}));

const mockVotePhoto = jest.fn();
const mockSubmitPhoto = jest.fn();
const mockClearSubmitStatus = jest.fn();

const defaultHookResult: UseUGCPhotosResult = {
  photos: [],
  loading: false,
  fetchError: null,
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
  voteError: null,
  submitPhoto: mockSubmitPhoto,
  votePhoto: mockVotePhoto,
  clearSubmitStatus: mockClearSubmitStatus,
};

const mockUseUGCPhotos = jest.fn<UseUGCPhotosResult, [string]>(() => defaultHookResult);
jest.mock('@/hooks/useUGCPhotos', () => ({
  useUGCPhotos: (productId: string) => mockUseUGCPhotos(productId),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const APPROVED_PHOTO: UGCPhoto = {
  id: 'ugc-1',
  roomType: 'living-room',
  productId: 'asheville-full',
  photoUrl: 'https://example.com/photo1.jpg',
  caption: 'My new futon!',
  submittedAt: '2026-03-01T10:00:00Z',
  status: 'approved',
  voteCount: 5,
  memberId: 'member-1',
};

const FEATURED_PHOTO: UGCPhoto = {
  id: 'ugc-2',
  roomType: 'bedroom',
  productId: 'asheville-full',
  photoUrl: 'https://example.com/photo2.jpg',
  caption: 'Featured setup',
  submittedAt: '2026-03-02T10:00:00Z',
  status: 'featured',
  voteCount: 20,
  memberId: 'member-2',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult });
});

// ── Section 1: Rendering ──────────────────────────────────────────────────────

describe('rendering', () => {
  it('renders the gallery strip container', () => {
    const { getByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByTestId('ugc-gallery-strip')).toBeTruthy();
  });

  it('passes productId to useUGCPhotos', () => {
    render(<UGCGalleryStrip productId="columbia-queen" />);
    expect(mockUseUGCPhotos).toHaveBeenCalledWith('columbia-queen');
  });
});

// ── Section 2: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows empty state message when no photos', () => {
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, photos: [] });
    const { getByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByTestId('ugc-empty-state')).toBeTruthy();
  });

  it('does not show photo tiles when empty', () => {
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, photos: [] });
    const { queryAllByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(queryAllByTestId('ugc-photo-tile')).toHaveLength(0);
  });
});

// ── Section 3: Loading skeleton ───────────────────────────────────────────────

describe('loading skeleton', () => {
  it('shows skeleton when loading', () => {
    mockUseUGCPhotos.mockReturnValue({ ...defaultHookResult, loading: true });
    const { getByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByTestId('ugc-gallery-skeleton')).toBeTruthy();
  });

  it('hides skeleton when not loading', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      loading: false,
      photos: [APPROVED_PHOTO],
    });
    const { queryByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(queryByTestId('ugc-gallery-skeleton')).toBeNull();
  });
});

// ── Section 4: Photo tiles ────────────────────────────────────────────────────

describe('photo tiles', () => {
  beforeEach(() => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      photos: [APPROVED_PHOTO, FEATURED_PHOTO],
    });
  });

  it('renders one tile per photo', () => {
    const { getAllByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getAllByTestId('ugc-photo-tile')).toHaveLength(2);
  });

  it('shows vote count on each tile', () => {
    const { getByText } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByText('5')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
  });

  it('shows caption on tile', () => {
    const { getByText } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByText('My new futon!')).toBeTruthy();
  });

  it('shows featured badge on featured photos', () => {
    const { getAllByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    const badges = getAllByTestId('ugc-featured-badge');
    expect(badges).toHaveLength(1); // only FEATURED_PHOTO
  });
});

// ── Section 5: Vote interaction ───────────────────────────────────────────────

describe('vote interaction', () => {
  beforeEach(() => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      photos: [APPROVED_PHOTO],
    });
  });

  it('calls votePhoto with correct id when vote button pressed', () => {
    const { getByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    fireEvent.press(getByTestId('ugc-vote-button-ugc-1'));
    expect(mockVotePhoto).toHaveBeenCalledWith('ugc-1');
  });

  it('shows voteError message when vote fails', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      photos: [APPROVED_PHOTO],
      voteError: 'Could not record vote',
    });
    const { getByText } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByText(/could not record vote/i)).toBeTruthy();
  });
});

// ── Section 6: Accessibility ──────────────────────────────────────────────────

describe('accessibility', () => {
  it('photo tiles have accessible labels', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      photos: [APPROVED_PHOTO],
    });
    const { getAllByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    const tiles = getAllByTestId('ugc-photo-tile');
    expect(tiles[0].props.accessibilityLabel).toBeTruthy();
  });

  it('vote button has accessible label', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      photos: [APPROVED_PHOTO],
    });
    const { getByTestId } = render(<UGCGalleryStrip productId="asheville-full" />);
    const voteBtn = getByTestId('ugc-vote-button-ugc-1');
    expect(voteBtn.props.accessibilityLabel).toBeTruthy();
  });
});

// ── Section 7: Error state ────────────────────────────────────────────────────

describe('fetch error', () => {
  it('shows error message when fetchError is set', () => {
    mockUseUGCPhotos.mockReturnValue({
      ...defaultHookResult,
      fetchError: 'Failed to load photos',
    });
    const { getByText } = render(<UGCGalleryStrip productId="asheville-full" />);
    expect(getByText(/failed to load photos/i)).toBeTruthy();
  });
});
