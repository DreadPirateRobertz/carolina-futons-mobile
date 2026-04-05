/**
 * Tests for useBookingCancellation — cm-lfe
 *
 * AC:
 *  1. loadBookings fetches all non-cancelled bookings for a given email
 *  2. cancelBooking soft-deletes (status: 'cancelled') and sends cancellation email
 *  3. Guards against double-cancel (idempotent)
 *  4. Guards against cancelling a past booking (already occurred)
 *  5. Handles errors gracefully
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useBookingCancellation } from '../useBookingCancellation';

// --- Mocks ---

const mockQueryData = jest.fn();
const mockUpdateDataItem = jest.fn();
const mockSendCancellationEmail = jest.fn();
let mockWixClient: {
  queryData: jest.Mock;
  updateDataItem: jest.Mock;
} | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

jest.mock('@/services/bookingService', () => ({
  sendCancellationEmail: (...args: unknown[]) => mockSendCancellationEmail(...args),
}));

// --- Constants ---

const EMAIL = 'jane@example.com';
const BOOKING_ID = 'booking-abc';
const FUTURE_DATE = '2026-05-01';
const PAST_DATE = '2026-03-01';
const TIME_SLOT = '10:00';

function makeBookingItem(overrides: Record<string, unknown> = {}) {
  return {
    _id: BOOKING_ID,
    date: FUTURE_DATE,
    timeSlot: TIME_SLOT,
    memberName: 'Jane Doe',
    memberEmail: EMAIL,
    status: 'pending',
    bookedAt: '2026-04-05T09:00:00Z',
    ...overrides,
  };
}

const getNowToday = () => new Date('2026-04-10T09:00:00Z');

// --- Tests ---

describe('useBookingCancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = {
      queryData: mockQueryData,
      updateDataItem: mockUpdateDataItem,
    };
    mockQueryData.mockResolvedValue({ items: [makeBookingItem()], totalResults: 1 });
    mockUpdateDataItem.mockResolvedValue({ id: BOOKING_ID, data: {} });
    mockSendCancellationEmail.mockResolvedValue(undefined);
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('bookings is empty array initially', () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );
      expect(result.current.bookings).toHaveLength(0);
    });

    it('isLoadingBookings is false initially', () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );
      expect(result.current.isLoadingBookings).toBe(false);
    });

    it('cancelledBooking is null initially', () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );
      expect(result.current.cancelledBooking).toBeNull();
    });
  });

  // --- AC 1: loadBookings ---

  describe('loadBookings', () => {
    it('queries ConsultationBookings by memberEmail', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith(
        'ConsultationBookings',
        expect.objectContaining({
          filter: expect.objectContaining({
            memberEmail: expect.objectContaining({ $eq: EMAIL }),
          }),
        }),
      );
    });

    it('excludes already-cancelled bookings', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));

      const filter = mockQueryData.mock.calls[0][1].filter;
      // Should filter out cancelled status
      expect(JSON.stringify(filter)).toMatch(/cancelled|status/);
    });

    it('populates bookings array on success', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      expect(result.current.bookings).toHaveLength(1);
      expect(result.current.bookings[0].id).toBe(BOOKING_ID);
    });

    it('sets loadError on query failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      expect(result.current.loadError).not.toBeNull();
    });

    it('returns empty bookings when none found', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      expect(result.current.bookings).toHaveLength(0);
    });
  });

  // --- AC 2: cancelBooking ---

  describe('cancelBooking', () => {
    it('calls updateDataItem with status cancelled', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      await act(async () => result.current.cancelBooking(BOOKING_ID));

      expect(mockUpdateDataItem).toHaveBeenCalledWith(
        'ConsultationBookings',
        BOOKING_ID,
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('includes cancelledAt timestamp in update', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      await act(async () => result.current.cancelBooking(BOOKING_ID));

      const updateData = mockUpdateDataItem.mock.calls[0][2];
      expect(updateData.cancelledAt).toBeTruthy();
      expect(typeof updateData.cancelledAt).toBe('string');
    });

    it('includes cancellationReason when provided', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      await act(async () => result.current.cancelBooking(BOOKING_ID, 'Change of plans'));

      const updateData = mockUpdateDataItem.mock.calls[0][2];
      expect(updateData.cancellationReason).toBe('Change of plans');
    });

    it('sends cancellation email after successful cancel', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      await act(async () => result.current.cancelBooking(BOOKING_ID));

      expect(mockSendCancellationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendCancellationEmail).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookingId: BOOKING_ID,
          memberEmail: EMAIL,
        }),
      );
    });

    it('sets cancelledBooking on success', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(true);
      expect(result.current.cancelledBooking).not.toBeNull();
      expect(result.current.cancelledBooking?.id).toBe(BOOKING_ID);
    });

    it('removes cancelled booking from bookings list', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBookingItem(), makeBookingItem({ _id: 'booking-xyz' })],
        totalResults: 2,
      });

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.bookings).toHaveLength(2));

      await act(async () => result.current.cancelBooking(BOOKING_ID));

      expect(result.current.bookings.some((b) => b.id === BOOKING_ID)).toBe(false);
    });

    it('returns true on successful cancellation', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(true);
    });
  });

  // --- AC 3: Double-cancel guard ---

  describe('double-cancel guard', () => {
    it('returns false and does not call updateDataItem if booking has cancelled status in local state', async () => {
      // Simulate a booking loaded with cancelled status (e.g. stale state)
      mockQueryData.mockResolvedValue({
        items: [makeBookingItem({ status: 'cancelled' })],
        totalResults: 1,
      });

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(false);
      expect(mockUpdateDataItem).not.toHaveBeenCalled();
    });

    it('returns false when bookingId not found in loaded bookings', async () => {
      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking('nonexistent-id');
      });

      expect(success).toBe(false);
      expect(mockUpdateDataItem).not.toHaveBeenCalled();
    });
  });

  // --- AC 4: Past booking guard ---

  describe('past booking guard', () => {
    it('returns false and sets cancelError for a booking in the past', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeBookingItem({ date: PAST_DATE })],
        totalResults: 1,
      });

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(false);
      expect(result.current.cancelError).not.toBeNull();
      expect(mockUpdateDataItem).not.toHaveBeenCalled();
    });
  });

  // --- AC 5: Error handling ---

  describe('error handling', () => {
    it('sets cancelError when updateDataItem fails', async () => {
      mockUpdateDataItem.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      await act(async () => result.current.cancelBooking(BOOKING_ID));

      expect(result.current.cancelError).not.toBeNull();
      expect(result.current.cancelledBooking).toBeNull();
    });

    it('returns false when updateDataItem fails', async () => {
      mockUpdateDataItem.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(false);
    });

    it('does not throw if cancellation email fails (fire-and-forget)', async () => {
      mockSendCancellationEmail.mockRejectedValue(new Error('Email error'));

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      // Email failure should not cause cancelBooking to fail
      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.cancelBooking(BOOKING_ID);
      });

      expect(success).toBe(true);
    });

    it('is a no-op when Wix client is not available', async () => {
      mockWixClient = null;

      const { result } = renderHook(() =>
        useBookingCancellation({ getNow: getNowToday }),
      );

      await act(async () => result.current.loadBookings(EMAIL));
      await waitFor(() => expect(result.current.isLoadingBookings).toBe(false));

      expect(result.current.bookings).toHaveLength(0);
    });
  });
});
