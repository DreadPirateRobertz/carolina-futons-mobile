/**
 * @module BookingCancellationScreen
 *
 * Consultation booking cancellation — cm-lfe.
 *
 * Flow: enter email → look up bookings → select one → confirm cancel.
 * On success shows a confirmation card. Handles loading and error states.
 *
 * Deep link: carolinafutons://consultation/cancel
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBookingCancellation } from '@/hooks/useBookingCancellation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function BookingCancellationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
    bookings,
    isLoadingBookings,
    loadError,
    isCancelling,
    cancelError,
    cancelledBooking,
    loadBookings,
    cancelBooking,
  } = useBookingCancellation();

  const [email, setEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const canLookup = email.trim().length > 0 && !isLoadingBookings;

  const handleLookup = () => {
    setHasSearched(true);
    loadBookings(email.trim());
  };

  const handleCancel = (bookingId: string, dateLabel: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel the booking on ${dateLabel}? This cannot be undone.`,
      [
        { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => cancelBooking(bookingId, 'User-initiated cancellation'),
        },
      ],
    );
  };

  // ── Success view ─────────────────────────────────────────────────────────────

  if (cancelledBooking) {
    return (
      <View
        testID="booking-cancellation-screen"
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView contentContainerStyle={styles.centeredContent}>
          <View testID="cancellation-success">
            <Text style={styles.successTitle}>Booking Cancelled</Text>
            <Text style={styles.successDetail}>
              {formatDayLabel(cancelledBooking.date)} at {cancelledBooking.timeSlot}
            </Text>
            <Text style={styles.successSubtext}>
              A confirmation has been sent to your email address.
            </Text>
          </View>
          <TouchableOpacity
            testID="cancellation-done-button"
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Done, return to previous screen"
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────────

  return (
    <View
      testID="booking-cancellation-screen"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Cancel a Booking</Text>

        {/* ── Email lookup ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Email</Text>
          <TextInput
            testID="cancel-email-input"
            style={styles.input}
            placeholder="Email address used for booking"
            placeholderTextColor="#9E8F7A"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={canLookup ? handleLookup : undefined}
            accessibilityLabel="Email address for booking lookup"
          />
          <TouchableOpacity
            testID="lookup-bookings-button"
            style={[styles.primaryButton, !canLookup && styles.buttonDisabled]}
            onPress={handleLookup}
            disabled={!canLookup}
            accessibilityRole="button"
            accessibilityLabel="Find my bookings"
            accessibilityState={{ disabled: !canLookup }}
          >
            <Text style={styles.primaryButtonText}>Find My Bookings</Text>
          </TouchableOpacity>
        </View>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {isLoadingBookings && (
          <ActivityIndicator
            testID="bookings-loading"
            size="large"
            color="#E8845C"
            style={styles.loadingIndicator}
          />
        )}

        {/* ── Load error ────────────────────────────────────────────────────── */}
        {loadError && !isLoadingBookings && (
          <Text testID="load-error" style={styles.errorText}>
            {loadError}
          </Text>
        )}

        {/* ── Cancellation error ────────────────────────────────────────────── */}
        {cancelError && (
          <Text testID="cancel-error" style={styles.errorText}>
            {cancelError}
          </Text>
        )}

        {/* ── Cancelling loading ────────────────────────────────────────────── */}
        {isCancelling && (
          <ActivityIndicator
            testID="cancelling-loading"
            size="small"
            color="#E8845C"
            style={styles.loadingIndicator}
          />
        )}

        {/* ── Bookings list ─────────────────────────────────────────────────── */}
        {!isLoadingBookings && hasSearched && bookings.length === 0 && !loadError && (
          <Text style={styles.emptyText}>No upcoming bookings found for this email.</Text>
        )}

        {bookings.map((booking) => (
          <View key={booking.id} testID={`booking-row-${booking.id}`} style={styles.bookingCard}>
            <View style={styles.bookingDetails}>
              <Text style={styles.bookingDate}>{formatDayLabel(booking.date)}</Text>
              <Text style={styles.bookingTime}>{booking.timeSlot}</Text>
              <Text style={styles.bookingName}>{booking.memberName}</Text>
            </View>
            <TouchableOpacity
              testID={`cancel-booking-${booking.id}`}
              style={[styles.cancelButton, isCancelling && styles.buttonDisabled]}
              onPress={() => handleCancel(booking.id, formatDayLabel(booking.date))}
              disabled={isCancelling}
              accessibilityRole="button"
              accessibilityLabel={`Cancel booking on ${formatDayLabel(booking.date)}`}
              accessibilityHint="Opens a confirmation before cancelling"
              accessibilityState={{ disabled: isCancelling }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
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
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
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
  primaryButton: {
    backgroundColor: '#E8845C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#D4C4A8',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingIndicator: {
    marginVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C96B44',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B4C30',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingDetails: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A2518',
  },
  bookingTime: {
    fontSize: 14,
    color: '#6B4C30',
    marginTop: 2,
  },
  bookingName: {
    fontSize: 13,
    color: '#9E8F7A',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#F5EFE4',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C96B44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  cancelButtonText: {
    color: '#C96B44',
    fontSize: 14,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A2518',
    textAlign: 'center',
  },
  successDetail: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3A2518',
    textAlign: 'center',
    marginTop: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#6B4C30',
    textAlign: 'center',
    marginTop: 8,
  },
});
