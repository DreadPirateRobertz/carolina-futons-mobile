// src/components/SommelierHeroCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import type { SommelierCacheEntry } from '@/services/personalizationCache';

const DISMISSED_KEY = '@cf_sommelier_hero_dismissed';

interface SommelierHeroCardProps {
  result: SommelierCacheEntry;
  onSeePicks: () => void;
}

export function SommelierHeroCard({ result, onSeePicks }: SommelierHeroCardProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => setDismissed(v === 'true'))
      .catch(() => setDismissed(false));
  }, []);

  async function handleDismiss() {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, 'true');
      setDismissed(true);
    } catch {
      setDismissed(true); // still hide even if storage fails
    }
  }

  // null = still loading from AsyncStorage
  if (dismissed === null || dismissed) return null;

  return (
    <View
      testID="sommelier-hero-card"
      style={{
        backgroundColor: colors.sandBase,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <TouchableOpacity
        testID="sommelier-hero-dismiss"
        onPress={handleDismiss}
        accessibilityLabel="Dismiss style recommendation"
        style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.sm }}
      >
        <Text style={{ color: colors.espresso, fontSize: 16 }}>×</Text>
      </TouchableOpacity>

      <Text
        style={{
          fontFamily: typography.bodyFamily,
          fontSize: 12,
          color: colors.espresso,
          marginBottom: spacing.sm / 2,
        }}
      >
        Based on your style quiz
      </Text>
      <Text
        style={{
          fontFamily: typography.headingFamily,
          fontSize: 18,
          color: colors.espresso,
          marginBottom: spacing.sm,
        }}
      >
        {result.topStyle}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
        {(result.flavors ?? []).map((f) => (
          <View
            key={f}
            style={{
              backgroundColor: colors.offWhite,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              marginRight: spacing.sm / 2,
              marginBottom: spacing.sm / 2,
            }}
          >
            <Text
              style={{ fontFamily: typography.bodyFamily, fontSize: 12, color: colors.espresso }}
            >
              {f}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onSeePicks}
        accessibilityRole="button"
        accessibilityLabel="See your picks"
        style={{
          backgroundColor: colors.sunsetCoral,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.offWhite,
            fontFamily: typography.bodyFamily,
            fontWeight: '600',
          }}
        >
          See your picks
        </Text>
      </TouchableOpacity>
    </View>
  );
}
