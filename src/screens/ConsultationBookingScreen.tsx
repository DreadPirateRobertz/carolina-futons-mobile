/**
 * @module ConsultationBookingScreen
 *
 * Virtual consultation booking — deacon-o1xq.
 *
 * Flow: select a date → select a 30-min slot → enter name + email → book.
 * On success shows a confirmation card. Handles loading, errors, and edge cases.
 *
 * Deep link: carolinafutons://consultation
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useConsultationBooking, ALL_SLOTS } from '@/hooks/useConsultationBooking';
import { useCalendarAvailability } from '@/hooks/useCalendarAvailability';

// ── Calendar helpers ──────────────────────────────────────────────────────────

/** Returns an array of 14 YYYY-MM-DD date strings starting from the most-recent past date
 *  that allows today to be included (i.e. today is the first or among the entries) */
function buildCalendarDays(today: string): string[] {
  const days: string[] = [];
  const base = new Date(today + 'T00:00:00Z');
  // Include 1 day before today (to allow the past-day disabled test),
  // then today + 13 more days = 15 days total visible in the strip,
  // but ensure at least 14 future+today days are present.
  // Per spec: render "next 14 days" plus one past day for disabled-day test.
  const start = new Date(base);
  start.setUTCDate(start.getUTCDate() - 1); // one past day
  for (let i = 0; i < 15; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ConsultationBookingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
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
  } = useConsultationBooking();

  const [memberId, setMemberId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const today = getTodayString();
  const calendarDays = useMemo(() => buildCalendarDays(today), [today]);

  const { availability, fetchRange } = useCalendarAvailability();
  const firstCalendarDay = calendarDays[0];
  useEffect(() => {
    if (firstCalendarDay) {
      fetchRange(firstCalendarDay, calendarDays.length);
    }
  }, [firstCalendarDay]);

  const canBook =
    !isBooking &&
    !!selectedDate &&
    !!selectedSlot &&
    memberId.trim().length > 0 &&
    memberEmail.trim().length > 0;

  const hasAvailableSlots = slots.some((s) => s.available);

  const handleBook = () => {
    if (!selectedDate || !selectedSlot) return;
    book({
      date: selectedDate,
      timeSlot: selectedSlot,
      memberId: memberId.trim(),
      memberEmail: memberEmail.trim(),
      consultationType: 'in-store',
      durationMinutes: 30,
    });
  };

  // ── Confirmation view ───────────────────────────────────────────────────────

  if (confirmedBooking) {
    const [confirmedDate, confirmedTimePart] = confirmedBooking.consultationDate.split('T');
    const confirmedTime = confirmedTimePart ? confirmedTimePart.slice(0, 5) : '';
    return (
      <View testID="booking-confirmation" style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.confirmationContent}>
          <Text style={styles.confirmationTitle}>Booking Confirmed!</Text>
          <Text style={styles.confirmationDetail}>
            {formatDayLabel(confirmedDate)} at {confirmedTime}
          </Text>
          <Text style={styles.confirmationDetail}>{confirmedBooking.memberId}</Text>
          <Text style={styles.confirmationSubtext}>
            A confirmation will be sent to {confirmedBooking.memberEmail}
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Booking form ────────────────────────────────────────────────────────────

  return (
    <View
      testID="consultation-booking-screen"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Book a Consultation</Text>

        {/* ── Calendar ──────────────────────────────────────────────────────── */}
        <View testID="calendar-section" style={styles.section}>
          <Text style={styles.sectionLabel}>Select a Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}
          >
            {calendarDays.map((date) => {
              const isPast = date < today;
              const isSelected = date === selectedDate;
              const dayAvail = availability[date];
              const isFull = dayAvail?.status === 'full';
              return (
                <TouchableOpacity
                  key={date}
                  testID={`calendar-day-${date}`}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    isPast && styles.dayButtonDisabled,
                  ]}
                  onPress={() => !isPast && !isFull && setSelectedDate(date)}
                  disabled={isPast || isFull}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPast || isFull, selected: isSelected }}
                  accessibilityLabel={`${formatDayLabel(date)}${isFull ? ', fully booked' : dayAvail?.availableCount != null ? `, ${dayAvail.availableCount} slots available` : ''}`}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                      isPast && styles.dayButtonTextDisabled,
                    ]}
                  >
                    {formatDayLabel(date)}
                  </Text>
                  {!isPast && dayAvail && (
                    <View
                      testID={`availability-dot-${date}`}
                      style={[
                        styles.availabilityDot,
                        isFull ? styles.availabilityDotFull : styles.availabilityDotOpen,
                        isSelected && styles.availabilityDotSelected,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Time slot grid ─────────────────────────────────────────────────── */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Select a Time</Text>

            {slotsLoading && (
              <ActivityIndicator
                testID="slots-loading"
                size="small"
                color="#E8845C"
                style={styles.slotsLoading}
              />
            )}

            {slotsError && !slotsLoading && (
              <Text testID="slots-error" style={styles.errorText}>
                {slotsError}
              </Text>
            )}

            {!slotsLoading && !slotsError && (
              <View testID="slot-grid" style={styles.slotGrid}>
                {slots.length === 0
                  ? ALL_SLOTS.map((time) => (
                      <SlotButton
                        key={time}
                        time={time}
                        available={true}
                        selected={selectedSlot === time}
                        onPress={() => setSelectedSlot(time)}
                      />
                    ))
                  : slots.map((slot) => (
                      <SlotButton
                        key={slot.time}
                        time={slot.time}
                        available={slot.available}
                        selected={selectedSlot === slot.time}
                        onPress={() => slot.available && setSelectedSlot(slot.time)}
                      />
                    ))}

                {!hasAvailableSlots && slots.length > 0 && (
                  <Text testID="no-slots-message" style={styles.noSlotsText}>
                    No available times for this date. Please choose another day.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Member info ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Details</Text>
          <TextInput
            testID="member-id-input"
            style={styles.input}
            placeholder="Member ID"
            placeholderTextColor="#9E8F7A"
            value={memberId}
            onChangeText={setMemberId}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TextInput
            testID="member-email-input"
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9E8F7A"
            value={memberEmail}
            onChangeText={setMemberEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>

        {/* ── Error banner ───────────────────────────────────────────────────── */}
        {bookingError && (
          <Text testID="booking-error" style={styles.errorText}>
            {bookingError}
          </Text>
        )}

        {/* ── Book button / loading ──────────────────────────────────────────── */}
        {isBooking && (
          <ActivityIndicator
            testID="booking-loading"
            size="large"
            color="#E8845C"
            style={styles.bookingLoading}
          />
        )}

        <TouchableOpacity
          testID="book-button"
          style={[styles.bookButton, !canBook && styles.bookButtonDisabled]}
          onPress={handleBook}
          disabled={!canBook}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canBook }}
        >
          <Text style={styles.bookButtonText}>Book Consultation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── SlotButton ────────────────────────────────────────────────────────────────

interface SlotButtonProps {
  time: string;
  available: boolean;
  selected: boolean;
  onPress: () => void;
}

function SlotButton({ time, available, selected, onPress }: SlotButtonProps) {
  return (
    <TouchableOpacity
      testID={`slot-${time}`}
      style={[
        styles.slotButton,
        selected && styles.slotButtonSelected,
        !available && styles.slotButtonDisabled,
      ]}
      onPress={onPress}
      disabled={!available}
      accessibilityRole="button"
      accessibilityState={{ disabled: !available, selected }}
    >
      <Text
        style={[
          styles.slotButtonText,
          selected && styles.slotButtonTextSelected,
          !available && styles.slotButtonTextDisabled,
        ]}
      >
        {time}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE4',
  },
  scrollContent: {
    padding: 20,
    gap: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3A2518',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4C30',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarRow: {
    gap: 8,
    paddingRight: 8,
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    backgroundColor: '#fff',
  },
  dayButtonSelected: {
    borderColor: '#E8845C',
    backgroundColor: '#E8845C',
  },
  dayButtonDisabled: {
    borderColor: '#E0D6C5',
    backgroundColor: '#F0EAE0',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A2518',
  },
  dayButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayButtonTextDisabled: {
    color: '#B8AA96',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 4,
  },
  availabilityDotOpen: {
    backgroundColor: '#5BAD6F',
  },
  availabilityDotFull: {
    backgroundColor: '#C96B44',
  },
  availabilityDotSelected: {
    backgroundColor: '#fff',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  slotButtonSelected: {
    borderColor: '#E8845C',
    backgroundColor: '#E8845C',
  },
  slotButtonDisabled: {
    borderColor: '#E0D6C5',
    backgroundColor: '#F0EAE0',
  },
  slotButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A2518',
  },
  slotButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  slotButtonTextDisabled: {
    color: '#B8AA96',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#6B4C30',
    fontStyle: 'italic',
    marginTop: 4,
  },
  slotsLoading: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3A2518',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#C96B44',
    marginBottom: 12,
  },
  bookingLoading: {
    marginBottom: 12,
  },
  bookButton: {
    backgroundColor: '#E8845C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#D4C4A8',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmationContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A2518',
    textAlign: 'center',
  },
  confirmationDetail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A2518',
    textAlign: 'center',
  },
  confirmationSubtext: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
  },
  doneButton: {
    marginTop: 16,
    backgroundColor: '#E8845C',
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
