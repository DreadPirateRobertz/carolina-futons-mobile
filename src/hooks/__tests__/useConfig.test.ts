/**
 * Tests for useConfig — fetches app config from Wix CMS TrendingSearches collection.
 * hq-jc723
 */
import { renderHook, act } from '@testing-library/react-native';
import { useConfig } from '../useConfig';

const mockQueryData = jest.fn();
// Controllable — set to null in tests that need the !wixClient branch
let mockWixClient: { queryData: jest.Mock } | null = { queryData: mockQueryData };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useConfig — trendingSearches', () => {
  beforeEach(() => {
    mockQueryData.mockReset();
    mockWixClient = { queryData: mockQueryData };
  });

  afterEach(() => {
    mockWixClient = { queryData: mockQueryData };
  });

  it('returns trending terms from CMS when available', async () => {
    mockQueryData.mockResolvedValue({
      items: [{ terms: ['futon bed', 'queen size', 'slipcover'] }],
      totalResults: 1,
    });
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual(['futon bed', 'queen size', 'slipcover']);
  });

  it('returns empty array when CMS returns no items (not a crash)', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual([]);
  });

  it('returns empty array when CMS fetch throws (graceful fallback)', async () => {
    mockQueryData.mockRejectedValue(new Error('Wix service unavailable'));
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual([]);
  });

  it('returns empty array when terms field is missing on the record', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          /* no terms field */
        },
      ],
      totalResults: 1,
    });
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual([]);
  });

  it('filters out non-string entries from terms array', async () => {
    mockQueryData.mockResolvedValue({
      items: [{ terms: ['futon', 42, null, 'slipcover', undefined] }],
      totalResults: 1,
    });
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual(['futon', 'slipcover']);
  });

  it('is not loading after fetch completes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });

  it('queries the TrendingSearches CMS collection', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    renderHook(() => useConfig());
    await act(async () => {});
    expect(mockQueryData).toHaveBeenCalledWith('TrendingSearches', expect.any(Object));
  });

  // cm-jest-coverage: hit !wixClient early-return branch (line 37)
  it('returns empty array immediately when wixClient is null (no Wix session)', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => useConfig());
    await act(async () => {});
    expect(result.current.trendingSearches).toEqual([]);
    expect(mockQueryData).not.toHaveBeenCalled();
  });
});
