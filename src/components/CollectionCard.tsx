/**
 * @module CollectionCard
 *
 * Card for editorial/curated product collections (e.g. "Mid-Century Modern",
 * "Cozy Studio Essentials"). Displays a hero image with mood tags, title,
 * subtitle, and item count. Used on the Collections screen and home page
 * to drive discovery of themed product groupings.
 */

import React, { useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import type { EditorialCollection } from '@/data/collections';
import { DEFAULT_COLLECTION_BLURHASH } from '@/data/collections';

type Variant = 'featured' | 'compact';

interface Props {
  collection: EditorialCollection;
  onPress: (collection: EditorialCollection) => void;
  variant?: Variant;
  testID?: string;
}

/** Tappable editorial collection card with hero image, mood tags, and item count. */
export const CollectionCard = memo(function CollectionCard({
  collection,
  onPress,
  variant = 'featured',
  testID,
}: Props) {
  const { colors, spacing, typography, shadows, borderRadius } = useTheme();
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    onPress(collection);
  }, [collection, onPress]);

  const isCompact = variant === 'compact';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderRadius: borderRadius.card },
        isCompact ? styles.compact : styles.featured,
        shadows.card,
      ]}
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={`${collection.title}: ${collection.subtitle}`}
      accessibilityRole="button"
    >
      {imageError ? (
        <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.sandDark }]}>
          <Text style={styles.placeholderEmoji}>🏡</Text>
        </View>
      ) : (
        <Image
          source={{ uri: collection.heroImage.uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          recyclingKey={collection.id}
          accessibilityLabel={collection.heroImage.alt}
          onError={() => setImageError(true)}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: collection.heroImage.blurhash ?? DEFAULT_COLLECTION_BLURHASH }}
        />
      )}
      <View style={[styles.overlay, { backgroundColor: colors.overlay, padding: spacing.md }]}>
        <View style={styles.moodRow}>
          {collection.mood.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={[
                styles.moodTag,
                {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: borderRadius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <Text style={styles.moodText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text
          style={[
            isCompact ? typography.h4 : typography.h2,
            { color: colors.white, fontFamily: typography.headingFamily },
          ]}
          numberOfLines={2}
        >
          {collection.title}
        </Text>
        {!isCompact && (
          <Text
            style={[
              typography.bodySmall,
              { color: 'rgba(255,255,255,0.85)', fontFamily: typography.bodyFamily, marginTop: 4 },
            ]}
            numberOfLines={2}
          >
            {collection.subtitle}
          </Text>
        )}
        <Text
          style={[
            typography.caption,
            { color: 'rgba(255,255,255,0.6)', fontFamily: typography.bodyFamily, marginTop: spacing.xs },
          ]}
        >
          {collection.productIds.length} items
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  featured: {
    height: 220,
  },
  compact: {
    height: 140,
    width: 260,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  moodTag: {},
  moodText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
