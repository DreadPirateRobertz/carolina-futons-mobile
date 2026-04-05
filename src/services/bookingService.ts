/**
 * bookingService — cm-lfe
 *
 * Wix backend function calls for consultation booking emails.
 * All functions are fire-and-forget with non-throwing error handling —
 * email failures must never block the booking or cancellation flow.
 */

import { captureException } from '@/services/crashReporting';

// --- Types ---

interface WixClientLike {
  callFunction<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T>;
}

export interface BookingEmailParams {
  bookingId: string;
  memberEmail: string;
  memberName: string;
  date: string;
  timeSlot: string;
}

// --- Functions ---

/**
 * Triggers the Wix backend function to send a booking confirmation email.
 * Never throws — failures are captured and swallowed so they don't block booking.
 */
export async function sendBookingConfirmationEmail(
  wixClient: WixClientLike,
  params: BookingEmailParams,
): Promise<void> {
  try {
    await wixClient.callFunction('/_functions/sendBookingConfirmation', 'POST', params);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Triggers the Wix backend function to send a cancellation confirmation email.
 * Never throws — failures are captured and swallowed so they don't block cancellation.
 */
export async function sendCancellationEmail(
  wixClient: WixClientLike,
  params: BookingEmailParams,
): Promise<void> {
  try {
    await wixClient.callFunction('/_functions/sendBookingCancellation', 'POST', params);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
