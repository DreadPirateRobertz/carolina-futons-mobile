/**
 * @module useConsultationBooking
 *
 * Hook for the ConsultationBookingScreen — deacon-o1xq.
 *
 * Responsibilities:
 *  - Expose ALL_SLOTS constant (30-min slots 09:00–16:30, no lunch)
 *  - Fetch taken slots for a selected date from the ConsultationBookings Wix collection
 *  - Map taken slots onto ALL_SLOTS to produce availability list
 *  - Guard against past-date bookings (via injected getNow for testability)
 *  - Guard against booking conflicts
 *  - Insert a new booking record via wixClient
 *  - Return confirmedBooking on success
 */

import { useState, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ALL_SLOTS: string[] = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SlotInfo {
  time: string;
  available: boolean;
}

export interface BookingInput {
  date: string;
  timeSlot: string;
  memberName: string;
  memberEmail: string;
}

export interface ConfirmedBooking {
  id: string;
  date: string;
  timeSlot: string;
  memberName: string;
  memberEmail: string;
}

export interface UseConsultationBookingOptions {
  getNow?: () => Date;
  pushToken?: string;
}

export interface UseConsultationBookingReturn {
  slots: SlotInfo[];
  slotsLoading: boolean;
  slotsError: string | null;
  selectedDate: string | null;
  setSelectedDate: (date: string) => void;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string) => void;
  book: (input: BookingInput) => Promise<boolean>;
  isBooking: boolean;
  bookingError: string | null;
  confirmedBooking: ConfirmedBooking | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsultationBooking(
  options: UseConsultationBookingOptions = {},
): UseConsultationBookingReturn {
  const { getNow = () => new Date(), pushToken } = options;
  const wixClient = useOptionalWixClient();

  const [selectedDate, setSelectedDateState] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  const setSelectedDate = useCallback(
    async (date: string) => {
      setSelectedDateState(date);
      setSlotsError(null);
      setSlotsLoading(true);
      setSlots([]);

      if (!wixClient) {
        // No client — all slots available
        setSlotsLoading(false);
        setSlots(ALL_SLOTS.map((time) => ({ time, available: true })));
        return;
      }

      try {
        const result = await wixClient.queryData<{ timeSlot: string }>('ConsultationBookings', {
          filter: { date: { $eq: date } },
        });
        const takenSet = new Set(result.items.map((item) => item.timeSlot));
        setSlots(ALL_SLOTS.map((time) => ({ time, available: !takenSet.has(time) })));
        setSlotsError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setSlotsError(error.message);
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [wixClient],
  );

  const book = useCallback(
    async (input: BookingInput): Promise<boolean> => {
      if (!wixClient) {
        return false;
      }

      // Past-date guard
      const today = getNow().toISOString().slice(0, 10);
      if (input.date < today) {
        setBookingError('Cannot book a consultation for a past date.');
        return false;
      }

      // Conflict check
      const takenSlot = slots.find((s) => s.time === input.timeSlot && !s.available);
      if (takenSlot) {
        setBookingError('That time slot was just booked. Please choose another.');
        return false;
      }

      setIsBooking(true);
      setBookingError(null);

      try {
        const record: Record<string, unknown> = {
          date: input.date,
          timeSlot: input.timeSlot,
          memberName: input.memberName,
          memberEmail: input.memberEmail,
          status: 'pending',
          bookedAt: new Date().toISOString(),
        };
        if (pushToken) {
          record.pushToken = pushToken;
        }

        const result = await wixClient.insertDataItem('ConsultationBookings', record);

        setConfirmedBooking({
          id: result.id,
          date: input.date,
          timeSlot: input.timeSlot,
          memberName: input.memberName,
          memberEmail: input.memberEmail,
        });

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setBookingError(error.message);
        return false;
      } finally {
        setIsBooking(false);
      }
    },
    [wixClient, getNow, slots, pushToken],
  );

  return {
    slots,
    slotsLoading,
    slotsError,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    book,
    isBooking,
    bookingError,
    confirmedBooking,
  };
}
