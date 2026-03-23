/**
 * @module AvatarDisplay
 *
 * Chibi bear avatar with optional accessory overlay.
 * Renders at sm/md/lg sizes. Bounces on equip via Reanimated spring.
 *
 * cf-ymo / Phase 6
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { LoyaltyTier } from '@/hooks/useLoyalty';
import { getAccessoryById } from '@/data/accessories';

const SIZE_MAP = { sm: 32, md: 64, lg: 128 } as const;

const TIER_BG: Record<LoyaltyTier, string> = {
  bronze: '#CD7F32',
  silver: '#9EA7AD',
  gold: '#D4AF37',
};

interface Props {
  size?: keyof typeof SIZE_MAP;
  equippedAccessoryId?: string | null;
  tier?: LoyaltyTier;
  testID?: string;
}

export function AvatarDisplay({ size = 'md', equippedAccessoryId, tier, testID }: Props) {
  const { borderRadius } = useTheme();
  const px = SIZE_MAP[size];
  const bgColor = tier ? TIER_BG[tier] : '#4878A8';

  const scale = useSharedValue(1);

  useEffect(() => {
    if (!equippedAccessoryId) return;
    scale.value = withSequence(withSpring(1.2), withSpring(1));
  }, [equippedAccessoryId, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const accessory = equippedAccessoryId ? getAccessoryById(equippedAccessoryId) : null;
  const bearFontSize = Math.round(px * 0.55);
  const accessoryFontSize = Math.round(px * 0.3);

  return (
    <Animated.View
      testID={testID ?? 'avatar-display'}
      accessibilityRole="image"
      accessibilityLabel={`Avatar${tier ? ` — ${tier} tier` : ''}${accessory ? `, wearing ${accessory.name}` : ''}`}
      style={[
        styles.container,
        animatedStyle,
        {
          width: px,
          height: px,
          borderRadius: borderRadius.pill,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.bear, { fontSize: bearFontSize }]}>🐻</Text>
      {accessory && (
        <Text
          testID="avatar-accessory"
          style={[styles.accessory, { fontSize: accessoryFontSize }]}
        >
          {accessory.emoji}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bear: {
    textAlign: 'center',
  },
  accessory: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
