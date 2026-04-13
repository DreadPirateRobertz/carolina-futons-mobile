/**
 * Tests for BookingCancellationScreen — cm-lfe / cm-0t5
 *
 * AC:
 *  1. Renders email input and lookup button in initial state
 *  2. Shows loaded bookings after successful lookup
 *  3. Shows error state when lookup fails
 *  4. Confirm cancellation updates UI to success state
 *  5. Shows cancellation error state
 *
 * cm-0t5 additions: email validation edge cases, multiple bookings,
 * accessibility, empty state timing, cancellation error handling,
 * success state content, loading interaction guards.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BookingCancellationScreen } from '../BookingCancellationScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// --- Mocks ---

const mockLoadBookings = jest.fn();
const mockCancelBooking = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@/hooks/useBookingCancellation', () => ({
  useBookingCancellation: () => mockHookState,
}));

let mockHookState = {
  bookings: [] as {
    id: string;
    date: string;
    timeSlot: string;
    memberName: string;
    memberEmail: string;
    status: string;
  }[],
  isLoadingBookings: false,
  loadError: null as string | null,
  isCancelling: false,
  cancelError: null as string | null,
  cancelledBooking: null as {
    id: string;
    date: string;
    timeSlot: string;
    memberName: string;
  } | null,
  loadBookings: mockLoadBookings,
  cancelBooking: mockCancelBooking,
};

// --- Helpers ---

function renderScreen() {
  return render(
    <ThemeProvider>
      <BookingCancellationScreen />
    </ThemeProvider>,
  );
}

const BOOKING = {
  id: 'booking-abc',
  date: '2026-05-10',
  timeSlot: '10:00',
  memberName: 'Jane Doe',
  memberEmail: 'jane@example.com',
  status: 'pending',
};

// --- Tests ---

describe('BookingCancellationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = {
      bookings: [],
      isLoadingBookings: false,
      loadError: null,
      isCancelling: false,
      cancelError: null,
      cancelledBooking: null,
      loadBookings: mockLoadBookings,
      cancelBooking: mockCancelBooking,
    };
    mockCancelBooking.mockResolvedValue(true);
  });

  // --- AC 1: Initial state ---

  describe('initial state', () => {
    it('renders the screen container', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('booking-cancellation-screen')).toBeTruthy();
    });

    it('renders email input', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('cancel-email-input')).toBeTruthy();
    });

    it('renders lookup button', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('lookup-bookings-button')).toBeTruthy();
    });

    it('lookup button is disabled when email is empty', () => {
      const { getByTestId } = renderScreen();
      const btn = getByTestId('lookup-bookings-button');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables lookup button once email is entered', () => {
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      const btn = getByTestId('lookup-bookings-button');
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  // --- AC 2: Bookings list ---

  describe('bookings list', () => {
    it('shows loading indicator while fetching', () => {
      mockHookState = { ...mockHookState, isLoadingBookings: true };
      const { getByTestId } = renderScreen();
      expect(getByTestId('bookings-loading')).toBeTruthy();
    });

    it('renders a row for each booking', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByTestId } = renderScreen();
      expect(getByTestId(`booking-row-${BOOKING.id}`)).toBeTruthy();
    });

    it('shows booking date and time in each row', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByText } = renderScreen();
      expect(getByText(/May 10/)).toBeTruthy();
      expect(getByText(/10:00/)).toBeTruthy();
    });

    it('renders a cancel button for each booking', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByTestId } = renderScreen();
      expect(getByTestId(`cancel-booking-${BOOKING.id}`)).toBeTruthy();
    });

    it('shows empty state when no bookings found', () => {
      mockHookState = { ...mockHookState, bookings: [] };
      // Simulate after a lookup with empty results
      const { getByTestId } = renderScreen();
      // Just ensure it doesn't crash — empty state handled gracefully
      expect(getByTestId('booking-cancellation-screen')).toBeTruthy();
    });

    it('calls loadBookings with entered email when lookup pressed', async () => {
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      fireEvent.press(getByTestId('lookup-bookings-button'));
      expect(mockLoadBookings).toHaveBeenCalledWith('jane@example.com');
    });
  });

  // --- AC 3: Error state ---

  describe('error state', () => {
    it('shows load error message', () => {
      mockHookState = { ...mockHookState, loadError: 'Failed to load bookings' };
      const { getByTestId } = renderScreen();
      expect(getByTestId('load-error')).toBeTruthy();
    });

    it('shows cancellation error message', () => {
      mockHookState = {
        ...mockHookState,
        bookings: [BOOKING],
        cancelError: 'Cannot cancel a past booking',
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('cancel-error')).toBeTruthy();
    });
  });

  // --- AC 4: Successful cancellation ---

  describe('successful cancellation', () => {
    it('shows success state after cancellation', () => {
      mockHookState = {
        ...mockHookState,
        cancelledBooking: {
          id: BOOKING.id,
          date: BOOKING.date,
          timeSlot: BOOKING.timeSlot,
          memberName: BOOKING.memberName,
        },
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('cancellation-success')).toBeTruthy();
    });

    it('calls cancelBooking with booking id when cancel pressed', async () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
      expect(mockCancelBooking).toHaveBeenCalledWith(BOOKING.id, expect.anything());
    });

    it('Done button on success navigates back', () => {
      mockHookState = {
        ...mockHookState,
        cancelledBooking: {
          id: BOOKING.id,
          date: BOOKING.date,
          timeSlot: BOOKING.timeSlot,
          memberName: BOOKING.memberName,
        },
      };
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('cancellation-done-button'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  // --- AC 5: Cancelling state ---

  describe('cancelling state', () => {
    it('shows loading indicator while cancelling', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING], isCancelling: true };
      const { getByTestId } = renderScreen();
      expect(getByTestId('cancelling-loading')).toBeTruthy();
    });
  });

  // --- cm-0t5: additional edge cases ---

  describe('email validation edge cases', () => {
    it('whitespace-only email keeps lookup button disabled', () => {
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), '   ');
      expect(getByTestId('lookup-bookings-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('email with surrounding spaces enables lookup button', () => {
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), '  jane@example.com  ');
      expect(getByTestId('lookup-bookings-button').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('trims email before calling loadBookings', () => {
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), '  jane@example.com  ');
      fireEvent.press(getByTestId('lookup-bookings-button'));
      expect(mockLoadBookings).toHaveBeenCalledWith('jane@example.com');
    });

    it('lookup button disabled while isLoadingBookings', () => {
      mockHookState = { ...mockHookState, isLoadingBookings: true };
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      expect(getByTestId('lookup-bookings-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('multiple bookings', () => {
    const BOOKING_2 = {
      id: 'booking-def',
      date: '2026-05-15',
      timeSlot: '14:00',
      memberName: 'John Smith',
      memberEmail: 'john@example.com',
      status: 'pending',
    };

    it('renders a row for each of multiple bookings', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING, BOOKING_2] };
      const { getByTestId } = renderScreen();
      expect(getByTestId(`booking-row-${BOOKING.id}`)).toBeTruthy();
      expect(getByTestId(`booking-row-${BOOKING_2.id}`)).toBeTruthy();
    });

    it('renders a cancel button for each booking', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING, BOOKING_2] };
      const { getByTestId } = renderScreen();
      expect(getByTestId(`cancel-booking-${BOOKING.id}`)).toBeTruthy();
      expect(getByTestId(`cancel-booking-${BOOKING_2.id}`)).toBeTruthy();
    });

    it('cancel button for second booking calls cancelBooking with correct id', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING, BOOKING_2] };
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(`cancel-booking-${BOOKING_2.id}`));
      expect(mockCancelBooking).toHaveBeenCalledWith(BOOKING_2.id, expect.anything());
    });

    it('shows member name for each booking row', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING, BOOKING_2] };
      const { getByText } = renderScreen();
      expect(getByText('Jane Doe')).toBeTruthy();
      expect(getByText('John Smith')).toBeTruthy();
    });
  });

  describe('cancellation interaction guards', () => {
    it('cancel booking buttons are disabled while isCancelling', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING], isCancelling: true };
      const { getByTestId } = renderScreen();
      const btn = getByTestId(`cancel-booking-${BOOKING.id}`);
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('cancel button has accessibilityLabel with formatted date', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByTestId } = renderScreen();
      const btn = getByTestId(`cancel-booking-${BOOKING.id}`);
      expect(btn.props.accessibilityLabel).toMatch(/May 10/);
    });
  });

  describe('empty state timing', () => {
    it('does NOT show empty state message before any lookup', () => {
      mockHookState = { ...mockHookState, bookings: [] };
      const { queryByText } = renderScreen();
      expect(queryByText(/No upcoming bookings found/)).toBeNull();
    });

    it('shows empty state text after lookup returns no bookings', () => {
      mockHookState = { ...mockHookState, bookings: [] };
      const { getByTestId, getByText } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      fireEvent.press(getByTestId('lookup-bookings-button'));
      expect(getByText(/No upcoming bookings found/)).toBeTruthy();
    });

    it('does NOT show empty state when bookings are present', () => {
      mockHookState = { ...mockHookState, bookings: [BOOKING] };
      const { getByTestId, queryByText } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      fireEvent.press(getByTestId('lookup-bookings-button'));
      expect(queryByText(/No upcoming bookings found/)).toBeNull();
    });

    it('does NOT show empty state when loadError is set', () => {
      mockHookState = { ...mockHookState, bookings: [], loadError: 'Network error' };
      const { getByTestId, queryByText } = renderScreen();
      fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
      fireEvent.press(getByTestId('lookup-bookings-button'));
      expect(queryByText(/No upcoming bookings found/)).toBeNull();
    });
  });

  describe('load error edge cases', () => {
    it('load error is hidden while isLoadingBookings is true', () => {
      mockHookState = { ...mockHookState, loadError: 'Timed out', isLoadingBookings: true };
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('load-error')).toBeNull();
    });

    it('load error message text matches the error string', () => {
      const errMsg = 'Booking service unavailable';
      mockHookState = { ...mockHookState, loadError: errMsg };
      const { getByTestId } = renderScreen();
      expect(getByTestId('load-error').props.children).toBe(errMsg);
    });
  });

  describe('success state content', () => {
    const cancelledBooking = {
      id: BOOKING.id,
      date: BOOKING.date,
      timeSlot: BOOKING.timeSlot,
      memberName: BOOKING.memberName,
    };

    it('success state shows "Booking Cancelled" title', () => {
      mockHookState = { ...mockHookState, cancelledBooking };
      const { getByText } = renderScreen();
      expect(getByText('Booking Cancelled')).toBeTruthy();
    });

    it('success state shows formatted date and time slot', () => {
      mockHookState = { ...mockHookState, cancelledBooking };
      const { getByText } = renderScreen();
      expect(getByText(/May 10/)).toBeTruthy();
      expect(getByText(/10:00/)).toBeTruthy();
    });

    it('success state shows email confirmation subtext', () => {
      mockHookState = { ...mockHookState, cancelledBooking };
      const { getByText } = renderScreen();
      expect(getByText(/confirmation has been sent/i)).toBeTruthy();
    });

    it('success state hides the email lookup form', () => {
      mockHookState = { ...mockHookState, cancelledBooking };
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('cancel-email-input')).toBeNull();
      expect(queryByTestId('lookup-bookings-button')).toBeNull();
    });
  });
});
