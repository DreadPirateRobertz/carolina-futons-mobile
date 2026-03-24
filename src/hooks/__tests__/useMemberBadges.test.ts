/**
 * useMemberBadges tests — cm-p8-social
 *
 * Phase 8 social layer: fetch member badge showcase from Wix
 * GET /_functions/badges?memberId={userId}
 *
 * Schema (rennala CF-lac confirmation 2026-03-23):
 *   { memberId: string, badges: BadgeObject[] }
 *   BadgeObject: { badgeKey, name, tier, earnedAt, icon }
 *
 * No auth header required (public endpoint, Permissions.Anyone).
 * Leaderboard sync deferred — awaiting CF-leaderboard-endpoint bead.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMemberBadges } from '../useMemberBadges';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MEMBER_ID = 'member-abc123';

const BADGE_1 = {
  badgeKey: 'week_wanderer',
  name: 'Week Wanderer',
  tier: 'TRAIL_BLAZER',
  earnedAt: '2026-03-22T14:00:00.000Z',
  icon: '🗺️',
};
const BADGE_2 = {
  badgeKey: 'first_step',
  name: 'First Step',
  tier: 'TRAIL_BLAZER',
  earnedAt: '2026-03-15T09:00:00.000Z',
  icon: '👣',
};

function mockSuccess(badges = [BADGE_1, BADGE_2]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ memberId: MEMBER_ID, badges }),
  });
}

function mockHttpError(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: 'Internal server error' }),
  });
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts in loading state', () => {
    mockSuccess();
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    expect(result.current.loading).toBe(true);
  });

  it('loading is false after fetch resolves', async () => {
    mockSuccess();
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('happy path', () => {
  it('returns badges array on success', async () => {
    mockSuccess();
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.badges).toHaveLength(2);
  });

  it('returns correct badge shape', async () => {
    mockSuccess([BADGE_1]);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.badges[0]).toEqual(BADGE_1);
  });

  it('returns empty array when member has no badges', async () => {
    mockSuccess([]);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.badges).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('hits correct Wix endpoint URL with memberId param', async () => {
    mockSuccess();
    renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/_functions/badges');
    expect(url).toContain(`memberId=${MEMBER_ID}`);
  });

  it('does NOT send Authorization header (public endpoint)', async () => {
    mockSuccess();
    renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit | undefined];
    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ── Error states ──────────────────────────────────────────────────────────────

describe('error states', () => {
  it('returns error and empty badges on HTTP 500', async () => {
    mockHttpError(500);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.badges).toEqual([]);
  });

  it('returns error message on HTTP 404', async () => {
    mockHttpError(404);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('returns error on network failure', async () => {
    mockNetworkError();
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.badges).toEqual([]);
  });

  it('calls captureException on network error', async () => {
    const { captureException } = require('@/services/crashReporting');
    mockNetworkError();
    renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(captureException).toHaveBeenCalledTimes(1));
  });
});

// ── Null / missing memberId ───────────────────────────────────────────────────

describe('null memberId', () => {
  it('does not fetch when memberId is null', () => {
    renderHook(() => useMemberBadges(null));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty badges and no error when memberId is null', () => {
    const { result } = renderHook(() => useMemberBadges(null));
    expect(result.current.badges).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('does not fetch when memberId is empty string', () => {
    renderHook(() => useMemberBadges(''));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

describe('refresh', () => {
  it('re-fetches when refreshBadges is called', async () => {
    mockSuccess();
    mockSuccess([BADGE_1]);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.refreshBadges();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});

// ── Sorting ───────────────────────────────────────────────────────────────────

describe('badge ordering', () => {
  it('returns badges sorted newest-first by earnedAt', async () => {
    const older = { ...BADGE_2, earnedAt: '2026-01-01T00:00:00.000Z' };
    const newer = { ...BADGE_1, earnedAt: '2026-03-22T14:00:00.000Z' };
    mockSuccess([older, newer]);
    const { result } = renderHook(() => useMemberBadges(MEMBER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.badges[0].badgeKey).toBe(newer.badgeKey);
  });
});
