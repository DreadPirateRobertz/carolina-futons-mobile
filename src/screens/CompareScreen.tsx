import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { Product } from '@/data/products';
import { getStockStatus, LOW_STOCK_THRESHOLD } from '@/data/products';
import { formatPrice } from '@/utils';

export const MAX_COMPARE_ITEMS = 3;

interface Props {
  products: Product[];
  onRemove?: (productId: string) => void;
  onProductPress?: (product: Product) => void;
  onBack?: () => void;
  testID?: string;
}

interface CompareRow {
  label: string;
  values: (product: Product) => React.ReactNode;
}

function formatDimensions(d: Product['dimensions']): string {
  return `${d.width}" × ${d.depth}" × ${d.height}"`;
}

function StockLabel({ product }: { product: Product }) {
  const { colors } = useTheme();
  const status = getStockStatus(product);

  if (status === 'out_of_stock') {
    return <Text style={{ color: colors.error }}>Out of Stock</Text>;
  }
  if (status === 'low_stock') {
    return (
      <Text style={{ color: colors.warning }}>
        Low Stock ({product.stockCount})
      </Text>
    );
  }
  return <Text style={{ color: colors.success }}>In Stock</Text>;
}

export function CompareScreen({
  products: rawProducts,
  onRemove,
  onProductPress,
  onBack,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();

  // Cap products to max
  const products = rawProducts.slice(0, MAX_COMPARE_ITEMS);

  if (products.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
        accessibilityLabel="Compare products"
        testID={testID}
      >
        <Header onBack={onBack} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Add products to compare
          </Text>
        </View>
      </View>
    );
  }

  // Find lowest price for highlight
  const lowestPrice = Math.min(...products.map((p) => p.price));

  const rows: CompareRow[] = [
    {
      label: 'Price',
      values: (product) => {
        const isBest = product.price === lowestPrice && products.length > 1;
        return (
          <View testID={isBest ? `price-best-${product.id}` : undefined}>
            <Text
              style={[
                styles.cellValue,
                { color: isBest ? colors.success : colors.text, fontWeight: isBest ? '700' : '400' },
              ]}
            >
              ${product.price}
            </Text>
            {product.originalPrice != null && (
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                ${product.originalPrice}
              </Text>
            )}
          </View>
        );
      },
    },
    {
      label: 'Rating',
      values: (product) => (
        <Text style={[styles.cellValue, { color: colors.text }]}>
          {product.rating}
        </Text>
      ),
    },
    {
      label: 'Size',
      values: (product) => (
        <Text style={[styles.cellValue, { color: colors.text }]}>
          {product.size ? product.size.charAt(0).toUpperCase() + product.size.slice(1) : '-'}
        </Text>
      ),
    },
    {
      label: 'Dimensions',
      values: (product) => (
        <Text style={[styles.cellValue, { color: colors.text }]}>
          {formatDimensions(product.dimensions)}
        </Text>
      ),
    },
    {
      label: 'Fabrics',
      values: (product) => (
        <Text style={[styles.cellValue, { color: colors.text }]}>
          {product.fabricOptions.length} options
        </Text>
      ),
    },
    {
      label: 'Availability',
      values: (product) => <StockLabel product={product} />,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      accessibilityLabel="Compare products"
      testID={testID}
    >
      <Header onBack={onBack} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product headers */}
        <View style={styles.headerRow}>
          <View style={styles.labelCell} />
          {products.map((product) => (
            <View
              key={product.id}
              style={[styles.productCell, { borderColor: colors.border }]}
            >
              {product.images.length > 0 && (
                <Image
                  source={{ uri: product.images[0].uri }}
                  style={[styles.productImage, { borderRadius: borderRadius.md }]}
                  accessibilityLabel={product.images[0].alt}
                />
              )}
              <TouchableOpacity
                onPress={() => onProductPress?.(product)}
                accessibilityRole="button"
              >
                <Text
                  style={[styles.productName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {product.name}
                </Text>
              </TouchableOpacity>
              {onRemove && (
                <TouchableOpacity
                  testID={`remove-product-${product.id}`}
                  onPress={() => onRemove(product.id)}
                  style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
                  accessibilityLabel={`Remove ${product.name} from comparison`}
                >
                  <Text style={[styles.removeText, { color: colors.error }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Comparison rows */}
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[
              styles.comparisonRow,
              {
                backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.labelCell}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
            </View>
            {products.map((product) => (
              <View key={product.id} style={styles.productCell}>
                {row.values(product)}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      {onBack && (
        <TouchableOpacity
          testID="back-button"
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { color: colors.text }]}>Compare</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelCell: {
    width: 80,
    justifyContent: 'center',
    paddingRight: 8,
  },
  productCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  productImage: {
    width: 80,
    height: 60,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  removeButton: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cellValue: {
    fontSize: 13,
    textAlign: 'center',
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
});
