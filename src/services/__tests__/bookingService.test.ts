/**
 * Tests for bookingService — cm-lfe
 *
 * AC:
 *  1. sendBookingConfirmationEmail calls correct Wix function with booking params
 *  2. sendCancellationEmail calls correct Wix function with booking params
 *  3. Both functions handle Wix callFunction failure gracefully (non-throwing)
 */

import { sendBookingConfirmationEmail, sendCancellationEmail } from '../bookingService';

// --- Mocks ---

const mockCallFunction = jest.fn();

const mockWixClient = {
  callFunction: mockCallFunction,
};

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

// --- Constants ---

const BOOKING_PARAMS = {
  bookingId: 'booking-abc',
  memberEmail: 'jane@example.com',
  memberId: 'member-jane-123',
  consultationDate: '2026-04-15T10:00:00',
};

// --- Tests ---

describe('bookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallFunction.mockResolvedValue({ success: true });
  });

  // --- AC 1: sendBookingConfirmationEmail ---

  describe('sendBookingConfirmationEmail', () => {
    it('calls the correct Wix backend function path', async () => {
      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);

      expect(mockCallFunction).toHaveBeenCalledTimes(1);
      const [path, method] = mockCallFunction.mock.calls[0];
      expect(path).toBe('/_functions/sendBookingConfirmation');
      expect(method).toBe('POST');
    });

    it('passes bookingId to the function body', async () => {
      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);

      const body = mockCallFunction.mock.calls[0][2];
      expect(body.bookingId).toBe(BOOKING_PARAMS.bookingId);
    });

    it('passes memberEmail to the function body', async () => {
      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);

      const body = mockCallFunction.mock.calls[0][2];
      expect(body.memberEmail).toBe(BOOKING_PARAMS.memberEmail);
    });

    it('passes memberId and consultationDate to the function body', async () => {
      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);

      const body = mockCallFunction.mock.calls[0][2];
      expect(body.memberId).toBe(BOOKING_PARAMS.memberId);
      expect(body.consultationDate).toBe(BOOKING_PARAMS.consultationDate);
    });

    it('does not throw when callFunction fails', async () => {
      mockCallFunction.mockRejectedValue(new Error('Email service unavailable'));

      await expect(
        sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS),
      ).resolves.not.toThrow();
    });

    it('captures exception when callFunction fails', async () => {
      const { captureException } = require('@/services/crashReporting');
      mockCallFunction.mockRejectedValue(new Error('SMTP error'));

      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);

      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });

  // --- AC 2: sendCancellationEmail ---

  describe('sendCancellationEmail', () => {
    it('calls the correct Wix backend function path', async () => {
      await sendCancellationEmail(mockWixClient as any, BOOKING_PARAMS);

      expect(mockCallFunction).toHaveBeenCalledTimes(1);
      const [path, method] = mockCallFunction.mock.calls[0];
      expect(path).toBe('/_functions/sendBookingCancellation');
      expect(method).toBe('POST');
    });

    it('passes all booking params to the function body', async () => {
      await sendCancellationEmail(mockWixClient as any, BOOKING_PARAMS);

      const body = mockCallFunction.mock.calls[0][2];
      expect(body.bookingId).toBe(BOOKING_PARAMS.bookingId);
      expect(body.memberEmail).toBe(BOOKING_PARAMS.memberEmail);
      expect(body.memberId).toBe(BOOKING_PARAMS.memberId);
      expect(body.consultationDate).toBe(BOOKING_PARAMS.consultationDate);
    });

    it('does not throw when callFunction fails', async () => {
      mockCallFunction.mockRejectedValue(new Error('Network error'));

      await expect(
        sendCancellationEmail(mockWixClient as any, BOOKING_PARAMS),
      ).resolves.not.toThrow();
    });

    it('captures exception when callFunction fails', async () => {
      const { captureException } = require('@/services/crashReporting');
      mockCallFunction.mockRejectedValue(new Error('Timeout'));

      await sendCancellationEmail(mockWixClient as any, BOOKING_PARAMS);

      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });

  // --- AC 3: Confirmation vs cancellation use different endpoints ---

  describe('endpoint separation', () => {
    it('confirmation and cancellation call different Wix endpoints', async () => {
      await sendBookingConfirmationEmail(mockWixClient as any, BOOKING_PARAMS);
      await sendCancellationEmail(mockWixClient as any, BOOKING_PARAMS);

      const confirmPath = mockCallFunction.mock.calls[0][0];
      const cancelPath = mockCallFunction.mock.calls[1][0];
      expect(confirmPath).not.toBe(cancelPath);
    });
  });
});
