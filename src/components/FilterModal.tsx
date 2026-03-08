import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { PriceRangeSlider } from '@/components/PriceRangeSlider';
import type { ProductFilters, ProductSize } from '@/hooks/useProducts';

const SIZE_OPTIONS: { value: ProductSize; label: string }[] = [
  { value: 'twin', label: 'Twin' },
  { value: 'full', label: 'Full' },
  { value: 'queen', label: 'Queen' },
];

interface Props {
  visible: boolean;
  filters: ProductFilters;
  availableFabrics: string[];
  priceExtent: [number, number];
  onApply: (filters: ProductFilters) => void;
  onClose: () => void;
  testID?: string;
}

export function FilterModal({
  visible,
  filters,
  availableFabrics,
  priceExtent,
  onApply,
  onClose,
  testID,
}: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const [draft, setDraft] = useState<ProductFilters>(filters);

  // Sync draft when modal opens
  const onShow = useCallback(() => {
    setDraft(filters);
  }, [filters]);

  const toggleSize = useCallback((size: ProductSize) => {
    Haptics.selectionAsync();
    setDraft((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  }, []);

  const toggleFabric = useCallback((fabric: string) => {
    Haptics.selectionAsync();
    setDraft((prev) => ({
      ...prev,
      fabrics: prev.fabrics.includes(fabric)
        ? prev.fabrics.filter((f) => f !== fabric)
        : [...prev.fabrics, fabric],
    }));
  }, []);

  const setPriceRange = useCallback((low: number, high: number) => {
    setDraft((prev) => ({ ...prev, priceRange: [low, high] }));
  }, []);

  const clearAll = useCallback(() => {
    setDraft({ sizes: [], fabrics: [], priceRange: null });
  }, []);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  const [priceMin, priceMax] = priceExtent;
  const draftPriceLow = draft.priceRange?.[0] ?? priceMin;
  const draftPriceHigh = draft.priceRange?.[1] ?? priceMax;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={onShow}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        testID={testID ? `${testID}-overlay` : 'filter-modal-overlay'}
        accessibilityLabel="Close filters"
      >
        <View
          style={[
            styles.content,
            shadows.modal,
            { backgroundColor: colors.white, borderRadius: borderRadius.lg },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            testID={testID ?? 'filter-modal'}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.espresso }]}>Filter Products</Text>
              <TouchableOpacity
                onPress={clearAll}
                testID="filter-clear-all"
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
              >
                <Text style={[styles.clearText, { color: colors.mountainBlue }]}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Size Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Size</Text>
              <View style={styles.chipRow}>
                {SIZE_OPTIONS.map((opt) => {
                  const selected = draft.sizes.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.espresso : colors.sandLight,
                          borderRadius: borderRadius.pill,
                        },
                      ]}
                      onPress={() => toggleSize(opt.value)}
                      testID={`filter-size-${opt.value}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Size ${opt.label}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.white : colors.espresso },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fabric Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Fabric</Text>
              <View style={styles.chipRow}>
                {availableFabrics.map((fabric) => {
                  const selected = draft.fabrics.includes(fabric);
                  return (
                    <TouchableOpacity
                      key={fabric}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.espresso : colors.sandLight,
                          borderRadius: borderRadius.pill,
                        },
                      ]}
                      onPress={() => toggleFabric(fabric)}
                      testID={`filter-fabric-${fabric.replace(/\s+/g, '-').toLowerCase()}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Fabric ${fabric}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.white : colors.espresso },
                        ]}
                      >
                        {fabric}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Range Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Price Range</Text>
              <PriceRangeSlider
                min={priceMin}
                max={priceMax}
                low={draftPriceLow}
                high={draftPriceHigh}
                onChangeRange={setPriceRange}
              />
            </View>
          </ScrollView>

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
            ]}
            onPress={handleApply}
            testID="filter-apply"
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
          >
            <Text style={[styles.applyText, { color: colors.white }]}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
