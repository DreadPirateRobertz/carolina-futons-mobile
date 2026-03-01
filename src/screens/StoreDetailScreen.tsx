import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import {
  useStoreById,
  APPOINTMENT_TYPES,
  type Store,
  type AppointmentType,
} from '@/hooks/useStores';
import { isStoreOpen, formatPhone } from '@/utils';
import { Button } from '@/components/Button';

interface Props {
  storeId?: string;
  store?: Store;
  testID?: string;
}

export function StoreDetailScreen({ storeId, store: storeProp, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  // Data from hook — replaces direct STORES import
  const { store: hookStore, isLoading, error } = useStoreById(storeId);
  const store = storeProp ?? hookStore;

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentType | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const handleCall = useCallback(() => {
    if (!store) return;
    Linking.openURL(`tel:${store.phone}`);
  }, [store]);

  const handleDirections = useCallback(() => {
    if (!store) return;
    const address = encodeURIComponent(
      `${store.address}, ${store.city}, ${store.state} ${store.zip}`,
    );
    const url = Platform.OS === 'ios' ? `maps:?daddr=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url);
  }, [store]);

  const handleEmail = useCallback(() => {
    if (!store) return;
    Linking.openURL(`mailto:${store.email}`);
  }, [store]);

  const handleBookAppointment = useCallback(() => {
    if (!selectedAppointment) return;
    setBookingConfirmed(true);
  }, [selectedAppointment]);

  // Loading state
  if (isLoading && !storeProp) {
    return (
      <View style={[styles.container, { backgroundColor: colors.sandBase }]} testID="store-loading">
        <Text style={[styles.errorText, { color: colors.espressoLight }]}>
          Loading store details...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !storeProp) {
    return (
      <View style={[styles.container, { backgroundColor: colors.sandBase }]} testID="store-error">
        <Text style={[styles.errorText, { color: colors.espressoLight }]}>
          We couldn't load this store
        </Text>
        <Text style={[styles.errorDetail, { color: colors.espressoLight }]}>{error.message}</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'store-detail-screen'}
      >
        <Text style={[styles.errorText, { color: colors.espresso }]}>Store not found</Text>
      </View>
    );
  }

  const open = isStoreOpen(store);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'store-detail-screen'}
    >
      {/* Photo */}
      {store.photos.length > 0 && (
        <Image
          source={{ uri: store.photos[0] }}
          style={styles.heroImage}
          contentFit="cover"
          transition={300}
          testID="store-detail-photo"
        />
      )}

      {/* Header */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.storeName, { color: colors.espresso }]} testID="store-detail-name">
            {store.name}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: open ? colors.success : colors.muted }]}
            testID="store-detail-status"
          >
            <Text style={styles.statusText}>{open ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: colors.espressoLight }]}>
          {store.description}
        </Text>
      </View>

      {/* Address & Contact */}
      <View
        style={[
          styles.section,
          styles.contactCard,
          shadows.card,
          {
            backgroundColor: colors.white,
            marginHorizontal: spacing.lg,
            borderRadius: borderRadius.card,
          },
        ]}
      >
        <Text style={[styles.address, { color: colors.espresso }]} testID="store-detail-address">
          {store.address}
          {'\n'}
          {store.city}, {store.state} {store.zip}
        </Text>
        <Text style={[styles.phone, { color: colors.mountainBlue }]} testID="store-detail-phone">
          {formatPhone(store.phone)}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.mountainBlue }]}
            onPress={handleDirections}
            testID="store-detail-directions"
            accessibilityLabel="Get directions"
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.sunsetCoral }]}
            onPress={handleCall}
            testID="store-detail-call"
            accessibilityLabel={`Call ${store.name}`}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.espressoLight }]}
            onPress={handleEmail}
            testID="store-detail-email"
            accessibilityLabel={`Email ${store.name}`}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hours */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Hours</Text>
        {store.hours.map((h) => (
          <View key={h.day} style={styles.hoursRow} testID={`store-hours-${h.day.toLowerCase()}`}>
            <Text style={[styles.hoursDay, { color: colors.espresso }]}>{h.day}</Text>
            <Text style={[styles.hoursTime, { color: colors.espressoLight }]}>
              {h.closed ? 'Closed' : `${h.open} – ${h.close}`}
            </Text>
          </View>
        ))}
      </View>

      {/* Features */}
      {store.features.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Features</Text>
          <View style={styles.featureList}>
            {store.features.map((feature) => (
              <View
                key={feature}
                style={[styles.featureChip, { backgroundColor: colors.sandLight }]}
              >
                <Text style={[styles.featureText, { color: colors.espressoLight }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Appointment Booking */}
      <View style={[styles.section, { paddingHorizontal: spacing.lg, paddingBottom: 40 }]}>
        <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Book an Appointment</Text>

        {bookingConfirmed ? (
          <View
            style={[
              styles.confirmationCard,
              { backgroundColor: colors.sandLight, borderRadius: borderRadius.card },
            ]}
            testID="booking-confirmation"
          >
            <Text style={[styles.confirmationTitle, { color: colors.success }]}>
              Appointment Requested
            </Text>
            <Text style={[styles.confirmationText, { color: colors.espressoLight }]}>
              We'll contact you at the store to confirm your{' '}
              {APPOINTMENT_TYPES.find((t) => t.value === selectedAppointment)?.label.toLowerCase()}{' '}
              appointment.
            </Text>
          </View>
        ) : (
          <>
            {APPOINTMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.appointmentOption,
                  {
                    borderColor:
                      selectedAppointment === type.value ? colors.mountainBlue : colors.sandDark,
                    backgroundColor:
                      selectedAppointment === type.value ? colors.mountainBlueLight : colors.white,
                    borderRadius: borderRadius.card,
                  },
                ]}
                onPress={() => setSelectedAppointment(type.value)}
                testID={`appointment-${type.value}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedAppointment === type.value }}
              >
                <Text
                  style={[
                    styles.appointmentLabel,
                    {
                      color:
                        selectedAppointment === type.value
                          ? colors.mountainBlueDark
                          : colors.espresso,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
            <Button
              label="Request Appointment"
              onPress={handleBookAppointment}
              disabled={!selectedAppointment}
              testID="book-appointment-button"
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  section: {
    paddingTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactCard: {
    padding: 16,
  },
  address: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: '500',
  },
  hoursTime: {
    fontSize: 14,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 13,
  },
  appointmentOption: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  appointmentLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationCard: {
    padding: 20,
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
});
