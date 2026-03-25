import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { Product } from '@/data/products';
import { getStockStatus } from '@/data/products';
import { FABRICS } from '@/data/futons';
import { formatPrice } from '@/utils';
import { MAX_COMPARE_ITEMS } from '@/hooks/useCompare';

interface Props {
  products: Product[];
  onRemove?: (productId: string) => void;
  onProductPress?: (product: Product) => void;
  onBack?: () => void;
  testID?: string;
}

interface CompareRow {
  label: string;
  key: string;
  /** Returns a comparable string for diff highlighting */
  comparable: (product: Product) => string;
  values: (product: Product, isDiff: boolean) => React.ReactNode;
}

interface Section {
  title: string;
  key: string;
  defaultExpanded: boolean;
  rows: CompareRow[];
}

// --- Fabric color lookup ---

const FABRIC_COLOR_MAP = new Map(FABRICS.map((f) => [f.name, f.color]));
const FALLBACK_SWATCH_COLOR = '#B0B0B0';

function getFabricColor(fabricName: string): string {
  return FABRIC_COLOR_MAP.get(fabricName) ?? FALLBACK_SWATCH_COLOR;
}

// --- Helpers ---

function formatDimensions(d: Product['dimensions'] | undefined): string {
  if (!d) return '-';
  return `${d.width}" × ${d.depth}" × ${d.height}"`;
}

function buildShareMessage(products: Product[]): string {
  const lines = products.map(
    (p) => `${p.name} — ${formatPrice(p.price)} (${p.rating} stars)`,
  );
  return `Compare Futons:\n${lines.join('\n')}\n\nvia Carolina Futons`;
}

// --- Sub-components ---

function StockLabel({ product }: { product: Product }) {
  const { colors } = useTheme();
  const status = getStockStatus(product);

  if (status === 'out_of_stock') {
    return <Text style={{ color: colors.error }}>Out of Stock</Text>;
  }
  if (status === 'low_stock') {
    return <Text style={{ color: colors.sunsetCoral }}>Low Stock ({product.stockCount})</Text>;
  }
  return <Text style={{ color: colors.success }}>In Stock</Text>;
}

function FabricSwatches({ product }: { product: Product }) {
  const { colors } = useTheme();
  return (
    <View testID={`fabric-swatches-${product.id}`} style={swatchStyles.container}>
      <View style={swatchStyles.row}>
        {product.fabricOptions.map((fabricName) => (
          <View
            key={fabricName}
            testID={`swatch-${product.id}-${fabricName}`}
            accessibilityLabel={fabricName}
            style={[
              swatchStyles.dot,
              { backgroundColor: getFabricColor(fabricName), borderColor: colors.sandDark },
            ]}
          />
        ))}
      </View>
      <Text style={[swatchStyles.count, { color: colors.espressoLight }]}>
        {product.fabricOptions.length}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  sectionKey,
  expanded,
  onToggle,
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      testID={`section-${sectionKey}-header`}
      accessibilityLabel={`Toggle ${title} section`}
      accessibilityRole="button"
      onPress={onToggle}
      style={[sectionHeaderStyles.container, { borderBottomColor: colors.sandDark }]}
    >
      <Text style={[sectionHeaderStyles.text, { color: colors.espresso }]}>{title}</Text>
      <Text style={[sectionHeaderStyles.chevron, { color: colors.espressoLight }]}>
        {expanded ? '▾' : '▸'}
      </Text>
    </TouchableOpacity>
  );
}

function Header({
  onBack,
  onShare,
}: {
  onBack?: () => void;
  onShare?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[headerStyles.container, { borderBottomColor: colors.sandDark }]}>
      {onBack && (
        <TouchableOpacity
          testID="back-button"
          onPress={onBack}
          style={headerStyles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={[headerStyles.backText, { color: colors.mountainBlue }]}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={[headerStyles.title, { color: colors.espresso }]}>Compare</Text>
      <View style={headerStyles.spacer} />
      {onShare && (
        <TouchableOpacity
          testID="compare-share-button"
          onPress={onShare}
          style={headerStyles.shareButton}
          accessibilityLabel="Share comparison"
        >
          <Text style={[headerStyles.shareText, { color: colors.mountainBlue }]}>Share</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Main component ---

export function CompareScreen({
  products: rawProducts,
  onRemove,
  onProductPress,
  onBack,
  testID,
}: Props) {
  const { colors, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();

  const products = rawProducts.slice(0, MAX_COMPARE_ITEMS);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'basic-info': true,
    details: false,
  });

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: buildShareMessage(products) });
    } catch {
      // Share cancelled or failed — no action needed
    }
  }, [products]);

  if (products.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
        accessibilityLabel="Compare products"
        testID={testID}
      >
        <Header onBack={onBack} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.espressoLight }]}>
            Add products to compare
          </Text>
        </View>
      </View>
    );
  }

  // Find lowest price for highlight — only highlight if exactly one product has it
  const lowestPrice = Math.min(...products.map((p) => p.price));
  const lowestPriceCount = products.filter((p) => p.price === lowestPrice).length;
  const highlightLowest = products.length > 1 && lowestPriceCount === 1;

  // Check if a row has differing values across products (for diff highlighting)
  function hasDiff(row: CompareRow): boolean {
    if (products.length <= 1) return false;
    const first = row.comparable(products[0]);
    return products.some((p) => row.comparable(p) !== first);
  }

  const sections: Section[] = [
    {
      title: 'Basic Info',
      key: 'basic-info',
      defaultExpanded: true,
      rows: [
        {
          label: 'Price',
          key: 'price',
          comparable: (p) => String(p.price),
          values: (product, isDiff) => {
            const isBest = highlightLowest && product.price === lowestPrice;
            return (
              <View
                testID={
                  isBest
                    ? `price-best-${product.id}`
                    : isDiff
                      ? `diff-price-${product.id}`
                      : undefined
                }
              >
                <Text
                  style={[
                    styles.cellValue,
                    {
                      color: isBest ? colors.success : colors.espresso,
                      fontWeight: isBest ? '700' : '400',
                    },
                  ]}
                >
                  {formatPrice(product.price)}
                </Text>
                {product.originalPrice != null && (
                  <Text style={[styles.originalPrice, { color: colors.espressoLight }]}>
                    {formatPrice(product.originalPrice)}
                  </Text>
                )}
              </View>
            );
          },
        },
        {
          label: 'Rating',
          key: 'rating',
          comparable: (p) => String(p.rating),
          values: (product, isDiff) => (
            <Text
              testID={isDiff ? `diff-rating-${product.id}` : undefined}
              style={[styles.cellValue, { color: colors.espresso }]}
            >
              {product.rating}
            </Text>
          ),
        },
        {
          label: 'Availability',
          key: 'availability',
          comparable: (p) => getStockStatus(p),
          values: (product, isDiff) => (
            <View testID={isDiff ? `diff-availability-${product.id}` : undefined}>
              <StockLabel product={product} />
            </View>
          ),
        },
      ],
    },
    {
      title: 'Details',
      key: 'details',
      defaultExpanded: false,
      rows: [
        {
          label: 'Size',
          key: 'size',
          comparable: (p) => p.size ?? '-',
          values: (product, isDiff) => (
            <Text
              testID={isDiff ? `diff-size-${product.id}` : undefined}
              style={[styles.cellValue, { color: colors.espresso }]}
            >
              {product.size ? product.size.charAt(0).toUpperCase() + product.size.slice(1) : '-'}
            </Text>
          ),
        },
        {
          label: 'Dimensions',
          key: 'dimensions',
          comparable: (p) => formatDimensions(p.dimensions),
          values: (product, isDiff) => (
            <Text
              testID={isDiff ? `diff-dimensions-${product.id}` : undefined}
              style={[styles.cellValue, { color: colors.espresso }]}
            >
              {formatDimensions(product.dimensions)}
            </Text>
          ),
        },
        {
          label: 'Fabrics',
          key: 'fabrics',
          comparable: (p) => p.fabricOptions.sort().join(','),
          values: (product) => <FabricSwatches product={product} />,
        },
      ],
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      accessibilityLabel="Compare products"
      testID={testID}
    >
      <Header onBack={onBack} onShare={handleShare} />

      {/* Sticky product header — outside ScrollView so it never scrolls away */}
      <View
        testID="sticky-product-header"
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.sandBase, borderBottomColor: colors.sandDark },
        ]}
      >
        <View style={styles.labelCell} />
        {products.map((product) => (
          <View key={product.id} style={[styles.productCell, { borderColor: colors.sandDark }]}>
            {product.images.length > 0 && (
              <Image
                source={{ uri: product.images[0].uri }}
                style={[styles.productImage, { borderRadius: borderRadius.md }]}
                accessibilityLabel={product.images[0].alt}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            )}
            <TouchableOpacity onPress={() => onProductPress?.(product)} accessibilityRole="button">
              <Text style={[styles.productName, { color: colors.espresso }]} numberOfLines={2}>
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

      <ScrollView
        testID="comparison-scroll-view"
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const isExpanded = expandedSections[section.key] ?? section.defaultExpanded;
          return (
            <View key={section.key} testID={`section-${section.key}`}>
              <SectionHeader
                title={section.title}
                sectionKey={section.key}
                expanded={isExpanded}
                onToggle={() => toggleSection(section.key)}
              />
              {isExpanded &&
                section.rows.map((row, index) => {
                  const isDiff = hasDiff(row);
                  return (
                    <View
                      key={row.key}
                      style={[
                        styles.comparisonRow,
                        {
                          backgroundColor:
                            index % 2 === 0 ? colors.offWhite : colors.sandBase,
                          borderColor: colors.sandDark,
                        },
                        isDiff && { backgroundColor: colors.sandLight + '80' },
                      ]}
                    >
                      <View style={styles.labelCell}>
                        <Text style={[styles.rowLabel, { color: colors.espressoLight }]}>
                          {row.label}
                        </Text>
                      </View>
                      {products.map((product) => (
                        <View key={product.id} style={styles.productCell}>
                          {row.values(product, isDiff)}
                        </View>
                      ))}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// --- Styles ---

const headerStyles = StyleSheet.create({
  container: {
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
  spacer: {
    flex: 1,
  },
  shareButton: {
    padding: 4,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const sectionHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 14,
  },
});

const swatchStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  count: {
    fontSize: 11,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  stickyHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    zIndex: 1,
    elevation: 2,
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
