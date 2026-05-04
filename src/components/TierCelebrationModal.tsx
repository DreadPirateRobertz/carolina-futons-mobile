/**
 * @module TierCelebrationModal
 *
 * Phase 5 — Full-screen celebration modal shown when the user earns a new
 * loyalty tier. Features:
 *   - Reanimated confetti rain (30 coloured particles, JS-driven)
 *   - Spring-animated badge reveal (scale 0 → 1 with overshoot)
 *   - Fade-in congratulations copy
 *   - "Let's Go!" dismiss CTA
 *
 * Renders nothing when `newTier` is null.
 *
 * cm-r02ce / Phase 5
 */

import React, { useEffect, useMemo, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const TIER_EMOJI: Record<string, string> = {
  'Trail Blazer': '🥾',
  'Mountain Guide': '⛰️',
  'Summit Master': '🏔️',
  'Blue Ridge Legend': '👑',
};

const CONFETTI_COLORS = [
  '#FFD700', // gold
  '#FF6B6B', // coral
  '#5B8DB8', // mountain blue
  '#F5ECD7', // sand
  '#C0C0C0', // silver
  '#A0D9B4', // mint
];

const CONFETTI_COUNT = 30;

interface ConfettiParticle {
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  drift: number;
}

function buildParticles(): ConfettiParticle[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    x: (i / CONFETTI_COUNT) * SCREEN_W + Math.random() * (SCREEN_W / CONFETTI_COUNT),
    size: 6 + Math.round(Math.random() * 6),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    duration: 2200 + Math.round(Math.random() * 1000),
    delay: Math.round(Math.random() * 600),
    drift: (Math.random() - 0.5) * 60,
  }));
}

interface ConfettiPieceProps {
  particle: ConfettiParticle;
  run: boolean;
}

const ConfettiPiece = memo(function ConfettiPiece({ particle, run }: ConfettiPieceProps) {
  const y = useSharedValue(-20);
  const x = useSharedValue(particle.x);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!run) {
      cancelAnimation(y);
      cancelAnimation(x);
      cancelAnimation(opacity);
      cancelAnimation(rotate);
      y.value = -20;
      x.value = particle.x;
      opacity.value = 1;
      rotate.value = 0;
      return;
    }

    y.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(SCREEN_H + 20, { duration: particle.duration, easing: Easing.linear }),
        -1,
      ),
    );
    x.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(particle.x + particle.drift, { duration: particle.duration / 2 }),
          withTiming(particle.x - particle.drift, { duration: particle.duration / 2 }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      particle.delay + particle.duration * 0.7,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: particle.duration * 0.3 }),
        ),
        -1,
      ),
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: particle.duration, easing: Easing.linear }),
      -1,
    );
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
    width: particle.size,
    height: particle.size,
    backgroundColor: particle.color,
    borderRadius: particle.size * 0.2,
    position: 'absolute',
    top: 0,
    left: 0,
  }));

  return <Animated.View style={style} />;
});

interface Props {
  newTier: LoyaltyTierConfig | null;
  onDismiss: () => void;
}

export const TierCelebrationModal = memo(function TierCelebrationModal({
  newTier,
  onDismiss,
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const reduceMotion = useReducedMotion();
  const particles = useMemo(buildParticles, []);

  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!newTier) {
      badgeScale.value = 0;
      badgeOpacity.value = 0;
      contentOpacity.value = 0;
      return;
    }
    if (reduceMotion) {
      // Skip animations — show content immediately
      badgeScale.value = 1;
      badgeOpacity.value = 1;
      contentOpacity.value = 1;
      return;
    }
    badgeScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
    badgeOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
    contentOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, [newTier, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!newTier) return null;

  const tierLabel = newTier.name;
  const tierEmoji = TIER_EMOJI[newTier.name] ?? '🌟';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View
        testID="tier-celebration-modal"
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}
        accessibilityViewIsModal
        accessibilityLabel={tierLabel + ' tier celebration'}
      >
        {/* Confetti layer — hidden when reduce motion is enabled */}
        {!reduceMotion && (
          <View
            testID="tier-celebration-confetti"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          >
            {particles.map((p, i) => (
              <ConfettiPiece key={i} particle={p} run />
            ))}
          </View>
        )}

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.espresso,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            },
          ]}
        >
          {/* Animated badge */}
          <Animated.View
            testID="tier-celebration-badge"
            style={[styles.badgeWrap, badgeStyle]}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.badgeEmoji}>{tierEmoji}</Text>
          </Animated.View>

          {/* Copy */}
          <Animated.View style={contentStyle}>
            <Text
              testID="tier-celebration-heading"
              style={[styles.heading, { color: colors.sandBase }]}
              accessibilityRole="header"
            >
              You reached {tierLabel}!
            </Text>
            <Text style={[styles.subheading, { color: colors.mountainBlueLight }]}>
              {newTier === LOYALTY_TIERS[LOYALTY_TIERS.length - 1]
                ? "You're at the top. Enjoy the perks. \uD83D\uDE4C"
                : `Keep earning to unlock even more rewards.`}
            </Text>
          </Animated.View>

          {/* Dismiss */}
          <TouchableOpacity
            testID="tier-celebration-dismiss"
            style={[
              styles.dismissBtn,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.pill,
                marginTop: spacing.xl,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
              },
            ]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${tierLabel} tier celebration`}
          >
            <Text style={styles.dismissText}>Let's Go!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  badgeWrap: {
    marginBottom: 16,
  },
  badgeEmoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dismissBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  dismissText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
