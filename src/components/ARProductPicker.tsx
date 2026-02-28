import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { PRODUCTS, type Product, type ProductCategory } from '@/data/products';
import { hasARModel } from '@/data/models3d';
import { formatPrice } from '@/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 12;
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const TILE_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

/** Categories eligible for AR display */
const AR_CATEGORY_FILTERS: { id: ProductCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'futons', label: 'Futons' },
  { id: 'murphy-beds', label: 'Murphy Beds' },
  { id: 'frames', label: 'Frames' },
];

interface Props {
  selectedProductId?: string;
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Product picker overlay for the AR camera session.
 * Shows a thumbnail grid of AR-eligible products filtered by category.
 */
export function ARProductPicker({ selectedProductId, onSelectProduct, onClose, testID }: Props) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');

  const arProducts = useMemo(
    () => PRODUCTS.filter((p) => p.inStock && hasARModel(p.id)),
    [],
  );

  const filteredProducts = useMemo(
    () =>
      activeCategory === 'all'
        ? arProducts
        : arProducts.filter((p) => p.category === activeCategory),
    [arProducts, activeCategory],
  );

  const handleSelectCategory = useCallback((catId: ProductCategory | 'all') => {
    setActiveCategory(catId);
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const isSelected = item.id === selectedProductId;
      return (
        <TouchableOpacity
          style={[styles.tile, isSelected && styles.tileSelected]}
          onPress={() => onSelectProduct(item)}
          testID={`ar-picker-${item.id}`}
          accessibilityLabel={`${item.name}, ${formatPrice(item.price)}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Image source={{ uri: item.images[0]?.uri }} style={styles.tileImage} />
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Text style={styles.tileName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.tilePrice}>
            {formatPrice(item.price)}
            {item.originalPrice && (
              <Text style={styles.tilePriceOriginal}> {formatPrice(item.originalPrice)}</Text>
            )}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedProductId, onSelectProduct],
  );

  return (
    <View style={styles.overlay} testID={testID ?? 'ar-product-picker'}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose a Product</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          testID="ar-picker-close"
          accessibilityLabel="Close product picker"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <View style={styles.categoryRow}>
        {AR_CATEGORY_FILTERS.map((cat) => {
          const isActive = cat.id === activeCategory;
          const count =
            cat.id === 'all'
              ? arProducts.length
              : arProducts.filter((p) => p.category === cat.id).length;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => handleSelectCategory(cat.id)}
              testID={`ar-picker-cat-${cat.id}`}
              accessibilityLabel={`${cat.label}, ${count} products`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
              <Text
                style={[styles.categoryChipCount, isActive && styles.categoryChipCountActive]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Product grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '300',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
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
  categoryChipActive: {
    backgroundColor: '#5B8FA8',
    borderColor: '#5B8FA8',
  },
  categoryChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  categoryChipCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  tileSelected: {
    borderColor: '#5B8FA8',
    borderWidth: 2,
    backgroundColor: 'rgba(91,143,168,0.15)',
  },
  tileImage: {
    width: '100%',
    height: TILE_WIDTH * 0.75,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#E8845C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  tileName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingTop: 6,
    lineHeight: 14,
  },
  tilePrice: {
    color: '#E8845C',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingTop: 3,
    paddingBottom: 8,
  },
  tilePriceOriginal: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
