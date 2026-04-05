/**
 * TDD tests for useNPSSummary (hq-9dq).
 *
 * Covers:
 *  - Staff gate: non-staff users get isStaff=false, no data fetched
 *  - Staff gate: staff users get data
 *  - Loading state
 *  - avgScore calculation (sum/count, null when empty)
 *  - responseCount
 *  - recentComments: last 5 responses that have a non-empty comment
 *  - No wixClient → error state
 *  - Query failure → error state, captureException called
 *  - refresh() re-fetches
 *  - Unauthenticated → isStaff=false, no fetch
 *  - Comments trimmed / empty-comment rows excluded from recentComments
 *  - Fractional avgScore rounded to 1 decimal
 *  - Single response
 *  - All responses have no comment → recentComments empty
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNPSSummary } from '../useNPSSummary';
import { captureException } from '@/services/crashReporting';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const STAFF_USER = {
  id: 'member-staff-1',
  email: 'alice@carolinafutons.com',
  displayName: 'Alice',
  phone: '555-0100',
  provider: 'wix' as const,
};

const NON_STAFF_USER = {
  id: 'member-1',
  email: 'customer@gmail.com',
  displayName: 'Customer',
  phone: '555-0200',
  provider: 'wix' as const,
};

function makeResponse(overrides: {
  id?: string;
  score?: number;
  comment?: string;
  createdAt?: string;
  memberId?: string;
  orderId?: string;
}) {
  return {
    id: overrides.id ?? 'resp-1',
    score: overrides.score ?? 8,
    comment: overrides.comment,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    memberId: overrides.memberId ?? 'member-1',
    orderId: overrides.orderId ?? 'ord-1',
  };
}

function makeWixClient() {
  return { queryData: mockQueryData };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: STAFF_USER, loading: false, isAuthenticated: true });
  mockUseOptionalWixClient.mockReturnValue(makeWixClient());
  mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
});

// ── Staff gate ─────────────────────────────────────────────────────────────────

describe('useNPSSummary — staff gate', () => {
  it('exposes isStaff=true for staff email domain', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStaff).toBe(true);
  });

  it('exposes isStaff=false for non-staff email', async () => {
    mockUseAuth.mockReturnValue({ user: NON_STAFF_USER, loading: false, isAuthenticated: true });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStaff).toBe(false);
  });

  it('does not fetch data when user is not staff', async () => {
    mockUseAuth.mockReturnValue({ user: NON_STAFF_USER, loading: false, isAuthenticated: true });
    renderHook(() => useNPSSummary());
    await act(async () => {});
    expect(mockQueryData).not.toHaveBeenCalled();
  });

  it('returns null summary when user is not staff', async () => {
    mockUseAuth.mockReturnValue({ user: NON_STAFF_USER, loading: false, isAuthenticated: true });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toBeNull();
  });

  it('does not fetch when user is null (unauthenticated)', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
    renderHook(() => useNPSSummary());
    await act(async () => {});
    expect(mockQueryData).not.toHaveBeenCalled();
  });

  it('isStaff=false when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStaff).toBe(false);
  });

  it('fetches data when user is staff', async () => {
    renderHook(() => useNPSSummary());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(1));
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('useNPSSummary — loading state', () => {
  it('starts loading=true for staff users before fetch completes', async () => {
    let resolve!: (v: { items: unknown[]; totalResults: number }) => void;
    mockQueryData.mockImplementation(
      () => new Promise((res) => { resolve = res; }),
    );

    const { result } = renderHook(() => useNPSSummary());
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve({ items: [], totalResults: 0 }); });
  });

  it('sets loading=false after fetch completes', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('starts loading=false for non-staff (no fetch needed)', () => {
    mockUseAuth.mockReturnValue({ user: NON_STAFF_USER, loading: false, isAuthenticated: true });
    const { result } = renderHook(() => useNPSSummary());
    expect(result.current.loading).toBe(false);
  });
});

// ── avgScore ──────────────────────────────────────────────────────────────────

describe('useNPSSummary — avgScore', () => {
  it('returns avgScore=null when there are no responses', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.avgScore).toBeNull();
  });

  it('returns correct avgScore for a single response', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeResponse({ score: 9 })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.avgScore).toBe(9);
  });

  it('returns correct avgScore for multiple responses', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', score: 10 }),
        makeResponse({ id: 'r2', score: 8 }),
        makeResponse({ id: 'r3', score: 6 }),
      ],
      totalResults: 3,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // (10 + 8 + 6) / 3 = 8.0
    expect(result.current.summary?.avgScore).toBe(8);
  });

  it('rounds avgScore to 1 decimal place', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', score: 10 }),
        makeResponse({ id: 'r2', score: 9 }),
        makeResponse({ id: 'r3', score: 8 }),
      ],
      totalResults: 3,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // (10 + 9 + 8) / 3 = 9.0
    expect(result.current.summary?.avgScore).toBe(9);
  });

  it('handles non-integer average correctly', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', score: 10 }),
        makeResponse({ id: 'r2', score: 7 }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // (10 + 7) / 2 = 8.5
    expect(result.current.summary?.avgScore).toBe(8.5);
  });
});

// ── responseCount ──────────────────────────────────────────────────────────────

describe('useNPSSummary — responseCount', () => {
  it('returns 0 when there are no responses', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.responseCount).toBe(0);
  });

  it('returns count matching number of items', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1' }),
        makeResponse({ id: 'r2' }),
        makeResponse({ id: 'r3' }),
      ],
      totalResults: 3,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.responseCount).toBe(3);
  });
});

// ── recentComments ─────────────────────────────────────────────────────────────

describe('useNPSSummary — recentComments', () => {
  it('returns empty array when no responses have comments', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', comment: undefined }),
        makeResponse({ id: 'r2', comment: undefined }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toEqual([]);
  });

  it('excludes responses with empty string comments', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeResponse({ id: 'r1', comment: '' })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toHaveLength(0);
  });

  it('excludes responses with whitespace-only comments', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeResponse({ id: 'r1', comment: '   ' })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toHaveLength(0);
  });

  it('includes responses with non-empty comments', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeResponse({ id: 'r1', comment: 'Great product!' })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toHaveLength(1);
  });

  it('caps recentComments at 5', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', comment: 'Comment 1' }),
        makeResponse({ id: 'r2', comment: 'Comment 2' }),
        makeResponse({ id: 'r3', comment: 'Comment 3' }),
        makeResponse({ id: 'r4', comment: 'Comment 4' }),
        makeResponse({ id: 'r5', comment: 'Comment 5' }),
        makeResponse({ id: 'r6', comment: 'Comment 6' }),
      ],
      totalResults: 6,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toHaveLength(5);
  });

  it('takes the first 5 (most recent) when more than 5 have comments', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', comment: 'Newest', createdAt: '2026-03-06T00:00:00Z' }),
        makeResponse({ id: 'r2', comment: 'Second' }),
        makeResponse({ id: 'r3', comment: 'Third' }),
        makeResponse({ id: 'r4', comment: 'Fourth' }),
        makeResponse({ id: 'r5', comment: 'Fifth' }),
        makeResponse({ id: 'r6', comment: 'Oldest', createdAt: '2026-01-01T00:00:00Z' }),
      ],
      totalResults: 6,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ids = result.current.summary?.recentComments.map((c) => c.id);
    expect(ids).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(ids).not.toContain('r6');
  });

  it('includes score, comment, createdAt, and id on each recentComment', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', score: 9, comment: 'Wonderful', createdAt: '2026-02-01T00:00:00Z' }),
      ],
      totalResults: 1,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const c = result.current.summary?.recentComments[0];
    expect(c?.id).toBe('r1');
    expect(c?.score).toBe(9);
    expect(c?.comment).toBe('Wonderful');
    expect(c?.createdAt).toBe('2026-02-01T00:00:00Z');
  });

  it('mixes commented and non-commented responses correctly', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeResponse({ id: 'r1', comment: 'Good' }),
        makeResponse({ id: 'r2', comment: undefined }),
        makeResponse({ id: 'r3', comment: 'Excellent' }),
      ],
      totalResults: 3,
    });
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary?.recentComments).toHaveLength(2);
    expect(result.current.summary?.recentComments.map((c) => c.id)).toEqual(['r1', 'r3']);
  });
});

// ── Query options ──────────────────────────────────────────────────────────────

describe('useNPSSummary — query options', () => {
  it('queries the SurveyResponses collection', async () => {
    renderHook(() => useNPSSummary());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData.mock.calls[0][0]).toBe('SurveyResponses');
  });

  it('sorts by createdAt DESC', async () => {
    renderHook(() => useNPSSummary());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    const opts = mockQueryData.mock.calls[0][1];
    expect(opts?.sort).toContainEqual({ fieldName: 'createdAt', order: 'DESC' });
  });
});

// ── No wixClient ───────────────────────────────────────────────────────────────

describe('useNPSSummary — no wixClient', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('sets error when wixClient is unavailable', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('summary is null when wixClient is unavailable', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toBeNull();
  });

  it('does not call queryData when wixClient is null', async () => {
    renderHook(() => useNPSSummary());
    await act(async () => {});
    expect(mockQueryData).not.toHaveBeenCalled();
  });
});

// ── Query failure ──────────────────────────────────────────────────────────────

describe('useNPSSummary — query failure', () => {
  it('sets error when queryData rejects', async () => {
    mockQueryData.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('error message matches thrown error', async () => {
    mockQueryData.mockRejectedValue(new Error('Collection unavailable'));
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Collection unavailable');
  });

  it('calls captureException on query failure', async () => {
    const err = new Error('DB error');
    mockQueryData.mockRejectedValue(err);
    renderHook(() => useNPSSummary());
    await waitFor(() => expect(captureException).toHaveBeenCalledWith(err));
  });

  it('summary is null after query failure', async () => {
    mockQueryData.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toBeNull();
  });
});

// ── refresh() ─────────────────────────────────────────────────────────────────

describe('useNPSSummary — refresh', () => {
  it('exposes a refresh function', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refresh).toBe('function');
  });

  it('re-fetches when refresh is called', async () => {
    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockQueryData).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
  });

  it('clears previous error on refresh', async () => {
    mockQueryData
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useNPSSummary());
    await waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
