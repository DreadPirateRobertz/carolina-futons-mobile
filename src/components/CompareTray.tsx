/**
 * @module CompareTray
 *
 * Persistent floating tray rendered at the bottom of ShopScreen.
 * Displays mini cards for each product in the compare list with a remove
 * button per card, a clear-all control, and a CTA to open CompareScreen.
 *
 * Hidden when the compare list is empty.
 * Uses existing CompareContext — no additional state management required.
 *
 * Each mini card supports left-swipe-to-remove gesture in addition to the
 * explicit remove button.
 */
import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { useCompareContext } from '@/contexts/CompareContext';
import type { Product } from '@/data/products';
import { formatPrice } from '@/utils';
import { wixImageUrl } from '@/utils/wixImageUrl';

interface Props {
  /** Called when the "Compare" CTA button is pressed. */
  onNavigateToCompare?: () => void;
  testID?: string;
}

// ── Swipe threshold ────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = -60;

// ── Mini card ─────────────────────────────────────────────────────────────────

function CompareMiniCard({
  product,
  onRemove,
}: {
  product: Product;
  onRemove: (id: string) => void;
}) {
  const { colors, borderRadius, typography } = useTheme();

  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx),
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx <= SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -200,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onRemove(product.id);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleRemove = useCallback(() => {
    onRemove(product.id);
  }, [product.id, onRemove]);

  return (
    <Animated.View
      style={[{ transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
      testID={`compare-tray-swipeable-${product.id}`}
      accessibilityHint="Swipe left to remove from compare"
    >
      <View
        style={[
          styles.miniCard,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
        testID={`compare-tray-card-${product.id}`}
      >
        <Image
          source={{
            uri:
              wixImageUrl(product.images[0]?.uri, {
                width: MINI_CARD_WIDTH * 2,
                height: MINI_IMAGE_HEIGHT * 2,
              }) ?? product.images[0]?.uri,
          }}
          style={styles.miniImage}
          contentFit="cover"
          testID={`compare-tray-image-${product.id}`}
          accessibilityLabel={product.images[0]?.alt ?? product.name}
          cachePolicy="memory-disk"
        />
        <Text
          style={[styles.miniName, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Text style={[styles.miniPrice, { color: colors.espressoLight }]}>
          {formatPrice(product.price)}
        </Text>
        <TouchableOpacity
          style={[styles.removeBtn, { backgroundColor: colors.espressoLight + '22' }]}
          onPress={handleRemove}
          testID={`compare-tray-remove-${product.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${product.name} from compare`}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.removeBtnText, { color: colors.espressoLight }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Tray ──────────────────────────────────────────────────────────────────────

/** Floating compare tray — hidden when compare list is empty. */
export function CompareTray({ onNavigateToCompare, testID = 'compare-tray' }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { compareList, count, removeFromCompare, clearCompare } = useCompareContext();

  if (count === 0) return null;

  return (
    <View
      style={[
        styles.tray,
        {
          backgroundColor: colors.sandBase,
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
        },
      ]}
      testID={testID}
    >
      {/* Header row */}
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          Comparing {count}
        </Text>
        <TouchableOpacity
          onPress={clearCompare}
          testID="compare-tray-clear"
          accessibilityRole="button"
          accessibilityLabel="Clear compare list"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.clearText,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            Clear all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mini cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.cardsContainer, { paddingHorizontal: spacing.md }]}
      >
        {compareList.map((product: Product) => (
          <CompareMiniCard key={product.id} product={product} onRemove={removeFromCompare} />
        ))}
      </ScrollView>

      {/* CTA */}
      <TouchableOpacity
        style={[
          styles.cta,
          {
            backgroundColor: colors.mountainBlue,
            marginHorizontal: spacing.md,
            borderRadius: borderRadius.card,
          },
        ]}
        onPress={onNavigateToCompare}
        testID="compare-tray-cta"
        accessibilityRole="button"
        accessibilityLabel={`Compare ${count} products`}
      >
        <Text style={[styles.ctaText, { fontFamily: typography.bodyFamilyBold }]}>
          Compare {count} {count === 1 ? 'product' : 'products'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const MINI_CARD_WIDTH = 140;
const MINI_IMAGE_HEIGHT = 140;

const styles = StyleSheet.create({
  tray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 13,
  },
  cardsContainer: {
    gap: 8,
    paddingBottom: 10,
  },
  miniCard: {
    width: MINI_CARD_WIDTH,
    padding: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  miniImage: {
    width: '100%',
    height: MINI_IMAGE_HEIGHT,
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#F2E8D5',
  },
  miniName: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
  miniPrice: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  cta: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
