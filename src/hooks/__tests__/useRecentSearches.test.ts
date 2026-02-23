import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRecentSearches, type SearchStorage } from '../useRecentSearches';

function createMockStorage(): SearchStorage & { store: Record<string, string> } {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
  };
}

describe('useRecentSearches', () => {
  it('starts with empty recent searches', () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    expect(result.current.recentSearches).toEqual([]);
  });

  it('adds a search to recent list', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch('futon'));
    expect(result.current.recentSearches).toContain('futon');
  });

  it('adds most recent search first', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch('futon'));
    await act(async () => result.current.addSearch('pillow'));
    expect(result.current.recentSearches[0]).toBe('pillow');
    expect(result.current.recentSearches[1]).toBe('futon');
  });

  it('deduplicates searches (case-insensitive)', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch('futon'));
    await act(async () => result.current.addSearch('Futon'));
    expect(result.current.recentSearches).toHaveLength(1);
    expect(result.current.recentSearches[0]).toBe('Futon');
  });

  it('caps at 8 recent searches', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    for (let i = 0; i < 12; i++) {
      await act(async () => result.current.addSearch(`search-${i}`));
    }
    expect(result.current.recentSearches.length).toBeLessThanOrEqual(8);
    // Most recent should be first
    expect(result.current.recentSearches[0]).toBe('search-11');
  });

  it('ignores empty and whitespace-only queries', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch(''));
    await act(async () => result.current.addSearch('   '));
    expect(result.current.recentSearches).toEqual([]);
  });

  it('removes a specific search', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch('futon'));
    await act(async () => result.current.addSearch('pillow'));
    await act(async () => result.current.removeSearch('futon'));
    expect(result.current.recentSearches).toEqual(['pillow']);
  });

  it('clears all searches', async () => {
    const { result } = renderHook(() => useRecentSearches(createMockStorage()));
    await act(async () => result.current.addSearch('futon'));
    await act(async () => result.current.addSearch('pillow'));
    await act(async () => result.current.clearAll());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('loads from storage on mount', async () => {
    const storage = createMockStorage();
    storage.store['cfutons_recent_searches'] = JSON.stringify(['saved-query', 'old-search']);
    const { result } = renderHook(() => useRecentSearches(storage));
    await waitFor(() => {
      expect(result.current.recentSearches).toContain('saved-query');
      expect(result.current.recentSearches).toContain('old-search');
    });
  });

  it('persists to storage on add', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useRecentSearches(storage));
    await act(async () => result.current.addSearch('test-persist'));
    await waitFor(() => {
      expect(storage.setItem).toHaveBeenCalled();
      const stored = JSON.parse(storage.store['cfutons_recent_searches'] ?? '[]');
      expect(stored).toContain('test-persist');
    });
  });

  it('persists to storage on remove', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useRecentSearches(storage));
    await act(async () => result.current.addSearch('a'));
    await act(async () => result.current.addSearch('b'));
    await act(async () => result.current.removeSearch('a'));
    await waitFor(() => {
      const stored = JSON.parse(storage.store['cfutons_recent_searches'] ?? '[]');
      expect(stored).toEqual(['b']);
    });
  });

  it('persists to storage on clear', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useRecentSearches(storage));
    await act(async () => result.current.addSearch('a'));
    await act(async () => result.current.clearAll());
    await waitFor(() => {
      const stored = JSON.parse(storage.store['cfutons_recent_searches'] ?? '[]');
      expect(stored).toEqual([]);
    });
  });
});
