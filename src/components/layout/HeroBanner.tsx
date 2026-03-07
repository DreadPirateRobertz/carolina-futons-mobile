/**
 * @module HeroBanner
 *
 * Full-bleed hero image with dark overlay and bottom-aligned text.
 * Used at the top of Home, Collection, and promotional screens to
 * create strong visual anchors. Supports progressive loading via
 * blurhash placeholders.
 */
import React from 'react';
import { StyleSheet, View, Text, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';

interface Props {
  /** Image URI for the hero background */
  imageUri?: string;
  /** Blurhash for progressive loading */
  blurhash?: string;
  /** Fallback background color when no image */
  backgroundColor?: string;
  title?: string;
  subtitle?: string;
  /** Content to render over the hero image */
  children?: React.ReactNode;
  /** Height in pixels. Default 280. */
  height?: number;
  /** Overlay darkness 0-1. Default 0.4. */
  overlayOpacity?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Full-bleed hero banner with optional image background and text overlay.
 */
export function HeroBanner({
  imageUri,
  blurhash,
  backgroundColor,
  title,
  subtitle,
  children,
  height = 280,
  overlayOpacity = 0.4,
  style,
  testID,
}: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.root,
        { height, backgroundColor: backgroundColor ?? colors.sandDark },
        style,
      ]}
      testID={testID}
    >
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          placeholder={blurhash ? { blurhash } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]} />
      <View style={[styles.content, { padding: spacing.pagePadding }]}>
        {title && (
          <Text
            style={[
              styles.title,
              {
                ...typography.heroTitle,
                fontFamily: typography.headingFamily,
                color: colors.offWhite,
              },
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                ...typography.bodyLarge,
                fontFamily: typography.bodyFamily,
                color: colors.offWhite,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: {
    zIndex: 1,
  },
  title: {
    marginBottom: 8,
    color: '#FAF7F2',
  },
  subtitle: {
    opacity: 0.9,
    color: '#FAF7F2',
  },
});
