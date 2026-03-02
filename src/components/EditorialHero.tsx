import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { GlassCard } from './GlassCard';
import { AnimatedPressable } from './AnimatedPressable';

interface Props {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  testID?: string;
}

export function EditorialHero({ title, subtitle, ctaLabel, onCtaPress, testID }: Props) {
  const { typography } = useTheme();

  return (
    <View testID={testID} style={styles.container}>
      <Text
        style={[
          styles.title,
          { fontFamily: typography.headingFamily, fontSize: typography.heroTitle.fontSize },
        ]}
      >
        {title}
      </Text>
      <Text style={[styles.subtitle, { fontFamily: typography.bodyFamily }]}>{subtitle}</Text>
      {ctaLabel && onCtaPress && (
        <AnimatedPressable
          testID="editorial-hero-cta"
          onPress={onCtaPress}
          haptic="medium"
          style={styles.ctaWrapper}
        >
          <GlassCard style={styles.ctaCard} intensity="heavy">
            <Text style={[styles.ctaText, { fontFamily: typography.bodyFamilySemiBold }]}>
              {ctaLabel}
            </Text>
          </GlassCard>
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: darkPalette.textPrimary,
    letterSpacing: -0.84,
    lineHeight: 46,
  },
  subtitle: {
    color: darkPalette.textMuted,
    fontSize: 17,
    lineHeight: 27,
  },
  ctaWrapper: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ctaCard: {
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  ctaText: {
    color: darkPalette.textPrimary,
    fontSize: 15,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
