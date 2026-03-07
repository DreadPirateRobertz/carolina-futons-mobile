/**
 * @module ARControls
 *
 * Bottom control panel for the AR (Augmented Reality) camera view.
 * Provides model selection, fabric swatch picker, dimension toggle,
 * share/save/wishlist actions, and add-to-cart CTA (Call To Action).
 * Designed as a dark overlay anchored to the bottom of the AR screen.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { type FutonModel, type Fabric } from '@/data/futons';
import { formatPrice } from '@/utils';

interface Props {
  models: FutonModel[];
  selectedModel: FutonModel;
  selectedFabric: Fabric;
  showDimensions: boolean;
  onSelectModel: (model: FutonModel) => void;
  onSelectFabric: (fabric: Fabric) => void;
  onToggleDimensions: () => void;
  onClose: () => void;
  onShare?: () => void;
  onSaveToGallery?: () => void;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  onBrowseProducts?: () => void;
  isInWishlist?: boolean;
  wishlistSaved?: boolean;
  isCapturing?: boolean;
  isMeasuring?: boolean;
  onToggleMeasure?: () => void;
  onResetMeasure?: () => void;
  testID?: string;
}

/**
 * Bottom control panel for the AR camera view.
 * Futon model selector, fabric swatches, dimension toggle, share/save actions, and close button.
 */
export function ARControls({
  models,
  selectedModel,
  selectedFabric,
  showDimensions,
  onSelectModel,
  onSelectFabric,
  onToggleDimensions,
  onClose,
  onAddToCart,
  onShare,
  onSaveToGallery,
  onToggleWishlist,
  onBrowseProducts,
  isInWishlist,
  wishlistSaved,
  isCapturing,
  isMeasuring,
  onToggleMeasure,
  onResetMeasure,
  testID,
}: Props) {
  const totalPrice = selectedModel.basePrice + selectedFabric.price;

  return (
    <View style={styles.container} testID={testID}>
      {/* Price + Dimension toggle row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.priceLabel}>{formatPrice(totalPrice)}</Text>
          <Text style={styles.priceSubtitle}>
            {selectedModel.name} · {selectedFabric.name}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.dimToggle, showDimensions && styles.dimToggleActive]}
          onPress={onToggleDimensions}
          testID="ar-dimension-toggle"
          accessibilityLabel="Toggle dimensions"
          accessibilityRole="button"
        >
          <Text style={[styles.dimToggleIcon, showDimensions && styles.dimToggleIconActive]}>
            ⤡
          </Text>
          <Text style={[styles.dimToggleText, showDimensions && styles.dimToggleTextActive]}>
            Dims
          </Text>
        </TouchableOpacity>
      </View>

      {/* Model selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modelScroll}
        contentContainerStyle={styles.modelScrollContent}
      >
        {models.map((model) => {
          const isSelected = model.id === selectedModel.id;
          return (
            <TouchableOpacity
              key={model.id}
              style={[styles.modelChip, isSelected && styles.modelChipSelected]}
              onPress={() => onSelectModel(model)}
              testID={`ar-model-${model.id}`}
              accessibilityLabel={model.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.modelChipText, isSelected && styles.modelChipTextSelected]}>
                {model.name}
              </Text>
              <Text
                style={[styles.modelChipSubtext, isSelected && styles.modelChipSubtextSelected]}
              >
                {model.tagline}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fabric swatches */}
      <View style={styles.fabricSection}>
        <Text style={styles.fabricLabel}>Fabric</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fabricScrollContent}
        >
          {selectedModel.fabrics.map((fabric) => {
            const isSelected = fabric.id === selectedFabric.id;
            return (
              <TouchableOpacity
                key={fabric.id}
                style={[styles.fabricSwatch, isSelected && styles.fabricSwatchSelected]}
                onPress={() => onSelectFabric(fabric)}
                testID={`ar-fabric-${fabric.id}`}
                accessibilityLabel={`${fabric.name}${fabric.price > 0 ? ` (+${formatPrice(fabric.price)})` : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.fabricColor, { backgroundColor: fabric.color }]} />
                {isSelected && (
                  <Text style={styles.fabricName} numberOfLines={1}>
                    {fabric.name}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Share / Save toolbar */}
      <View style={styles.shareToolbar}>
        {onToggleMeasure && (
          <TouchableOpacity
            style={[styles.shareButton, isMeasuring && styles.measureButtonActive]}
            onPress={onToggleMeasure}
            testID="ar-measure-toggle"
            accessibilityLabel={isMeasuring ? 'Exit measurement mode' : 'Measure room'}
            accessibilityRole="button"
          >
            <Text style={[styles.shareButtonIcon, isMeasuring && styles.measureIconActive]}>📏</Text>
            <Text style={[styles.shareButtonText, isMeasuring && styles.measureTextActive]}>
              {isMeasuring ? 'Exit' : 'Measure'}
            </Text>
          </TouchableOpacity>
        )}
        {isMeasuring && onResetMeasure && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onResetMeasure}
            testID="ar-measure-reset"
            accessibilityLabel="Reset measurement"
            accessibilityRole="button"
          >
            <Text style={styles.shareButtonIcon}>↺</Text>
            <Text style={styles.shareButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
        {onBrowseProducts && (
          <TouchableOpacity
            style={styles.browseButton}
            onPress={onBrowseProducts}
            testID="ar-browse-products"
            accessibilityLabel="Browse all products"
            accessibilityRole="button"
          >
            <Text style={styles.browseButtonIcon}>▦</Text>
            <Text style={styles.browseButtonText}>Browse</Text>
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onShare}
            disabled={isCapturing}
            testID="ar-share"
            accessibilityLabel="Share AR screenshot"
            accessibilityRole="button"
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.shareButtonIcon}>↗</Text>
                <Text style={styles.shareButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {onSaveToGallery && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onSaveToGallery}
            disabled={isCapturing}
            testID="ar-save-gallery"
            accessibilityLabel="Save to photo library"
            accessibilityRole="button"
          >
            <Text style={styles.shareButtonIcon}>⬇</Text>
            <Text style={styles.shareButtonText}>Save</Text>
          </TouchableOpacity>
        )}
        {onToggleWishlist && (
          <TouchableOpacity
            style={[styles.shareButton, isInWishlist && styles.wishlistButtonActive]}
            onPress={onToggleWishlist}
            testID="ar-wishlist"
            accessibilityLabel={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            accessibilityRole="button"
          >
            <Text style={[styles.shareButtonIcon, isInWishlist && styles.wishlistIconActive]}>
              {isInWishlist ? '♥' : '♡'}
            </Text>
            <Text style={[styles.shareButtonText, isInWishlist && styles.wishlistTextActive]}>
              {wishlistSaved ? 'Saved!' : isInWishlist ? 'Wishlisted' : 'Wishlist'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={onAddToCart}
          testID="ar-add-to-cart"
          accessibilityLabel="Add to cart"
          accessibilityRole="button"
        >
          <Text style={styles.addToCartText}>Add to Cart — {formatPrice(totalPrice)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          testID="ar-close"
          accessibilityLabel="Close AR view"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 34, // Safe area bottom
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  priceSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  dimToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 4,
  },
  dimToggleActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  dimToggleIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dimToggleIconActive: {
    color: '#000000',
  },
  dimToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dimToggleTextActive: {
    color: '#000000',
  },
  modelScroll: {
    marginBottom: 12,
  },
  modelScrollContent: {
    gap: 8,
  },
  modelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 130,
  },
  modelChipSelected: {
    backgroundColor: 'rgba(91,143,168,0.3)',
    borderColor: '#5B8FA8',
  },
  modelChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  modelChipTextSelected: {
    color: '#FFFFFF',
  },
  modelChipSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  modelChipSubtextSelected: {
    color: 'rgba(255,255,255,0.6)',
  },
  fabricSection: {
    marginBottom: 12,
  },
  fabricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fabricScrollContent: {
    gap: 10,
    alignItems: 'center',
  },
  fabricSwatch: {
    alignItems: 'center',
    gap: 4,
  },
  fabricSwatchSelected: {
    // Selected state handled by showing name
  },
  fabricColor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabricName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    maxWidth: 50,
    textAlign: 'center',
  },
  shareToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#5B8FA8',
    backgroundColor: 'rgba(91,143,168,0.2)',
  },
  browseButtonIcon: {
    color: '#5B8FA8',
    fontSize: 14,
    fontWeight: '600',
  },
  browseButtonText: {
    color: '#5B8FA8',
    fontSize: 13,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareButtonIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  measureButtonActive: {
    backgroundColor: 'rgba(91, 143, 168, 0.3)',
    borderColor: '#5B8FA8',
  },
  measureIconActive: {
    color: '#5B8FA8',
  },
  measureTextActive: {
    color: '#5B8FA8',
  },
  wishlistButtonActive: {
    backgroundColor: 'rgba(232, 132, 92, 0.2)',
    borderColor: '#E8845C',
  },
  wishlistIconActive: {
    color: '#E8845C',
  },
  wishlistTextActive: {
    color: '#E8845C',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#E8845C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '300',
  },
});
