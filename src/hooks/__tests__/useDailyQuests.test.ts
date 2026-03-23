/**
 * useDailyQuests tests — cf-mz3
 *
 * TDD spec for the hook that loads daily quests, stores them with the
 * current date, and triggers a refresh when the date changes (midnight reset).
 * Includes API integration via getMyDailyQuests webMethod (cf-6tv).
 */
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDailyQuests } from '../useDailyQuests';

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockCallFunction = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

const TODAY = '2026-03-23';
const YESTERDAY = '2026-03-22';

const MOCK_QUESTS_JSON = JSON.stringify({
  date: TODAY,
  quests: [
    { id: 'q1', title: 'Browse 3 products', action: 'purchase', pointReward: 25, completed: false },
    { id: 'q2', title: 'Write a review', action: 'review', pointReward: 100, completed: false },
    { id: 'q3', title: 'Try AR on a product', action: 'ar', pointReward: 50, completed: false },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────────────

// ── API response fixture ───────────────────────────────────────────────────

const API_QUESTS_TODAY = {
  date: TODAY,
  quests: [
    { id: 'api-q1', title: 'Place an order today', action: 'purchase', pointReward: 50, completed: false, completedAt: null },
    { id: 'api-q2', title: 'Write a product review', action: 'review', pointReward: 30, completed: true, completedAt: '2026-03-23T09:00:00Z' },
    { id: 'api-q3', title: 'Refer a friend', action: 'referral', pointReward: 75, completed: false, completedAt: null },
  ],
};

describe('useDailyQuests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default date: today
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${TODAY}T10:00:00.000Z`);
    // Default: no Wix client (unauthenticated / offline)
    mockUseOptionalWixClient.mockReturnValue(null);
    mockCallFunction.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Initial load ────────────────────────────────────────────────────────

  it('starts with loading=true and empty quests', () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyQuests());
    expect(result.current.loading).toBe(true);
    expect(result.current.quests).toEqual([]);
  });

  it('returns mock quests after mount when no stored data', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.quests).toHaveLength(3);
  });

  it('persists quests to AsyncStorage with today\'s date on first load', async () => {
    mockGetItem.mockResolvedValue(null);
    renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      'daily-quests',
      expect.stringContaining(`"date":"${TODAY}"`),
    );
  });

  // ── Cached data ─────────────────────────────────────────────────────────

  it('uses stored quests when stored date matches today', async () => {
    mockGetItem.mockResolvedValue(MOCK_QUESTS_JSON);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.quests).toHaveLength(3);
    expect(result.current.quests[0].id).toBe('q1');
  });

  it('does not re-persist when stored date matches today', async () => {
    mockGetItem.mockResolvedValue(MOCK_QUESTS_JSON);
    renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  // ── Midnight refresh ────────────────────────────────────────────────────

  it('loads fresh quests when stored date is yesterday (midnight crossed)', async () => {
    const staleData = JSON.stringify({
      date: YESTERDAY,
      quests: [
        { id: 'old-q', title: 'Old quest', action: 'purchase', pointReward: 10, completed: true },
      ],
    });
    mockGetItem.mockResolvedValue(staleData);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    // Stale data discarded — fresh mock quests loaded (3 quests)
    expect(result.current.quests).toHaveLength(3);
    // Fresh quests are incomplete by default
    expect(result.current.quests.every((q) => !q.completed)).toBe(true);
  });

  it('persists refreshed quests with today\'s date after midnight refresh', async () => {
    const staleData = JSON.stringify({ date: YESTERDAY, quests: [] });
    mockGetItem.mockResolvedValue(staleData);
    renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      'daily-quests',
      expect.stringContaining(`"date":"${TODAY}"`),
    );
  });

  // ── Refresh function ────────────────────────────────────────────────────

  it('refresh() reloads quests and sets loading briefly', async () => {
    mockGetItem.mockResolvedValue(MOCK_QUESTS_JSON);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.loading).toBe(false);

    // Call refresh
    await act(async () => {
      result.current.refresh();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.quests).toHaveLength(3);
  });

  // ── Quest shape ─────────────────────────────────────────────────────────

  it('returned quests have id, title, action, pointReward, completed fields', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    const q = result.current.quests[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('title');
    expect(q).toHaveProperty('action');
    expect(q).toHaveProperty('pointReward');
    expect(q).toHaveProperty('completed');
  });

  it('fresh quests start with completed=false', async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.quests.every((q) => q.completed === false)).toBe(true);
  });

  // ── Error resilience ────────────────────────────────────────────────────

  it('falls back to mock quests when AsyncStorage.getItem throws', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage read failed'));
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.quests).toHaveLength(3);
  });

  it('recovers gracefully when stored JSON is malformed', async () => {
    mockGetItem.mockResolvedValue('not-valid-json{{');
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.quests).toHaveLength(3);
  });

  // ── API integration (cf-6tv) ─────────────────────────────────────────────

  it('calls getMyDailyQuests API when Wix client is available and no cache', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(API_QUESTS_TODAY);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/getMyDailyQuests', 'POST', {});
    expect(result.current.quests).toHaveLength(3);
    expect(result.current.quests[0].id).toBe('api-q1');
  });

  it('maps API completed flag correctly', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(API_QUESTS_TODAY);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.quests[0].completed).toBe(false);
    expect(result.current.quests[1].completed).toBe(true);
  });

  it('persists API response to AsyncStorage with today\'s date', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(API_QUESTS_TODAY);
    renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockSetItem).toHaveBeenCalledWith(
      'daily-quests',
      expect.stringContaining(`"date":"${TODAY}"`),
    );
  });

  it('uses cached data (same day) even when Wix client is available', async () => {
    mockGetItem.mockResolvedValue(MOCK_QUESTS_JSON);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    // Cache hit — API should not be called
    expect(mockCallFunction).not.toHaveBeenCalled();
    expect(result.current.quests[0].id).toBe('q1');
  });

  it('falls back to mock quests when API call fails', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockRejectedValue(new Error('API unavailable'));
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.quests).toHaveLength(3);
  });

  it('uses mock quests when Wix client is unavailable (no auth)', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockCallFunction).not.toHaveBeenCalled();
    expect(result.current.quests).toHaveLength(3);
  });

  it('refresh() bypasses cache and re-fetches from API', async () => {
    // First load uses cache
    mockGetItem.mockResolvedValue(MOCK_QUESTS_JSON);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(API_QUESTS_TODAY);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    expect(mockCallFunction).not.toHaveBeenCalled();

    // Refresh should bypass cache and call API
    await act(async () => {
      result.current.refresh();
    });
    expect(mockCallFunction).toHaveBeenCalledTimes(1);
    expect(result.current.quests[0].id).toBe('api-q1');
  });

  it('API quest with action "referral" is preserved in mapped quest', async () => {
    mockGetItem.mockResolvedValue(null);
    mockUseOptionalWixClient.mockReturnValue({ callFunction: mockCallFunction });
    mockCallFunction.mockResolvedValue(API_QUESTS_TODAY);
    const { result } = renderHook(() => useDailyQuests());
    await act(async () => {});
    const referralQuest = result.current.quests.find((q) => q.action === 'referral');
    expect(referralQuest).toBeDefined();
    expect(referralQuest?.id).toBe('api-q3');
  });
});
