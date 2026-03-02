import React, { useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius, shadows, typography } from '@/theme/tokens';
import { useSpringPress } from '@/hooks/useSpringPress';
import { PRESS_SCALE } from '@/theme/animations';

interface Category {
  id: string;
  title: string;
  image: string;
}

type Variant = 'featured' | 'compact';

interface Props {
  category: Category;
  onPress: (category: Category) => void;
  variant?: Variant;
  testID?: string;
}

export const CategoryCard = memo(function CategoryCard({
  category,
  onPress,
  variant = 'featured',
  testID,
}: Props) {
  const [imageError, setImageError] = useState(false);

  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({
    pressedScale: PRESS_SCALE.card,
    haptic: 'selection',
  });

  const handlePress = useCallback(() => {
    onPress(category);
  }, [category, onPress]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const isCompact = variant === 'compact';

  return (
    <Animated.View style={[animatedStyle, styles.wrapper]}>
      <Pressable
        style={[styles.card, isCompact ? styles.compact : styles.featured, shadows.card]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        testID={testID}
        accessibilityLabel={`Browse ${category.title}`}
        accessibilityRole="button"
      >
        {imageError ? (
          <View
            style={[styles.image, styles.imagePlaceholder]}
            testID={testID ? `${testID}-image-placeholder` : undefined}
          >
            <Text style={styles.placeholderText}>🛋️</Text>
          </View>
        ) : (
          <Image
            source={{ uri: category.image }}
            style={styles.image}
            testID={testID ? `${testID}-image` : undefined}
            onError={handleImageError}
            contentFit="cover"
            transition={200}
          />
        )}
        <View style={styles.overlay} testID={testID ? `${testID}-overlay` : undefined}>
          <Text style={[styles.title, isCompact && styles.titleCompact]}>{category.title}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  card: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  featured: {
    height: 200,
  },
  compact: {
    height: 120,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    backgroundColor: colors.sandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  title: {
    ...typography.h2,
    color: '#FFFFFF',
  },
  titleCompact: {
    ...typography.h4,
  },
});
