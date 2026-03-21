/**
 * Tests for Wix CMS-aware useStores hook.
 * Verifies that store data comes from Wix when configured,
 * falls back to static data when not.
 */

import { renderHook, waitFor } from '@testing-library/react-native';

// Need to import AFTER mocks
import { useStores } from '../useStores';
import { STORES } from '@/data/stores';

const mockQueryData = jest.fn();
let mockConfigured = false;

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => (mockConfigured ? { queryData: mockQueryData } : null),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigured = false;
});

describe('useStores — mock fallback (Wix not configured)', () => {
  it('returns static STORES data when Wix is not configured', () => {
    mockConfigured = false;
    const { result } = renderHook(() => useStores());
    expect(result.current.stores).toEqual(STORES);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not call Wix API when not configured', () => {
    mockConfigured = false;
    renderHook(() => useStores());
    expect(mockQueryData).not.toHaveBeenCalled();
  });
});

describe('useStores — Wix CMS', () => {
  const wixStores = [
    {
      id: 's1',
      name: 'Downtown Showroom',
      address: '100 Main St',
      city: 'Charlotte',
      state: 'NC',
      zip: '28202',
      phone: '704-555-0100',
      email: 'charlotte@carolinafutons.com',
      latitude: 35.227,
      longitude: -80.843,
      hours: [],
      photos: [],
      features: [],
      description: 'Our flagship showroom',
    },
  ];

  beforeEach(() => {
    mockConfigured = true;
    mockQueryData.mockResolvedValue({
      items: wixStores,
      totalResults: 1,
    });
  });

  it('fetches stores from Wix CMS when configured', async () => {
    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockQueryData).toHaveBeenCalledWith('Showrooms', expect.any(Object));
    expect(result.current.stores).toEqual(wixStores);
    expect(result.current.error).toBeNull();
  });

  it('falls back to static data on Wix API error', async () => {
    mockQueryData.mockRejectedValue(new Error('CMS unavailable'));

    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to static stores, not error out
    expect(result.current.stores).toEqual(STORES);
    expect(result.current.error).toBeNull();
  });

  it('provides working getStoreById for Wix data', async () => {
    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const store = result.current.getStoreById('s1');
    expect(store).toBeDefined();
    expect(store?.city).toBe('Charlotte');
  });
});
