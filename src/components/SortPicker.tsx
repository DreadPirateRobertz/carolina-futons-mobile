/**
 * @module SortPicker
 *
 * Sort control for the product listing screen. Shows the current sort label
 * as a chip button; tapping it opens a modal with radio-style sort options
 * (e.g. "Featured", "Price: Low to High"). Also displays the total result count.
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@/theme';
import { SORT_OPTIONS, type SortOption } from '@/data/products';

interface Props {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  resultCount: number;
  leftContent?: React.ReactNode;
  testID?: string;
}

/**
 * Inline sort control with a modal picker for sort options.
 *
 * @param props.value - Currently active sort option
 * @param props.onChange - Callback when user selects a new sort
 * @param props.resultCount - Number of products matching current filters
 * @param props.testID - Test identifier
 * @returns A row with result count and sort button, plus the sort modal
 */
export function SortPicker({ value, onChange, resultCount, leftContent, testID }: Props) {
  const { colors, borderRadius, shadows } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? 'Featured';

  return (
    <View style={styles.container} testID={testID ?? 'sort-picker'}>
      <View style={styles.leftSection}>
        {leftContent}
        <Text style={[styles.resultCount, { color: colors.espressoLight }]}>
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.sortButton,
          { backgroundColor: colors.sandLight, borderRadius: borderRadius.md },
        ]}
        onPress={() => setShowModal(true)}
        testID="sort-button"
        accessibilityLabel={`Sort by ${currentLabel}`}
        accessibilityRole="button"
      >
        <Text style={[styles.sortLabel, { color: colors.espresso }]}>{currentLabel}</Text>
        <Text style={[styles.sortChevron, { color: colors.muted }]}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
          testID="sort-modal-overlay"
          accessibilityLabel="Close sort options"
        >
          <View
            style={[
              styles.modalContent,
              shadows.modal,
              { backgroundColor: colors.white, borderRadius: borderRadius.lg },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.espresso }]}>Sort By</Text>
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, isSelected && { backgroundColor: colors.sandLight }]}
                  onPress={() => {
                    onChange(option.value);
                    setShowModal(false);
                  }}
                  testID={`sort-option-${option.value}`}
                  accessibilityLabel={`Sort by ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: isSelected ? colors.mountainBlue : colors.espresso },
                      isSelected && styles.modalOptionSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Text style={{ color: colors.mountainBlue }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortChevron: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  modalOptionText: {
    fontSize: 15,
  },
  modalOptionSelected: {
    fontWeight: '600',
  },
});
