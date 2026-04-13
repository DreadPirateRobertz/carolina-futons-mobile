/**
 * TDD tests for useConsultationBooking hook.
 *
 * Behaviour:
 *  - ALL_SLOTS: 30-min slots 09:00–16:30, Mon–Fri, excluding 12:00–12:30 lunch
 *  - setSelectedDate triggers a query of ConsultationBookings for taken slots
 *    using consultationDate date-range filter ($gte/$lt)
 *  - slots returns ALL_SLOTS with available=false for taken ones
 *  - No taken slots → all slots available
 *  - Past date → book() rejects with past-date error, does not call wixClient
 *  - Booking conflict → book() detects slot is taken, returns false + error
 *  - Network error on slot fetch → slotsError set, slotsLoading=false
 *  - Network error on book → bookingError set, isBooking=false
 *  - Successful booking → confirmedBooking set, insertDataItem called with
 *    correct CollectionId + fields (memberId, memberEmail, consultationDate,
 *    consultationType, durationMinutes, status=pending, bookedAt ISO timestamp)
 *  - No Wix client → slots all available, book() no-ops (graceful)
 *  - pushToken passed through to the inserted record when available
 *  - Optional memberNotes and productInterest included when provided
 *  - Optional memberNotes and productInterest omitted when not provided
 *
 * Clock injection: getNow parameter (defaults to () => new Date()) used for
 * past-date guard — injected in tests to control "today".
 *
 * @bead cm-5x7
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

const mockSendEmail = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/bookingService', () => ({
  sendBookingConfirmationEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10'; // a Friday
const TOMORROW = '2026-04-11'; // Saturday — weekend, but valid future date for test purposes
const YESTERDAY = '2026-04-09';
const TODAY_NEXT = '2026-04-11'; // next day used in date-range filter upper bound
const TOMORROW_NEXT = '2026-04-12';
const getNowToday = () => new Date('2026-04-10T09:00:00Z');

const SLOT_09 = '09:00';
const SLOT_09_30 = '09:30';
const MEMBER_ID = 'member-jane-123';

/** Returns a CMS record item with consultationDate (new schema). */
function makeTakenItem(timeSlot: string) {
  return { consultationDate: `${TODAY}T${timeSlot}:00` };
}

/** Minimal valid BookingInput for the new Wix CMS schema. */
const BASE_BOOK_INPUT = {
  date: TODAY,
  timeSlot: SLOT_09,
  memberId: MEMBER_ID,
  memberEmail: 'jane@example.com',
  consultationType: 'in-store' as const,
  durationMinutes: 30 as const,
};

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
    it('queries ConsultationBookings with consultationDate date-range filter', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith('ConsultationBookings', {
        filter: {
          consultationDate: {
            $gte: `${TODAY}T00:00:00`,
            $lt: `${TODAY_NEXT}T00:00:00`,
          },
        },
      });
    });

    it('uses correct next-day boundary for TOMORROW', async () => {
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TOMORROW));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      expect(mockQueryData).toHaveBeenCalledWith('ConsultationBookings', {
        filter: {
          consultationDate: {
            $gte: `${TOMORROW}T00:00:00`,
            $lt: `${TOMORROW_NEXT}T00:00:00`,
          },
        },
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

    it('marks taken slots as available=false (extracts time from consultationDate)', async () => {
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
        success = await result.current.book(BASE_BOOK_INPUT);
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
          ...BASE_BOOK_INPUT,
          date: YESTERDAY,
        });
      });

      expect(success).toBe(false);
      expect(result.current.bookingError).not.toBeNull();
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });

    it('book() for today (same day) is allowed', async () => {
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-001',
        data: { consultationDate: `${TODAY}T${SLOT_09}:00`, status: 'pending' },
      });
      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book(BASE_BOOK_INPUT);
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
        success = await result.current.book(BASE_BOOK_INPUT);
      });

      expect(success).toBe(false);
      expect(result.current.bookingError).not.toBeNull();
      expect(mockInsertDataItem).not.toHaveBeenCalled();
    });
  });

  // ── Successful booking ────────────────────────────────────────────────────────

  describe('successful booking', () => {
    it('calls insertDataItem on ConsultationBookings with correct CMS schema fields', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-abc',
        data: { consultationDate: `${TODAY}T${SLOT_09_30}:00`, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          date: TODAY,
          timeSlot: SLOT_09_30,
          memberId: MEMBER_ID,
          memberEmail: 'jane@example.com',
          consultationType: 'in-store',
          durationMinutes: 30,
        });
      });

      expect(mockInsertDataItem).toHaveBeenCalledWith(
        'ConsultationBookings',
        expect.objectContaining({
          memberId: MEMBER_ID,
          memberEmail: 'jane@example.com',
          consultationDate: `${TODAY}T${SLOT_09_30}:00`,
          consultationType: 'in-store',
          durationMinutes: 30,
          status: 'pending',
        }),
      );
    });

    it('stores consultationDate as YYYY-MM-DDTHH:MM:00 combining date and timeSlot', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          date: TODAY,
          timeSlot: SLOT_09,
        });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted.consultationDate).toBe(`${TODAY}T${SLOT_09}:00`);
    });

    it('does NOT store date or timeSlot as separate fields (new schema)', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted).not.toHaveProperty('date');
      expect(inserted).not.toHaveProperty('timeSlot');
      expect(inserted).not.toHaveProperty('memberName');
    });

    it('stores video consultationType when provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({ ...BASE_BOOK_INPUT, consultationType: 'video' });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted.consultationType).toBe('video');
    });

    it('stores 60-minute duration when provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({ ...BASE_BOOK_INPUT, durationMinutes: 60 });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted.durationMinutes).toBe(60);
    });

    it('includes memberNotes in inserted record when provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          memberNotes: 'Interested in sectional sofas',
        });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted.memberNotes).toBe('Interested in sectional sofas');
    });

    it('omits memberNotes from inserted record when not provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted).not.toHaveProperty('memberNotes');
    });

    it('includes productInterest in inserted record when provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          productInterest: 'product-abc-123',
        });
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted.productInterest).toBe('product-abc-123');
    });

    it('omits productInterest from inserted record when not provided', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(inserted).not.toHaveProperty('productInterest');
    });

    it('bookedAt is a recent ISO timestamp', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-abc',
        data: { consultationDate: `${TODAY}T${SLOT_09}:00`, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      const inserted = mockInsertDataItem.mock.calls[0][1];
      expect(typeof inserted.bookedAt).toBe('string');
      expect(new Date(inserted.bookedAt).getTime()).toBeGreaterThan(0);
    });

    it('sets confirmedBooking with id, memberId, memberEmail, consultationDate on success', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({
        id: 'booking-xyz',
        data: { consultationDate: `${TODAY}T${SLOT_09}:00`, status: 'pending' },
      });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          memberId: MEMBER_ID,
          memberEmail: 'jane@example.com',
        });
      });

      expect(result.current.confirmedBooking).not.toBeNull();
      expect(result.current.confirmedBooking?.id).toBe('booking-xyz');
      expect(result.current.confirmedBooking?.memberId).toBe(MEMBER_ID);
      expect(result.current.confirmedBooking?.memberEmail).toBe('jane@example.com');
      expect(result.current.confirmedBooking?.consultationDate).toBe(`${TODAY}T${SLOT_09}:00`);
    });

    it('confirmedBooking reflects consultationType and durationMinutes', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          consultationType: 'phone',
          durationMinutes: 60,
        });
      });

      expect(result.current.confirmedBooking?.consultationType).toBe('phone');
      expect(result.current.confirmedBooking?.durationMinutes).toBe(60);
    });

    it('returns true on success', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'b1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.book(BASE_BOOK_INPUT);
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
        await result.current.book(BASE_BOOK_INPUT);
      });

      expect(mockInsertDataItem.mock.calls[0][1].pushToken).toBe('ExponentPushToken[abc]');
    });
  });

  // ── Confirmation email ────────────────────────────────────────────────────────

  describe('confirmation email', () => {
    it('fires sendEmail after successful booking', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'booking-e1', data: {} });

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book({
          ...BASE_BOOK_INPUT,
          memberId: MEMBER_ID,
          memberEmail: 'jane@example.com',
        });
      });

      // Allow fire-and-forget to settle
      await act(async () => {});
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookingId: 'booking-e1',
          memberEmail: 'jane@example.com',
          memberId: MEMBER_ID,
          consultationDate: `${TODAY}T${SLOT_09}:00`,
        }),
      );
    });

    it('does NOT fire sendEmail when booking fails', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockRejectedValue(new Error('Insert failed'));

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      await act(async () => {});
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('email failure does not affect confirmedBooking', async () => {
      mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
      mockInsertDataItem.mockResolvedValue({ id: 'booking-e2', data: {} });
      mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

      const { result } = renderHook(() => useConsultationBooking({ getNow: getNowToday }));
      await act(async () => result.current.setSelectedDate(TODAY));
      await waitFor(() => expect(result.current.slotsLoading).toBe(false));

      await act(async () => {
        await result.current.book(BASE_BOOK_INPUT);
      });

      await act(async () => {});
      // Booking still confirmed even if email fails
      expect(result.current.confirmedBooking?.id).toBe('booking-e2');
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
        await result.current.book(BASE_BOOK_INPUT);
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
        success = await result.current.book(BASE_BOOK_INPUT);
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
        await result.current.book(BASE_BOOK_INPUT);
      });
      expect(result.current.isBooking).toBe(false);
    });
  });
});
