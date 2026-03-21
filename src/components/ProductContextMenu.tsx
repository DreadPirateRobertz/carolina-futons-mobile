/**
 * @module ProductContextMenu
 *
 * Action sheet shown on ProductCard long-press (cm-qzd).
 * Provides quick access to: Add to Cart, Add to Wishlist, Share.
 * Also accessible via a ⋮ trigger button on the card (a11y tap fallback).
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Modal } from 'react-native';
import { useTheme } from '@/theme';
import type { Product } from '@/data/products';

interface Props {
  visible: boolean;
  product: Product;
  onClose: () => void;
  onAddToCart?: () => void;
  onAddToWishlist?: () => void;
  onShare?: () => void;
}

/** Slide-up context menu modal for ProductCard actions. */
export function ProductContextMenu({
  visible,
  product,
  onClose,
  onAddToCart,
  onAddToWishlist,
  onShare,
}: Props) {
  const { colors, borderRadius, spacing } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View
        style={StyleSheet.absoluteFillObject}
        testID="product-context-menu"
        accessibilityViewIsModal={true}
      >
        {/* Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          testID="product-context-menu-backdrop"
          accessibilityLabel="Close menu"
        />

        {/* Action sheet panel */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.sandBase,
              borderTopLeftRadius: borderRadius.lg ?? 20,
              borderTopRightRadius: borderRadius.lg ?? 20,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
            },
          ]}
        >
          {/* Product name header */}
          <Text
            testID="context-menu-product-name"
            style={[styles.productName, { color: colors.espressoLight }]}
            numberOfLines={1}
          >
            {product.name}
          </Text>

          {onAddToCart && (
            <TouchableOpacity
              testID="context-add-to-cart"
              style={[styles.action, { borderBottomColor: colors.sandDark }]}
              onPress={() => {
                onAddToCart();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
            >
              <Text style={[styles.actionText, { color: colors.espresso }]}>Add to Cart</Text>
            </TouchableOpacity>
          )}

          {onAddToWishlist && (
            <TouchableOpacity
              testID="context-add-to-wishlist"
              style={[styles.action, { borderBottomColor: colors.sandDark }]}
              onPress={() => {
                onAddToWishlist();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to wishlist`}
            >
              <Text style={[styles.actionText, { color: colors.espresso }]}>Add to Wishlist</Text>
            </TouchableOpacity>
          )}

          {onShare && (
            <TouchableOpacity
              testID="context-share"
              style={[styles.action, { borderBottomColor: colors.sandDark }]}
              onPress={() => {
                onShare();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Share ${product.name}`}
            >
              <Text style={[styles.actionText, { color: colors.espresso }]}>Share</Text>
            </TouchableOpacity>
          )}

          {/* Cancel */}
          <TouchableOpacity
            testID="context-cancel"
            style={styles.cancelAction}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, { color: colors.espressoLight }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    paddingTop: 12,
  },
  productName: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 12,
    textAlign: 'center',
  },
  action: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelAction: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
  },
});
