import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { type Store, isStoreOpen, formatPhone } from '@/data/stores';

interface Props {
  store: Store;
  distance?: number;
  onPress?: (store: Store) => void;
  testID?: string;
}

export const StoreCard = React.memo(function StoreCard({ store, distance, onPress, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const open = isStoreOpen(store);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.white, borderRadius: borderRadius.card },
      ]}
      onPress={() => onPress?.(store)}
      testID={testID ?? `store-card-${store.id}`}
      accessibilityLabel={`${store.name}, ${store.city}, ${open ? 'Open' : 'Closed'}`}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: colors.espresso }]}
            numberOfLines={1}
            testID={testID ? `${testID}-name` : undefined}
          >
            {store.name}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: open ? colors.success : colors.muted }]}
            testID={testID ? `${testID}-status` : undefined}
          >
            <Text style={styles.statusText}>{open ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
        <Text
          style={[styles.address, { color: colors.espressoLight }]}
          testID={testID ? `${testID}-address` : undefined}
        >
          {store.address}, {store.city}, {store.state} {store.zip}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.sandDark }]}>
        <Text style={[styles.phone, { color: colors.mountainBlue }]}>
          {formatPhone(store.phone)}
        </Text>
        {distance != null && (
          <Text
            style={[styles.distance, { color: colors.espressoLight }]}
            testID={testID ? `${testID}-distance` : undefined}
          >
            {distance} mi
          </Text>
        )}
      </View>

      {store.features.length > 0 && (
        <View style={[styles.features, { paddingHorizontal: spacing.md }]}>
          {store.features.slice(0, 3).map((feature) => (
            <View key={feature} style={[styles.featureChip, { backgroundColor: colors.sandLight }]}>
              <Text style={[styles.featureText, { color: colors.espressoLight }]}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  phone: {
    fontSize: 14,
    fontWeight: '600',
  },
  distance: {
    fontSize: 13,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 12,
  },
  featureChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 12,
  },
});
