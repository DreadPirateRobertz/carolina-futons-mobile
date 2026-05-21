/**
 * Deeper tests for BookingCancellationScreen — cm-4sp
 *
 * Covers: cancellation confirmed flow, cancellation aborted,
 * error states, loading states, a11y audit on all interactive elements.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BookingCancellationScreen } from '../BookingCancellationScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

function renderScreen() {
  return render(<BookingCancellationScreen />);
}

const BOOKING = {
  id: 'booking-abc',
  date: '2026-05-10',
  timeSlot: '10:00',
  memberName: 'Jane Doe',
  memberEmail: 'jane@example.com',
  status: 'pending',
};

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
  mockCancelBooking.mockResolvedValue(undefined);
});

// ── Cancellation confirmed flow ────────────────────────────────────────────────

describe('BookingCancellationScreen — cancellation confirmed flow', () => {
  beforeEach(() => {
    mockHookState = { ...mockHookState, bookings: [BOOKING] };
  });

  it('shows a confirmation Alert when cancel button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringMatching(/cancel/i),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: expect.any(String) }),
        expect.objectContaining({ text: expect.any(String) }),
      ]),
    );
  });

  it('calls cancelBooking when user confirms in the Alert', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirmBtn = buttons?.find(
        (b) => b.style === 'destructive' || /confirm|yes|cancel booking/i.test(b.text ?? ''),
      );
      confirmBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
    expect(mockCancelBooking).toHaveBeenCalledWith(BOOKING.id, expect.any(String));
  });

  it('calls cancelBooking with the correct booking id', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirmBtn = buttons?.find(
        (b) => b.style === 'destructive' || /confirm|yes|cancel booking/i.test(b.text ?? ''),
      );
      confirmBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
    expect(mockCancelBooking).toHaveBeenCalledWith(BOOKING.id, expect.anything());
  });
});

// ── Cancellation aborted ──────────────────────────────────────────────────────

describe('BookingCancellationScreen — cancellation aborted', () => {
  beforeEach(() => {
    mockHookState = { ...mockHookState, bookings: [BOOKING] };
  });

  it('does NOT call cancelBooking when user dismisses the Alert', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const abortBtn = buttons?.find(
        (b) => b.style === 'cancel' || /keep|no|go back|dismiss/i.test(b.text ?? ''),
      );
      abortBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
    expect(mockCancelBooking).not.toHaveBeenCalled();
  });

  it('booking row still visible after user dismisses Alert', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const abortBtn = buttons?.find((b) => b.style === 'cancel');
      abortBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));
    expect(getByTestId(`booking-row-${BOOKING.id}`)).toBeTruthy();
  });

  it('Alert has a cancel/keep button and a destructive confirm button', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(`cancel-booking-${BOOKING.id}`));

    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const destructiveBtn = buttons.find((b) => b.style === 'destructive');
    expect(cancelBtn).toBeTruthy();
    expect(destructiveBtn).toBeTruthy();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('BookingCancellationScreen — error state', () => {
  it('shows load error text matching the error string', () => {
    const errMsg = 'Could not reach booking service';
    mockHookState = { ...mockHookState, loadError: errMsg };
    const { getByTestId } = renderScreen();
    expect(getByTestId('load-error').props.children).toBe(errMsg);
  });

  it('shows cancel error when cancellation fails', () => {
    const errMsg = 'Booking cannot be cancelled within 24 hours';
    mockHookState = {
      ...mockHookState,
      bookings: [BOOKING],
      cancelError: errMsg,
    };
    const { getByTestId } = renderScreen();
    expect(getByTestId('cancel-error').props.children).toBe(errMsg);
  });

  it('does not show load error while isLoadingBookings', () => {
    mockHookState = { ...mockHookState, loadError: 'Error', isLoadingBookings: true };
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('load-error')).toBeNull();
  });

  it('load error and bookings list coexist without crash', () => {
    mockHookState = {
      ...mockHookState,
      bookings: [BOOKING],
      loadError: 'Partial failure',
    };
    const { getByTestId } = renderScreen();
    expect(getByTestId('load-error')).toBeTruthy();
    expect(getByTestId(`booking-row-${BOOKING.id}`)).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('BookingCancellationScreen — loading state', () => {
  it('shows bookings-loading spinner while isLoadingBookings', () => {
    mockHookState = { ...mockHookState, isLoadingBookings: true };
    const { getByTestId } = renderScreen();
    expect(getByTestId('bookings-loading')).toBeTruthy();
  });

  it('hides bookings-loading spinner when not loading', () => {
    mockHookState = { ...mockHookState, isLoadingBookings: false };
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('bookings-loading')).toBeNull();
  });

  it('shows cancelling-loading spinner while isCancelling', () => {
    mockHookState = { ...mockHookState, bookings: [BOOKING], isCancelling: true };
    const { getByTestId } = renderScreen();
    expect(getByTestId('cancelling-loading')).toBeTruthy();
  });

  it('hides cancelling-loading spinner when not cancelling', () => {
    mockHookState = { ...mockHookState, bookings: [BOOKING], isCancelling: false };
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('cancelling-loading')).toBeNull();
  });

  it('lookup button is disabled while isLoadingBookings', () => {
    mockHookState = { ...mockHookState, isLoadingBookings: true };
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('cancel-email-input'), 'jane@example.com');
    expect(getByTestId('lookup-bookings-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('cancel booking buttons disabled while isCancelling', () => {
    mockHookState = { ...mockHookState, bookings: [BOOKING], isCancelling: true };
    const { getByTestId } = renderScreen();
    expect(getByTestId(`cancel-booking-${BOOKING.id}`).props.accessibilityState?.disabled).toBe(
      true,
    );
  });
});

// ── A11y audit ────────────────────────────────────────────────────────────────

describe('BookingCancellationScreen — a11y: email input', () => {
  it('has accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('cancel-email-input').props.accessibilityLabel).toBeTruthy();
  });
});

describe('BookingCancellationScreen — a11y: lookup button', () => {
  it('has accessibilityRole="button"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('lookup-bookings-button').props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('lookup-bookings-button').props.accessibilityLabel).toBeTruthy();
  });
});

describe('BookingCancellationScreen — a11y: done button', () => {
  beforeEach(() => {
    mockHookState = {
      ...mockHookState,
      cancelledBooking: {
        id: BOOKING.id,
        date: BOOKING.date,
        timeSlot: BOOKING.timeSlot,
        memberName: BOOKING.memberName,
      },
    };
  });

  it('has accessibilityRole="button"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('cancellation-done-button').props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('cancellation-done-button').props.accessibilityLabel).toBeTruthy();
  });
});

describe('BookingCancellationScreen — a11y: cancel booking button', () => {
  beforeEach(() => {
    mockHookState = { ...mockHookState, bookings: [BOOKING] };
  });

  it('has accessibilityRole="button"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId(`cancel-booking-${BOOKING.id}`).props.accessibilityRole).toBe('button');
  });

  it('accessibilityLabel identifies the booking date', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId(`cancel-booking-${BOOKING.id}`).props.accessibilityLabel).toMatch(/May 10/);
  });

  it('has accessibilityHint', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId(`cancel-booking-${BOOKING.id}`).props.accessibilityHint).toBeTruthy();
  });

  it('has accessibilityState.disabled=false when not cancelling', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId(`cancel-booking-${BOOKING.id}`).props.accessibilityState?.disabled).toBe(
      false,
    );
  });
});
