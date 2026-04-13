/**
 * useBookingCancellation — cm-lfe
 *
 * Loads a user's consultation bookings by email and provides a cancellation
 * flow. Cancellation soft-deletes (status: 'cancelled') and sends a
 * cancellation confirmation email.
 */

import { useState, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';
import { sendCancellationEmail } from '@/services/bookingService';

// --- Types ---

export interface CancellableBooking {
  id: string;
  date: string;
  timeSlot: string;
  memberName: string;
  memberEmail: string;
  status: string;
}

export interface UseBookingCancellationOptions {
  getNow?: () => Date;
}

export interface UseBookingCancellationReturn {
  bookings: CancellableBooking[];
  isLoadingBookings: boolean;
  loadError: string | null;
  isCancelling: boolean;
  cancelError: string | null;
  cancelledBooking: CancellableBooking | null;
  loadBookings: (email: string) => Promise<void>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<boolean>;
}

// --- Hook ---

export function useBookingCancellation(
  options: UseBookingCancellationOptions = {},
): UseBookingCancellationReturn {
  const { getNow = () => new Date() } = options;
  const wixClient = useOptionalWixClient();

  const [bookings, setBookings] = useState<CancellableBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelledBooking, setCancelledBooking] = useState<CancellableBooking | null>(null);

  const loadBookings = useCallback(
    async (email: string) => {
      if (!wixClient) {
        setBookings([]);
        return;
      }

      setIsLoadingBookings(true);
      setLoadError(null);

      try {
        const result = await wixClient.queryData<{
          _id?: string;
          date: string;
          timeSlot: string;
          memberName: string;
          memberEmail: string;
          status: string;
        }>('ConsultationBookings', {
          filter: {
            memberEmail: { $eq: email },
            status: { $ne: 'cancelled' },
          },
        });

        setBookings(
          result.items
            .filter((item) => !!item._id)
            .map((item) => ({
              id: item._id!,
              date: item.date,
              timeSlot: item.timeSlot,
              memberName: item.memberName,
              memberEmail: item.memberEmail,
              status: item.status,
            })),
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setLoadError(error.message);
      } finally {
        setIsLoadingBookings(false);
      }
    },
    [wixClient],
  );

  const cancelBooking = useCallback(
    async (bookingId: string, reason?: string): Promise<boolean> => {
      // Find the booking in local state
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return false;

      // Double-cancel guard
      if (booking.status === 'cancelled') return false;

      // Past booking guard
      const today = getNow().toISOString().slice(0, 10);
      if (booking.date < today) {
        setCancelError('This consultation has already taken place and cannot be cancelled.');
        return false;
      }

      if (!wixClient) return false;

      setIsCancelling(true);
      setCancelError(null);

      try {
        await wixClient.updateDataItem('ConsultationBookings', bookingId, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          ...(reason ? { cancellationReason: reason } : {}),
        });

        setCancelledBooking(booking);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));

        // Fire-and-forget cancellation email
        sendCancellationEmail(wixClient, {
          bookingId,
          memberEmail: booking.memberEmail,
          memberId: '',
          consultationDate: booking.date,
        }).catch(() => {
          // Email failure is non-critical — swallow silently
        });

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setCancelError(error.message);
        return false;
      } finally {
        setIsCancelling(false);
      }
    },
    [wixClient, bookings, getNow],
  );

  return {
    bookings,
    isLoadingBookings,
    loadError,
    isCancelling,
    cancelError,
    cancelledBooking,
    loadBookings,
    cancelBooking,
  };
}
