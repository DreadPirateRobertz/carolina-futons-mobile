/**
 * @module usePointsHistory.test
 *
 * TDD tests for usePointsHistory hook.
 * cf-g4r / Phase 7 gamification
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePointsHistory } from '../usePointsHistory';

const mockCallFunction = jest.fn();
let mockWixClient: { callFunction: jest.Mock } | null = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const MOCK_EVENTS = [
  {
    id: 'ev-1',
    type: 'purchase',
    description: 'Ordered Ashley Sectional',
    points: 250,
    earnedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'ev-2',
    type: 'review',
    description: 'Reviewed Blue Ridge Sofa',
    points: 50,
    earnedAt: '2026-03-18T09:00:00Z',
  },
  {
    id: 'ev-3',
    type: 'challenge_complete',
    description: 'Spring Refresh challenge',
    points: 500,
    earnedAt: '2026-03-15T16:00:00Z',
  },
];

describe('usePointsHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { callFunction: mockCallFunction };
    mockCallFunction.mockResolvedValue({ events: MOCK_EVENTS });
  });

  it('returns loading=true initially', () => {
    const { result } = renderHook(() => usePointsHistory());
    expect(result.current.loading).toBe(true);
  });

  it('fetches events and sets them on success', async () => {
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toHaveLength(3);
    expect(result.current.events[0].id).toBe('ev-1');
    expect(result.current.events[0].type).toBe('purchase');
    expect(result.current.events[0].points).toBe(250);
    expect(result.current.error).toBeNull();
  });

  it('calls correct API endpoint', async () => {
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/getMyActivity', 'GET');
  });

  it('returns empty events when API returns empty array', async () => {
    mockCallFunction.mockResolvedValue({ events: [] });
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toEqual([]);
  });

  it('sets error when API fails', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.events).toEqual([]);
  });

  it('falls back to mock data when wix client is null', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('handles malformed API response gracefully (events: null)', async () => {
    mockCallFunction.mockResolvedValue({ events: null });
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toEqual([]);
  });

  it('exposes a refresh function that re-triggers fetch', async () => {
    const { result } = renderHook(() => usePointsHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refresh).toBe('function');
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCallFunction).toHaveBeenCalledTimes(2);
  });
});
