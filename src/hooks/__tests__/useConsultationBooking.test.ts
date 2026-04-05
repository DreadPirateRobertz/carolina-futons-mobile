/**
 * TDD tests for useConsultationBooking hook.
 *
 * Behaviour:
 *  - ALL_SLOTS: 30-min slots 09:00–16:30, Mon–Fri, excluding 12:00–12:30 lunch
 *  - setSelectedDate triggers a query of ConsultationBookings for taken slots
 *  - slots returns ALL_SLOTS with available=false for taken ones
 *  - No taken slots → all slots available
 *  - Past date → book() rejects with past-date error, does not call wixClient
 *  - Booking conflict → book() detects slot is taken, returns false + error
 *  - Network error on slot fetch → slotsError set, slotsLoading=false
 *  - Network error on book → bookingError set, isBooking=false
 *  - Successful booking → confirmedBooking set, insertDataItem called with
 *    correct CollectionId + fields (date, timeSlot, memberName, memberEmail,
 *    status=pending, bookedAt ISO timestamp)
 *  - No Wix client → slots all available, book() no-ops (graceful)
 *  - push token passed through to the inserted record when available
 *
 * Clock injection: getNow parameter (defaults to () => new Date()) used for
 * past-date guard — injected in tests to control "today".
 *
 * @bead deacon-o1xq
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useConsultationBooking, ALL_SLOTS } from '../useConsultationBooking';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
let mockWixClient: { queryData: jest.Mock; insertDataItem: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10'; // a Friday
const TOMORROW = '2026-04-11'; // Saturday — weekend, but valid future date for test purposes
const YESTERDAY = '2026-04-09';
const getNowToday = () => new Date('2026-04-10T09:00:00Z');

const SLOT_09 = '09:00';
const SLOT_09_30 = '09:30';

function makeTakenItem(timeSlot: string) {
  return { timeSlot, date: TODAY, status: 'pending' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useConsultationBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { queryData: mockQueryData, insertDataItem: mockInsertDataItem };
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  // ── ALL_SLOTS export ─────────────────────────────────────────────────────────

  describe('ALL_SLOTS', () => {
    it('exports an array of time strings in HH:MM format', () => {
      expect(Array.isArray(ALL_SLOTS)).toBe(true);
      expect(ALL_SLOTS.length).toBeGreaterThan(0);
      expect(ALL_SLOTS[0]).toMatch(/^\d{2}:\d{2}$/);
    });

    it('starts at 09:00', () => {
      expect(ALL_SLOTS[0]).toBe('09:00');
    });

    it('ends at 16:30 (last 30-min slot that finishes by 17:00)', () => {
      expect(ALL_SLOTS[ALL_SLOTS.length - 1]).toBe('16:30');
    });

    it('excludes 12:00 and 12:30 lunch slots', () => {
      expect(ALL_SLOTS).not.toContain('12:00');
      expect(ALL_SLOTS).not.toContain('12:30');
    });

    it('has 30-minute spacing between consecutive slots', () => {
      for (let i = 1; i < ALL_SLOTS.length; i++) {
        const prev = ALL_SLOTS[i - 1].split(':').map(Number);
        const curr = ALL_SLOTS[i].split(':').map(Number);
        const prevMins = prev[0] * 60 + prev[1];
        const currMins = curr[0] * 60 + curr[1];
        // Allow gap of 90 mins across the double lunch break (12:00 + 12:30 skipped), 30 otherwise
        const gap = currMins - prevMins;
        expect([30, 90]).toContain(gap);
      }
    });

    it('contains 14 slots (09:00–11:30 = 6, 13:00–16:30 = 8)', () => {
      expect(ALL_SLOTS).toHaveLength(14);
    });
  });

  // ── Initial state ────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('selectedDate is null initially', () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      expect(result.current.selectedDate).toBeNull();
    });

    it('slots is empty before a date is selected', () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      expect(result.current.slots).toHaveLength(0);
    });

    it('slotsLoading is false initially', () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      expect(result.current.slotsLoading).toBe(false);
    });

    it('confirmedBooking is null initially', () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      expect(result.current.confirmedBooking).toBeNull();
    });
  });

  // ── Slot fetching ─────────────────────────────────────────────────────────────

  describe('setSelectedDate → slot fetch', () => {
    it('queries ConsultationBookings collection with date filter', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith('ConsultationBookings', {
        filter: { date: { $eq: TODAY } },
      });
    });

    it('returns all slots as available when no bookings exist', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(result.current.slots).toHaveLength(ALL_SLOTS.length);
      expect(result.current.slots.every((s) => s.available)).toBe(true);
    });

    it('marks taken slots as available=false', async () => {
      mockQueryData.mockResolvedValue({
        items: [makeTakenItem(SLOT_09), makeTakenItem(SLOT_09_30)],
        totalResults: 2,
      });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      const slot9 = result.current.slots.find((s) => s.time === SLOT_09);
      const slot930 = result.current.slots.find((s) => s.time === SLOT_09_30);
      expect(slot9?.available).toBe(false);
      expect(slot930?.available).toBe(false);
    });

    it('leaves other slots available when some are taken', async () => {
      mockQueryData.mockResolvedValue({ items: [makeTakenItem(SLOT_09)], totalResults: 1 });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      const available = result.current.slots.filter((s) => s.available);
      expect(available).toHaveLength(ALL_SLOTS.length - 1);
    });

    it('sets slotsError on network failure', async () => {
      mockQueryData.mockRejectedValue(new Error('Network timeout'));
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(result.current.slotsError).not.toBeNull();
      expect(result.current.slots).toHaveLength(0);
    });

    it('clears previous slotsError on successful re-fetch', async () => {
      mockQueryData.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsError).not.toBeNull());

      mockQueryData.mockResolvedValueOnce({ items: [], totalResults: 0 });
      await act(async () => result.current.setSelectedDate(TOMORROW));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));
      expect(result.current.slotsError).toBeNull();
    });
  });

  // ── No Wix client ────────────────────────────────────────────────────────────

  describe('no Wix client', () => {
    beforeEach(() => {
      mockWixClient = null;
    });

    it('returns all slots available without querying', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(mockQueryData).not.toHaveBeenCalled();
      expect(result.current.slots.every((s) => s.available)).toBe(true);
    });

    it('book() is a no-op and returns false', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
        });
      });
      expect(success).toBe(false);
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });
  });

  // ── Past-date guard ───────────────────────────────────────────────────────────

  describe('past-date guard', () => {
    it('book() returns false and sets bookingError for a past date', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: YESTERDAY,
          timeSlot: SLOT_09,
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
        });
      });

      expect(success).toBe(false);
      expect(result.current.bookingError).not.toBeNull();
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });

    it('book() for today (same day) is allowed', async () => {
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-001',
        data: { date: TODAY, timeSlot: SLOT_09, status: 'pending' },
      });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane',
          memberEmail: 'jane@example.com',
        });
      });
      expect(success).toBe(true);
    });
  });

  // ── Booking conflict ──────────────────────────────────────────────────────────

  describe('booking conflict', () => {
    it('returns false and sets bookingError when slot is already taken', async () => {
      mockQueryData.mockResolvedValue({ items: [makeTakenItem(SLOT_09)], totalResults: 1 });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane',
          memberEmail: 'jane@example.com',
        });
      });

      expect(success).toBe(false);
      expect(result.current.bookingError).not.toBeNull();
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });
  });

  // ── Successful booking ────────────────────────────────────────────────────────

  describe('successful booking', () => {
    it('calls insertDataItem on ConsultationBookings with correct fields', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-abc',
        data: { date: TODAY, timeSlot: SLOT_09_30, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09_30,
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
        });
      });

      expect(mockInsertDataItem).toHaveBeenCalledWith(
        'ConsultationBookings',
        expect.objectContaining({
          date: TODAY,
          timeSlot: SLOT_09_30,
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
          status: 'pending',
        }),
      );
    });

    it('bookedAt is a recent ISO timestamp', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-abc',
        data: { date: TODAY, timeSlot: SLOT_09, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Alice',
          memberEmail: 'alice@example.com',
        });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(typeof inserted.bookedAt).toBe('string');
      expect(new Date(inserted.bookedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets confirmedBooking with id, date, timeSlot, memberName on success', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-xyz',
        data: { date: TODAY, timeSlot: SLOT_09, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
        });
      });

      expect(result.current.confirmedBooking).not.toBeNull();
      expect(result.current.confirmedBooking?.id).toBe('booking-xyz');
      expect(result.current.confirmedBooking?.date).toBe(TODAY);
      expect(result.current.confirmedBooking?.timeSlot).toBe(SLOT_09);
      expect(result.current.confirmedBooking?.memberName).toBe('Jane Doe');
    });

    it('returns true on success', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'X',
          memberEmail: 'x@x.com',
        });
      });
      expect(success).toBe(true);
    });

    it('includes pushToken in the inserted record when provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() =>
        useConsultationBooking({ getNow: getNowToday, pushToken: 'ExponentPushToken[abc]' }),
      );
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Bob',
          memberEmail: 'bob@example.com',
        });
      });

      expect(mockInsertDataItem.mock.calls[0][1].pushToken).toBe('ExponentPushToken[abc]');
    });
  });

  // ── Network error on book ─────────────────────────────────────────────────────

  describe('network error on book()', () => {
    it('sets bookingError on insertDataItem failure', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane',
          memberEmail: 'jane@example.com',
        });
      });

      expect(result.current.bookingError).not.toBeNull();
      expect(result.current.confirmedBooking).toBeNull();
    });

    it('returns false on insertDataItem failure', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockRejectedValue(new Error('Timeout'));

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane',
          memberEmail: 'jane@example.com',
        });
      });
      expect(success).toBe(false);
    });

    it('isBooking=false after failure', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09,
          memberName: 'Jane',
          memberEmail: 'j@j.com',
        });
      });
      expect(result.current.isBooking).toBe(false);
    });
  });
});
