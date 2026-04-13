/**
 * TDD tests for ConsultationBookingScreen.
 *
 * Covers:
 *  - Calendar renders with day buttons
 *  - Past dates are rendered as disabled
 *  - Future dates are enabled and selectable
 *  - Selecting a date shows the time slot grid
 *  - No available slots shows empty state message
 *  - Selecting a slot updates selectedSlot
 *  - Taken slots are rendered disabled
 *  - Name and email inputs required
 *  - Book button disabled until date + slot + name + email all filled
 *  - Book button calls book() on press
 *  - Loading spinner shown while isBooking=true
 *  - Confirmation screen shown after confirmedBooking set
 *  - Confirmation shows date, time, name
 *  - Network error shows error message
 *  - Push permission denied — booking still completes (graceful)
 *  - Slot fetch error shows error message
 *
 * @bead deacon-o1xq
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ConsultationBookingScreen } from '../ConsultationBookingScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mock useConsultationBooking ───────────────────────────────────────────────

const mockBook = jest.fn();
const mockSetSelectedDate = jest.fn();
const mockSetSelectedSlot = jest.fn();

let mockHookState = {
  slots: [] as { time: string; available: boolean }[],
  slotsLoading: false,
  slotsError: null as string | null,
  selectedDate: null as string | null,
  setSelectedDate: mockSetSelectedDate,
  selectedSlot: null as string | null,
  setSelectedSlot: mockSetSelectedSlot,
  book: mockBook,
  isBooking: false,
  bookingError: null as string | null,
  confirmedBooking: null as {
    id: string;
    date: string;
    timeSlot: string;
    memberName: string;
    memberEmail: string;
  } | null,
};

jest.mock('@/hooks/useConsultationBooking', () => ({
  useConsultationBooking: () => mockHookState,
  ALL_SLOTS: [
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
  ],
}));

// ── Mock expo-notifications for push-denied test ──────────────────────────────

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-1'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

// ── Mock navigation ───────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10';
const TODAY_DISPLAY = /Apr.*10|10.*Apr/i;

// Pin system clock so the calendar renders with TODAY as today
beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-04-10T09:00:00Z') });
});
afterAll(() => {
  jest.useRealTimers();
});

function renderScreen() {
  return render(
    <ThemeProvider>
      <ConsultationBookingScreen />
    </ThemeProvider>,
  );
}

const availableSlots = [
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConsultationBookingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = {
      slots: [],
      slotsLoading: false,
      slotsError: null,
      selectedDate: null,
      setSelectedDate: mockSetSelectedDate,
      selectedSlot: null,
      setSelectedSlot: mockSetSelectedSlot,
      book: mockBook,
      isBooking: false,
      bookingError: null,
      confirmedBooking: null,
    };
  });

  // ── Screen structure ─────────────────────────────────────────────────────────

  describe('screen structure', () => {
    it('renders a heading for the screen', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('consultation-booking-screen')).toBeTruthy();
    });

    it('renders the calendar section', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('calendar-section')).toBeTruthy();
    });

    it('renders name and email inputs', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('member-name-input')).toBeTruthy();
      expect(getByTestId('member-email-input')).toBeTruthy();
    });

    it('renders the book button', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('book-button')).toBeTruthy();
    });
  });

  // ── Calendar ─────────────────────────────────────────────────────────────────

  describe('calendar', () => {
    it('renders day buttons for the next 14 days', () => {
      const { getAllByTestId } = renderScreen();
      const dayButtons = getAllByTestId(/^calendar-day-/);
      expect(dayButtons.length).toBeGreaterThanOrEqual(14);
    });

    it('past days are rendered disabled', () => {
      const { getByTestId } = renderScreen();
      // YYYY-MM-DD of a clearly past date encoded as testID
      const pastBtn = getByTestId(`calendar-day-2026-04-09`);
      expect(pastBtn.props.accessibilityState?.disabled).toBe(true);
    });

    it('today and future days are enabled', () => {
      const { getByTestId } = renderScreen();
      const todayBtn = getByTestId(`calendar-day-${TODAY}`);
      expect(todayBtn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('pressing a future day calls setSelectedDate', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(`calendar-day-${TODAY}`));
      expect(mockSetSelectedDate).toHaveBeenCalledWith(TODAY);
    });

    it('selected date is visually indicated', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY };
      const { getByTestId } = renderScreen();
      const btn = getByTestId(`calendar-day-${TODAY}`);
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });
  });

  // ── Time slot grid ───────────────────────────────────────────────────────────

  describe('time slot grid', () => {
    it('does not render slot grid before a date is selected', () => {
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('slot-grid')).toBeNull();
    });

    it('renders slot grid once a date is selected', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: availableSlots };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slot-grid')).toBeTruthy();
    });

    it('renders a button for each slot', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: availableSlots };
      const { getByTestId } = renderScreen();
      availableSlots.forEach((s) => {
        expect(getByTestId(`slot-${s.time}`)).toBeTruthy();
      });
    });

    it('taken slots are disabled', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: availableSlots };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slot-10:00').props.accessibilityState?.disabled).toBe(true);
    });

    it('available slots are enabled', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: availableSlots };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slot-09:00').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('pressing an available slot calls setSelectedSlot', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: availableSlots };
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('slot-09:00'));
      expect(mockSetSelectedSlot).toHaveBeenCalledWith('09:00');
    });

    it('selected slot is visually indicated', () => {
      mockHookState = {
        ...mockHookState,
        selectedDate: TODAY,
        slots: availableSlots,
        selectedSlot: '09:00',
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slot-09:00').props.accessibilityState?.selected).toBe(true);
    });

    it('shows empty-state message when no slots are available', () => {
      const noSlots = availableSlots.map((s) => ({ ...s, available: false }));
      mockHookState = { ...mockHookState, selectedDate: TODAY, slots: noSlots };
      const { getByTestId } = renderScreen();
      expect(getByTestId('no-slots-message')).toBeTruthy();
    });

    it('shows loading indicator while slotsLoading=true', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, slotsLoading: true };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slots-loading')).toBeTruthy();
    });

    it('shows slot fetch error when slotsError is set', () => {
      mockHookState = {
        ...mockHookState,
        selectedDate: TODAY,
        slotsError: 'Failed to load available times.',
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('slots-error')).toBeTruthy();
    });
  });

  // ── Book button state ─────────────────────────────────────────────────────────

  describe('book button', () => {
    it('is disabled when no date, slot, name, or email', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('book-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled when slot is selected but name/email empty', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, selectedSlot: '09:00' };
      const { getByTestId } = renderScreen();
      expect(getByTestId('book-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled when date, slot, name, email all filled', () => {
      mockHookState = { ...mockHookState, selectedDate: TODAY, selectedSlot: '09:00' };
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('member-name-input'), 'Jane Doe');
      fireEvent.changeText(getByTestId('member-email-input'), 'jane@example.com');
      expect(getByTestId('book-button').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('calls book() with correct args when pressed', () => {
      mockBook.mockResolvedValue(true);
      mockHookState = { ...mockHookState, selectedDate: TODAY, selectedSlot: '09:00' };
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('member-name-input'), 'Jane Doe');
      fireEvent.changeText(getByTestId('member-email-input'), 'jane@example.com');
      fireEvent.press(getByTestId('book-button'));
      expect(mockBook).toHaveBeenCalledWith(
        expect.objectContaining({
          date: TODAY,
          timeSlot: '09:00',
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
        }),
      );
    });

    it('shows loading spinner while isBooking=true', () => {
      mockHookState = { ...mockHookState, isBooking: true };
      const { getByTestId } = renderScreen();
      expect(getByTestId('booking-loading')).toBeTruthy();
    });

    it('is disabled while isBooking=true', () => {
      mockHookState = {
        ...mockHookState,
        selectedDate: TODAY,
        selectedSlot: '09:00',
        isBooking: true,
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('book-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ── Confirmation state ────────────────────────────────────────────────────────

  describe('confirmation state', () => {
    const confirmed = {
      id: 'booking-001',
      date: TODAY,
      timeSlot: '09:30',
      memberName: 'Jane Doe',
      memberEmail: 'jane@example.com',
    };

    it('shows confirmation screen when confirmedBooking is set', () => {
      mockHookState = { ...mockHookState, confirmedBooking: confirmed };
      const { getByTestId } = renderScreen();
      expect(getByTestId('booking-confirmation')).toBeTruthy();
    });

    it('confirmation displays the member name', () => {
      mockHookState = { ...mockHookState, confirmedBooking: confirmed };
      const { getByText } = renderScreen();
      expect(getByText(/Jane Doe/)).toBeTruthy();
    });

    it('confirmation displays the booked time slot', () => {
      mockHookState = { ...mockHookState, confirmedBooking: confirmed };
      const { getByText } = renderScreen();
      expect(getByText(/09:30/)).toBeTruthy();
    });

    it('hides the booking form after confirmation', () => {
      mockHookState = { ...mockHookState, confirmedBooking: confirmed };
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('book-button')).toBeNull();
    });
  });

  // ── Error state ───────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows bookingError message when set', () => {
      mockHookState = {
        ...mockHookState,
        bookingError: 'That time slot was just booked. Please choose another.',
      };
      const { getByTestId } = renderScreen();
      expect(getByTestId('booking-error')).toBeTruthy();
    });
  });

  // ── Push permission denied ────────────────────────────────────────────────────

  describe('push permission denied', () => {
    it('does not block booking when push is denied — book() still called', () => {
      mockBook.mockResolvedValue(true);
      mockHookState = { ...mockHookState, selectedDate: TODAY, selectedSlot: '09:00' };
      const { getByTestId } = renderScreen();
      fireEvent.changeText(getByTestId('member-name-input'), 'Alice');
      fireEvent.changeText(getByTestId('member-email-input'), 'alice@example.com');
      fireEvent.press(getByTestId('book-button'));
      // book() is called regardless of push permission
      expect(mockBook).toHaveBeenCalled();
    });
  });
});
