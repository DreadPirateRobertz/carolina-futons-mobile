/**
 * @module useConsultationBooking
 *
 * Hook for the ConsultationBookingScreen — deacon-o1xq.
 *
 * Responsibilities:
 *  - Expose ALL_SLOTS constant (30-min slots 09:00–16:30, no lunch)
 *  - Fetch taken slots for a selected date from the ConsultationBookings Wix collection
 *    (queries consultationDate field with $gte/$lt date-range filter)
 *  - Map taken slots onto ALL_SLOTS to produce availability list
 *  - Guard against past-date bookings (via injected getNow for testability)
 *  - Guard against booking conflicts
 *  - Insert a new booking record via wixClient (aligned to Wix CMS schema — cm-5x7)
 *  - Return confirmedBooking on success
 */

import { useState, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';
import { sendBookingConfirmationEmail } from '@/services/bookingService';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ALL_SLOTS: string[] = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConsultationType = 'in-store' | 'video' | 'phone';

export type DurationMinutes = 30 | 60;

export type ConsultationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface SlotInfo {
  time: string;
  available: boolean;
}

export interface BookingInput {
  /** UI-layer date string (YYYY-MM-DD) combined with timeSlot to form consultationDate. */
  date: string;
  /** UI-layer time string (HH:MM) combined with date to form consultationDate. */
  timeSlot: string;
  /** Wix member ID (not display name). */
  memberId: string;
  memberEmail: string;
  consultationType: ConsultationType;
  durationMinutes: DurationMinutes;
  /** Optional free-text notes from the member. */
  memberNotes?: string;
  /** Optional product ID the member is interested in. */
  productInterest?: string;
}

export interface ConfirmedBooking {
  id: string;
  memberId: string;
  memberEmail: string;
  /** ISO datetime string (YYYY-MM-DDTHH:MM:SS) stored in the Wix CMS. */
  consultationDate: string;
  consultationType: ConsultationType;
  durationMinutes: DurationMinutes;
}

export interface UseConsultationBookingOptions {
  getNow?: () => Date;
  pushToken?: string;
  /** Injectable for testing — defaults to sendBookingConfirmationEmail */
  sendEmail?: (
    wixClient: ReturnType<typeof useOptionalWixClient>,
    params: {
      bookingId: string;
      memberEmail: string;
      memberId: string;
      consultationDate: string;
    },
  ) => Promise<void>;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the next calendar day as a YYYY-MM-DD string.
 * Used to compute the $lt upper bound for date-range queries on consultationDate.
 */
function nextDayStr(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsultationBooking(
  options: UseConsultationBookingOptions = {},
): UseConsultationBookingReturn {
  const {
    getNow = () => new Date(),
    pushToken,
    sendEmail = sendBookingConfirmationEmail,
  } = options;
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
        const nextDay = nextDayStr(date);
        const result = await wixClient.queryData<{ consultationDate: string }>(
          'ConsultationBookings',
          {
            filter: {
              consultationDate: {
                $gte: `${date}T00:00:00`,
                $lt: `${nextDay}T00:00:00`,
              },
            },
          },
        );
        // Extract HH:MM from "YYYY-MM-DDTHH:MM:SS"
        const takenSet = new Set(
          result.items.map((item) => item.consultationDate.slice(11, 16)),
        );
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
        const consultationDate = `${input.date}T${input.timeSlot}:00`;

        const record: Record<string, unknown> = {
          memberId: input.memberId,
          memberEmail: input.memberEmail,
          consultationDate,
          consultationType: input.consultationType,
          durationMinutes: input.durationMinutes,
          status: 'pending' as ConsultationStatus,
          bookedAt: new Date().toISOString(),
        };

        if (input.memberNotes !== undefined) {
          record.memberNotes = input.memberNotes;
        }
        if (input.productInterest !== undefined) {
          record.productInterest = input.productInterest;
        }
        if (pushToken) {
          record.pushToken = pushToken;
        }

        const result = await wixClient.insertDataItem('ConsultationBookings', record);

        const confirmed: ConfirmedBooking = {
          id: result.id,
          memberId: input.memberId,
          memberEmail: input.memberEmail,
          consultationDate,
          consultationType: input.consultationType,
          durationMinutes: input.durationMinutes,
        };
        setConfirmedBooking(confirmed);

        // Fire-and-forget confirmation email — never block the booking
        sendEmail(wixClient, {
          bookingId: result.id,
          memberEmail: input.memberEmail,
          memberId: input.memberId,
          consultationDate,
        }).catch(() => {
          // Email failure is non-critical
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
    [wixClient, getNow, slots, pushToken, sendEmail],
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
