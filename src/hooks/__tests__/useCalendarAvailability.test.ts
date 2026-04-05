/**
 * Tests for useCalendarAvailability — cm-lfe
 *
 * AC:
 *  1. Fetches taken-slot counts for each date in a given range
 *  2. Returns correct availableCount per day (totalSlots - taken)
 *  3. Marks past dates with status 'past'
 *  4. Marks fully-booked days with status 'full'
 *  5. Handles loading and error states
 *  6. No-ops gracefully when Wix client is unavailable
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCalendarAvailability } from '../useCalendarAvailability';
import { ALL_SLOTS } from '../useConsultationBooking';

// --- Mocks ---

const mockQueryData = jest.fn();
let mockWixClient: { queryData: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

// --- Constants ---

const TOTAL_SLOTS = ALL_SLOTS.length; // 14
const TODAY = '2026-04-10';
const YESTERDAY = '2026-04-09';
const TOMORROW = '2026-04-11';
const DAY_AFTER = '2026-04-12';

const getNowToday = () => new Date('2026-04-10T09:00:00Z');

// --- Tests ---

describe('useCalendarAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { queryData: mockQueryData };
    // Default: no taken slots for any date
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('availability is empty object before fetchRange is called', () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));
      expect(result.current.availability).toEqual({});
    });

    it('isLoading is false initially', () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));
      expect(result.current.isLoading).toBe(false);
    });

    it('error is null initially', () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));
      expect(result.current.error).toBeNull();
    });
  });

  // --- AC 1: Fetches for each date in range ---

  describe('fetchRange', () => {
    it('queries ConsultationBookings for each date in the range', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => {
        result.current.fetchRange(TODAY, 2);
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should query for TODAY and TOMORROW
      const queriedDates = mockQueryData.mock.calls.map(
        ([, filter]: [string, { filter: { date: { $eq: string } } }]) => filter.filter.date.$eq,
      );
      expect(queriedDates).toContain(TODAY);
      expect(queriedDates).toContain(TOMORROW);
    });

    it('populates availability keys for each requested date', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => {
        result.current.fetchRange(TODAY, 3);
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY]).toBeDefined();
      expect(result.current.availability[TOMORROW]).toBeDefined();
      expect(result.current.availability[DAY_AFTER]).toBeDefined();
    });
  });

  // --- AC 2: Correct availableCount ---

  describe('availableCount', () => {
    it('returns totalSlots available when no bookings exist', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY].availableCount).toBe(TOTAL_SLOTS);
      expect(result.current.availability[TODAY].totalSlots).toBe(TOTAL_SLOTS);
    });

    it('deducts taken slots from availableCount', async () => {
      mockQueryData.mockResolvedValue({
        items: [{ timeSlot: '09:00' }, { timeSlot: '09:30' }, { timeSlot: '10:00' }],
        totalResults: 3,
      });

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY].availableCount).toBe(TOTAL_SLOTS - 3);
    });

    it('reports availableCount 0 when all slots taken', async () => {
      mockQueryData.mockResolvedValue({
        items: ALL_SLOTS.map((s) => ({ timeSlot: s })),
        totalResults: TOTAL_SLOTS,
      });

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY].availableCount).toBe(0);
    });
  });

  // --- AC 3: Past dates ---

  describe('past dates', () => {
    it('marks dates before today as status "past" without querying', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(YESTERDAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[YESTERDAY]?.status).toBe('past');
      // Should not have queried Wix for past dates
      const queriedDates = mockQueryData.mock.calls.map(
        ([, filter]: [string, { filter: { date: { $eq: string } } }]) => filter?.filter?.date?.$eq,
      );
      expect(queriedDates).not.toContain(YESTERDAY);
    });

    it('does not mark today as past', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY]?.status).not.toBe('past');
    });
  });

  // --- AC 4: Full days ---

  describe('full days', () => {
    it('marks days with 0 available slots as status "full"', async () => {
      mockQueryData.mockResolvedValue({
        items: ALL_SLOTS.map((s) => ({ timeSlot: s })),
        totalResults: TOTAL_SLOTS,
      });

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY].status).toBe('full');
    });

    it('marks days with available slots as status "available"', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.availability[TODAY].status).toBe('available');
    });
  });

  // --- AC 5: Loading and error states ---

  describe('loading and error', () => {
    it('sets isLoading true during fetch', async () => {
      let resolveQuery!: (value: unknown) => void;
      mockQueryData.mockReturnValue(
        new Promise((res) => {
          resolveQuery = res;
        }),
      );

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      act(() => {
        result.current.fetchRange(TODAY, 1);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveQuery({ items: [], totalResults: 0 });
      });
    });

    it('sets isLoading false after fetch completes', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on query failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).not.toBeNull();
    });

    it('clears error on subsequent successful fetch', async () => {
      mockQueryData.mockRejectedValueOnce(new Error('fail'));

      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 1));
      await waitFor(() => expect(result.current.error).not.toBeNull());

      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      await act(async () => result.current.fetchRange(TOMORROW, 1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
    });
  });

  // --- AC 6: No Wix client ---

  describe('no Wix client', () => {
    beforeEach(() => {
      mockWixClient = null;
    });

    it('populates all days as available without querying when no client', async () => {
      const { result } = renderHook(() => useCalendarAvailability({ getNow: getNowToday }));

      await act(async () => result.current.fetchRange(TODAY, 2));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockQueryData).not.toHaveBeenCalled();
      expect(result.current.availability[TODAY]?.status).toBe('available');
      expect(result.current.availability[TOMORROW]?.status).toBe('available');
    });
  });
});
