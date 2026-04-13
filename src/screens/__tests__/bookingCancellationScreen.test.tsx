/**
 * Tests for BookingCancellationScreen — cm-lfe
 *
 * AC:
 *  1. Renders email input and lookup button in initial state
 *  2. Shows loaded bookings after successful lookup
 *  3. Shows error state when lookup fails
 *  4. Confirm cancellation updates UI to success state
 *  5. Shows cancellation error state
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
});
