/**
 * Tests for useReferral hook — cm-z0x + cm-9sa referral program.
 *
 * Covers:
 * - Fetches referral code from Wix ReferralCodes CMS by memberId
 * - Fetches individual referral records from Wix Referrals collection
 * - Stores referred-by code from deep link in AsyncStorage
 * - submitReferral writes a new record to the Referrals collection
 * - Error states: unauthenticated, no code yet, API failure
 * - Share URL generation
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReferral } from '../useReferral';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
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

const REFEREE_EMAIL = 'friend@example.com';

const WIX_REFERRALS_RECORD = {
  _id: 'ref-record-001',
  referralCode: REFERRAL_CODE,
  referrerMemberId: MEMBER_ID,
  refereeEmail: REFEREE_EMAIL,
  referrerCredit: 25,
  refereeCredit: 25,
  status: 'pending',
};

function makeClient() {
  return { queryData: mockQueryData, insertDataItem: mockInsertDataItem };
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
  mockInsertDataItem.mockResolvedValue({
    id: 'new-ref-id',
    data: { ...WIX_REFERRALS_RECORD, _id: 'new-ref-id' },
  });
  mockQueryData.mockImplementation((collection: string) => {
    if (collection === 'ReferralCodes')
      return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
    if (collection === 'Referrals')
      return Promise.resolve({ items: [], totalResults: 0 });
    return Promise.resolve({ items: [], totalResults: 0 });
  });
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

// ── Section 4: Auto-generate referral code when none exists (cm-1ny) ──────────

describe('auto-generates referral code when none exists', () => {
  beforeEach(() => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    mockInsertDataItem.mockResolvedValue({ id: 'new-code-id' });
  });

  it('calls insertDataItem for ReferralCodes when query returns empty', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockInsertDataItem).toHaveBeenCalled());
    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'ReferralCodes',
      expect.objectContaining({ memberId: MEMBER_ID }),
    );
  });

  it('inserts a code matching FUTON-XXXX format (4 uppercase alphanumeric)', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockInsertDataItem).toHaveBeenCalled());
    const payload = mockInsertDataItem.mock.calls[0][1];
    expect(payload.code).toMatch(/^FUTON-[A-Z0-9]{4}$/);
  });

  it('inserts with creditsEarned: 0 and referralCount: 0', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockInsertDataItem).toHaveBeenCalled());
    const payload = mockInsertDataItem.mock.calls[0][1];
    expect(payload.creditsEarned).toBe(0);
    expect(payload.referralCount).toBe(0);
  });

  it('sets code to the generated value (not null)', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toMatch(/^FUTON-[A-Z0-9]{4}$/);
  });

  it('sets no error after successful auto-generation', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('sets shareUrl using the generated code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shareUrl).toMatch(
      /^https:\/\/carolinafutons\.com\/referral\/FUTON-[A-Z0-9]{4}$/,
    );
  });

  it('returns 0 creditsEarned for a freshly generated code', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.creditsEarned).toBe(0);
  });

  it('sets error and keeps code null when insertDataItem fails', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('calls captureException when insertDataItem fails', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));
    renderHook(() => useReferral());
    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'error',
      expect.objectContaining({ action: 'useReferral/generateReferralCode' }),
    );
  });

  it('does not insert ReferralCode when member is unauthenticated', async () => {
    mockUseAuth.mockReturnValue(makeAuth(null));
    renderHook(() => useReferral());
    await new Promise((r) => setTimeout(r, 50));
    const referralCodeInserts = mockInsertDataItem.mock.calls.filter(([col]) => col === 'ReferralCodes');
    expect(referralCodeInserts).toHaveLength(0);
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

// ── Section 9: Referrals collection reads (cm-9sa) ──────────────────────────

describe('referrals list', () => {
  it('returns empty referrals array by default', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toEqual([]);
  });

  it('queries Referrals collection filtered by referrerMemberId', async () => {
    renderHook(() => useReferral());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalledWith('Referrals', expect.anything()));
    expect(mockQueryData).toHaveBeenCalledWith(
      'Referrals',
      expect.objectContaining({ filter: expect.objectContaining({ referrerMemberId: MEMBER_ID }) }),
    );
  });

  it('returns mapped referral records with all fields', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes')
        return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
      if (collection === 'Referrals')
        return Promise.resolve({ items: [WIX_REFERRALS_RECORD], totalResults: 1 });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toHaveLength(1);
    const rec = result.current.referrals[0];
    expect(rec._id).toBe('ref-record-001');
    expect(rec.referralCode).toBe(REFERRAL_CODE);
    expect(rec.referrerMemberId).toBe(MEMBER_ID);
    expect(rec.refereeEmail).toBe(REFEREE_EMAIL);
    expect(rec.referrerCredit).toBe(25);
    expect(rec.refereeCredit).toBe(25);
    expect(rec.status).toBe('pending');
  });

  it('returns empty referrals when unauthenticated', async () => {
    mockUseAuth.mockReturnValue(makeAuth(null));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toEqual([]);
  });

  it('returns empty referrals on Referrals query failure without blocking code load', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes')
        return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
      if (collection === 'Referrals') return Promise.reject(new Error('Referrals API error'));
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toEqual([]);
    // ReferralCodes fetch still succeeds and error is not set from Referrals failure
    expect(result.current.code).toBe(REFERRAL_CODE);
    expect(result.current.error).toBeNull();
    // Non-blocking failure is still reported to crash reporting
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'error',
      expect.objectContaining({ action: 'useReferral/fetchReferrals' }),
    );
  });

  it('maps status=completed through correctly', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes')
        return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
      if (collection === 'Referrals')
        return Promise.resolve({
          items: [{ ...WIX_REFERRALS_RECORD, status: 'completed' }],
          totalResults: 1,
        });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals[0].status).toBe('completed');
  });

  it('maps status=expired through correctly', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes')
        return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
      if (collection === 'Referrals')
        return Promise.resolve({
          items: [{ ...WIX_REFERRALS_RECORD, status: 'expired' }],
          totalResults: 1,
        });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals[0].status).toBe('expired');
  });

  it('normalizes unknown status to pending', async () => {
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes')
        return Promise.resolve({ items: [WIX_REFERRAL_ITEM], totalResults: 1 });
      if (collection === 'Referrals')
        return Promise.resolve({
          items: [{ ...WIX_REFERRALS_RECORD, status: 'cancelled' }],
          totalResults: 1,
        });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals[0].status).toBe('pending');
  });
});

// ── Section 10: submitReferral (cm-9sa) ──────────────────────────────────────

describe('submitReferral', () => {
  it('calls insertDataItem with correct Referrals payload', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitReferral(REFEREE_EMAIL);
    });
    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'Referrals',
      expect.objectContaining({
        referralCode: REFERRAL_CODE,
        referrerMemberId: MEMBER_ID,
        refereeEmail: REFEREE_EMAIL,
        referrerCredit: 25,
        refereeCredit: 25,
        status: 'pending',
      }),
    );
  });

  it('optimistically adds the new record to referrals list', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toHaveLength(0);
    await act(async () => {
      await result.current.submitReferral(REFEREE_EMAIL);
    });
    expect(result.current.referrals).toHaveLength(1);
    expect(result.current.referrals[0].refereeEmail).toBe(REFEREE_EMAIL);
    expect(result.current.referrals[0].status).toBe('pending');
  });

  it('throws if wix client is unavailable', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow();
  });

  it('throws if member is not authenticated', async () => {
    mockUseAuth.mockReturnValue(makeAuth(null));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow();
  });

  it('throws if referral code failed to load or generate', async () => {
    // query empty + insert fails → code stays null
    mockQueryData.mockImplementation((collection: string) => {
      if (collection === 'ReferralCodes') return Promise.resolve({ items: [], totalResults: 0 });
      return Promise.resolve({ items: [], totalResults: 0 });
    });
    mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow();
  });

  it('propagates API error from insertDataItem', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow('Insert failed');
  });

  it('trims whitespace from refereeEmail before submitting', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.submitReferral('  friend@example.com  ');
    });
    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'Referrals',
      expect.objectContaining({ refereeEmail: 'friend@example.com' }),
    );
  });

  it('throws if refereeEmail is empty or whitespace-only', async () => {
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral('   ');
      }),
    ).rejects.toThrow();
    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });

  it('leaves referrals list unchanged on insertDataItem failure', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.referrals).toHaveLength(0);
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow();
    expect(result.current.referrals).toHaveLength(0);
  });

  it('throws if insertDataItem returns no id', async () => {
    mockInsertDataItem.mockResolvedValue({ id: undefined, data: {} });
    const { result } = renderHook(() => useReferral());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.submitReferral(REFEREE_EMAIL);
      }),
    ).rejects.toThrow();
    // No phantom record added when id is missing
    expect(result.current.referrals).toHaveLength(0);
  });
});
