/**
 * @module EditorialCard
 *
 * Lifestyle / editorial card for non-commerce content such as style
 * guides, collections, and feature stories. Intentionally distinct
 * from ProductCard — this component favors rich imagery and narrative
 * text over price and CTA (Call To Action) buttons.
 */
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';

interface Props {
  title: string;
  description?: string;
  imageUri?: string;
  blurhash?: string;
  /** Label shown above title (e.g. "Style Guide", "New Arrival") */
  label?: string;
  labelColor?: string;
  onPress?: () => void;
  /** Horizontal layout: image left, text right */
  horizontal?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Editorial/lifestyle card for story content, collections, and features.
 * Distinct from ProductCard — designed for editorial, not commerce.
 */
export function EditorialCard({
  title,
  description,
  imageUri,
  blurhash,
  label,
  labelColor,
  onPress,
  horizontal,
  style,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.8, accessibilityRole: 'button' as const } : {};

  const content = (
    <>
      {imageUri && (
        <View
          style={[
            horizontal ? styles.imageHorizontal : styles.imageVertical,
            { borderRadius: horizontal ? borderRadius.card : 0 },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            placeholder={blurhash ? { blurhash } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </View>
      )}
      <View style={[styles.textContent, { padding: spacing.md }]}>
        {label && (
          <Text
            style={[
              styles.label,
              {
                ...typography.caption,
                fontFamily: typography.bodyFamilySemiBold,
                color: labelColor ?? colors.mountainBlue,
              },
            ]}
          >
            {label}
          </Text>
        )}
        <Text
          style={[
            styles.title,
            {
              ...typography.h3,
              fontFamily: typography.headingFamily,
              color: colors.espresso,
            },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={[
              styles.description,
              {
                ...typography.body,
                fontFamily: typography.bodyFamily,
                color: colors.espressoLight,
              },
            ]}
            numberOfLines={3}
          >
            {description}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <Wrapper
      style={[
        styles.root,
        {
          backgroundColor: colors.white,
          borderRadius: borderRadius.card,
          ...shadows.card,
        },
        horizontal && styles.rootHorizontal,
        style,
      ]}
      testID={testID}
      {...wrapperProps}
    >
      {content}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  rootHorizontal: {
    flexDirection: 'row',
  },
  imageVertical: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  imageHorizontal: {
    width: 120,
    overflow: 'hidden',
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {},
  description: {
    marginTop: 4,
  },
});
