/**
 * Tests for useReferral hook — cm-z0x referral program.
 *
 * Covers:
 * - Fetches referral code from Wix ReferralCodes CMS by memberId
 * - Stores referred-by code from deep link in AsyncStorage
 * - Error states: unauthenticated, no code yet, API failure
 * - Share URL generation
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReferral } from '../useReferral';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MEMBER_ID = 'member-abc-123';
const REFERRAL_CODE = 'FUTON-XK7P';

const WIX_REFERRAL_ITEM = {
  memberId: MEMBER_ID,
  code: REFERRAL_CODE,
  creditsEarned: 40,
  referralCount: 2,
};

function makeClient() {
  return { queryData: mockQueryData };
}

function makeAuth(memberId: string | null = MEMBER_ID) {
  return { user: memberId ? { id: memberId } : null };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(makeClient());
  mockUseAuth.mockReturnValue(makeAuth());
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockQueryData.mockResolvedValue({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
});

// ── Section 1: Loading state ───────────────────────────────────────────────────

describe('loading state', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useReferral());
    expect(result.current.loading).toBe(true);
  });

  it('sets loading to false after fetch resolves', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Section 2: Successful fetch ───────────────────────────────────────────────

describe('successful fetch', () => {
  it('returns the referral code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBe(REFERRAL_CODE);
  });

  it('returns creditsEarned', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.creditsEarned).toBe(40);
  });

  it('returns referralCount', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referralCount).toBe(2);
  });

  it('queries ReferralCodes collection filtered by memberId', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'ReferralCodes',
      expect.objectContaining({
        filter: expect.objectContaining({ memberId: MEMBER_ID }),
      }),
    );
  });

  it('generates a share URL using the referral code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shareUrl).toContain(REFERRAL_CODE);
    expect(result.current.shareUrl).toContain('carolinafutons.com');
  });

  it('has no error when fetch succeeds', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

// ── Section 3: Unauthenticated ─────────────────────────────────────────────────

describe('unauthenticated user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth(null));
  });

  it('does not fetch when user is null', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockQueryData).not.toHaveBeenCalled());
  });

  it('sets error to unauthenticated message', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/sign in/i);
  });

  it('returns null code when unauthenticated', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBeNull();
  });
});

// ── Section 4: No code yet ────────────────────────────────────────────────────

describe('no referral code yet', () => {
  beforeEach(() => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  it('returns null code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBeNull();
  });

  it('sets error to no-code message', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/not.*available|no.*code/i);
  });

  it('returns 0 creditsEarned', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.creditsEarned).toBe(0);
  });
});

// ── Section 5: API failure ────────────────────────────────────────────────────

describe('API failure', () => {
  beforeEach(() => {
    mockQueryData.mockRejectedValue(new Error('Network error'));
  });

  it('sets error on API failure', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('returns null code on API failure', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBeNull();
  });

  it('sets loading to false after API failure', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Section 6: No wix client ──────────────────────────────────────────────────

describe('no wix client', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('sets error when wix client unavailable', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

// ── Section 7: Referred-by code storage ──────────────────────────────────────

describe('storeReferredByCode', () => {
  it('saves the code to AsyncStorage', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.storeReferredByCode('FRIEND-CODE');
    });
    expect(mockSetItem).toHaveBeenCalledWith(expect.stringContaining('referral'), 'FRIEND-CODE');
  });

  it('ignores empty code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.storeReferredByCode('');
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('ignores whitespace-only code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.storeReferredByCode('   ');
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

// ── Section 8: Referred-by code loading ──────────────────────────────────────

describe('referredByCode', () => {
  it('returns the stored code from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('FRIEND-STORED');
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referredByCode).toBe('FRIEND-STORED');
  });

  it('returns null when no code stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referredByCode).toBeNull();
  });
});
