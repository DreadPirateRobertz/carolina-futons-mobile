/**
 * @module useSommelierResults.test
 *
 * Tests for useSommelierResults hook — fetches SommelierResults CMS data
 * for personalized HomeScreen. Covers: logged-in fetch, logged-out fallback,
 * no results fallback, API error, loading state.
 *
 * hq-5hnml
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useSommelierResults } from '../useSommelierResults';

const mockGetResults = jest.fn();
jest.mock('@/services/sommelierResults', () => ({
  getSommelierResults: (...args: unknown[]) => mockGetResults(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'member-123' }, isAuthenticated: true });
  mockGetResults.mockResolvedValue({
    topCategory: 'modern',
    flavors: ['minimalist', 'coastal'],
    recommendations: ['asheville-full-futon'],
  });
});

describe('useSommelierResults', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useSommelierResults());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.results).toBeNull();
  });

  it('fetches results for authenticated user', async () => {
    const { result } = renderHook(() => useSommelierResults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetResults).toHaveBeenCalledWith('member-123');
    expect(result.current.results).toEqual({
      topCategory: 'modern',
      flavors: ['minimalist', 'coastal'],
      recommendations: ['asheville-full-futon'],
    });
    expect(result.current.hasResults).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns null results when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });

    const { result } = renderHook(() => useSommelierResults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetResults).not.toHaveBeenCalled();
    expect(result.current.results).toBeNull();
    expect(result.current.hasResults).toBe(false);
  });

  it('handles no results for user (quiz not taken)', async () => {
    mockGetResults.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useSommelierResults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.hasResults).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles API error gracefully', async () => {
    mockGetResults.mockResolvedValueOnce(null); // getSommelierResults returns null on error

    const { result } = renderHook(() => useSommelierResults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.hasResults).toBe(false);
  });

  it('refetches when user changes', async () => {
    const { result, rerender } = renderHook(() => useSommelierResults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetResults).toHaveBeenCalledWith('member-123');

    mockUseAuth.mockReturnValue({ user: { id: 'member-456' }, isAuthenticated: true });
    mockGetResults.mockResolvedValueOnce({
      topCategory: 'rustic',
      flavors: ['warm'],
      recommendations: ['biltmore-loveseat'],
    });

    rerender({});

    await waitFor(() => {
      expect(mockGetResults).toHaveBeenCalledWith('member-456');
    });
  });
});
