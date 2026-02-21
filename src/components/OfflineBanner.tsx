import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';

interface Props {
  testID?: string;
}

export function OfflineBanner({ testID }: Props) {
  const { colors } = useTheme();
  const { isOnline } = useConnectivity();

  if (isOnline) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.espresso }]}
      testID={testID ?? 'offline-banner'}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Browsing cached products."
    >
      <Text style={styles.bannerText}>You're offline — browsing cached products</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
