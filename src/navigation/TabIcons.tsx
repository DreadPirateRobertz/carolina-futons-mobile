/**
 * @module TabIcons
 *
 * Custom SVG tab bar icons for the four primary navigation destinations.
 * Designed to match the Blue Ridge Mountain editorial aesthetic.
 *
 * - HomeTabIcon: Mountain peak with house silhouette + optional streak flame badge
 * - ShopTabIcon: Stylized tag with mountain outline
 * - CartTabIcon: Shopping bag with subtle arc detail
 * - AccountTabIcon: Profile silhouette + optional tier crown badge
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import type { LoyaltyTierConfig } from '../data/loyaltyTiers';

const SIZE = 24;

interface BaseIconProps {
  focused: boolean;
  color: string;
}

interface HomeIconProps extends BaseIconProps {
  streak?: number;
}

interface AccountIconProps extends BaseIconProps {
  tier?: LoyaltyTierConfig;
}

/** Mountain peak with a small house — Home destination. */
export function HomeTabIcon({ focused, color, streak }: HomeIconProps) {
  const showStreak = streak !== undefined && streak > 1;

  return (
    <View style={styles.iconWrap}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
        {/* Mountain silhouette */}
        <Path
          d="M2 18 L8 8 L12 13 L16 6 L22 18 Z"
          fill={focused ? color : 'none'}
          stroke={color}
          strokeWidth={focused ? 0 : 1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* House chimney peak */}
        <Path
          d="M10 18 L10 14 L12 12 L14 14 L14 18"
          fill={focused ? 'rgba(0,0,0,0.3)' : 'none'}
          stroke={color}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* Door */}
        <Rect x="11.2" y="15.5" width="1.6" height="2.5" rx="0.4" fill={color} opacity={0.9} />
      </Svg>

      {showStreak && (
        <View testID="streak-badge" style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥</Text>
        </View>
      )}
    </View>
  );
}

/** Price tag with mountain outline — Shop destination. */
export function ShopTabIcon({ focused, color }: BaseIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
        {/* Tag body */}
        <Path
          d="M3 3 L3 13 L12 22 L22 12 L13 3 Z"
          fill={focused ? color : 'none'}
          stroke={color}
          strokeWidth={focused ? 0 : 1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Tag hole */}
        <Circle cx="7.5" cy="7.5" r="1.2" fill={focused ? 'rgba(0,0,0,0.3)' : color} />
        {/* Mountain lines inside tag */}
        <Path
          d="M8 15 L11 11 L14 15"
          stroke={focused ? 'rgba(0,0,0,0.35)' : color}
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={focused ? 1 : 0.6}
        />
      </Svg>
    </View>
  );
}

/** Shopping bag with arc detail — Cart destination. */
export function CartTabIcon({ focused, color }: BaseIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
        {/* Bag body */}
        <Path
          d="M5 9 L5 20 C5 20.55 5.45 21 6 21 L18 21 C18.55 21 19 20.55 19 20 L19 9 Z"
          fill={focused ? color : 'none'}
          stroke={color}
          strokeWidth={focused ? 0 : 1.6}
          strokeLinejoin="round"
        />
        {/* Bag handle */}
        <Path
          d="M9 9 C9 9 9 5 12 5 C15 5 15 9 15 9"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        {/* Decorative mountain arc on bag */}
        <Path
          d="M8 16 L11 13 L14 16"
          stroke={focused ? 'rgba(0,0,0,0.3)' : color}
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={focused ? 1 : 0.5}
        />
      </Svg>
    </View>
  );
}

/** Profile silhouette with optional tier crown badge — Account destination. */
export function AccountTabIcon({ focused, color, tier }: AccountIconProps) {
  // Show badge for Mountain Guide and above (minPoints >= 500)
  const showTierBadge = tier !== undefined && tier.minPoints >= 500;
  const tierColor = tier?.color;

  return (
    <View style={styles.iconWrap}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
        {/* Head circle */}
        <Circle
          cx="12"
          cy="8"
          r="4"
          fill={focused ? color : 'none'}
          stroke={color}
          strokeWidth={focused ? 0 : 1.6}
        />
        {/* Shoulders */}
        <Path
          d="M4 21 C4 17 7.58 14 12 14 C16.42 14 20 17 20 21"
          fill={focused ? color : 'none'}
          stroke={color}
          strokeWidth={focused ? 0 : 1.6}
          strokeLinecap="round"
        />
      </Svg>

      {showTierBadge && tierColor && (
        <View testID="tier-badge" style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.tierText}>★</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
  },
  streakBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 10,
    lineHeight: 12,
  },
  tierBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: '700',
    lineHeight: 10,
  },
});
