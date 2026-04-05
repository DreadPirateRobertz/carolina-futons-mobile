/**
 * @module ReorderConfirmationSheet
 *
 * Bottom-sheet modal shown before a one-tap reorder — cm-bjq.
 *
 * Displays available items (to be added to cart) and unavailable items
 * (discontinued or out of stock) with appropriate warnings. The confirm
 * button is disabled when there is nothing available to add.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { ReorderPreview, ReorderLineItem } from '@/services/reorderService';
import type { OrderLineItem } from '@/data/orders';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ReorderConfirmationSheetProps {
  visible: boolean;
  orderNumber: string;
  preview: ReorderPreview;
  onConfirm: (items: ReorderLineItem[]) => void;
  onDismiss: () => void;
  testID?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReorderConfirmationSheet({
  visible,
  orderNumber,
  preview,
  onConfirm,
  onDismiss,
  testID = 'reorder-sheet',
}: ReorderConfirmationSheetProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  if (!visible) return null;

  const { available, unavailable } = preview;
  const hasAvailable = available.length > 0;
  const hasUnavailable = unavailable.length > 0;
  const isEmpty = !hasAvailable && !hasUnavailable;
  const allOOS = !hasAvailable && hasUnavailable;
  const confirmDisabled = !hasAvailable;

  const styles = makeStyles(colors, spacing, borderRadius);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    onConfirm(available);
  };

  const confirmLabel = hasAvailable
    ? `Add ${available.length} item${available.length === 1 ? '' : 's'} to cart`
    : 'Nothing available';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      {/* Overlay */}
      <TouchableOpacity
        testID="reorder-sheet-overlay"
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityLabel="Close reorder sheet"
      >
        {/* Sheet — stop propagation */}
        <TouchableOpacity
          testID={testID}
          style={styles.sheet}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityRole="none"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              testID="reorder-sheet-title"
              style={[styles.title, { fontFamily: typography.headingFamily }]}
            >
              Reorder {orderNumber}
            </Text>
            <TouchableOpacity
              testID="reorder-sheet-close"
              onPress={onDismiss}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={[styles.closeBtnText, { color: colors.espressoLight }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Empty order */}
            {isEmpty && (
              <View testID="reorder-empty-message" style={styles.stateMessage}>
                <Text style={[styles.stateTitle, { color: colors.espresso }]}>
                  Nothing to reorder
                </Text>
                <Text style={[styles.stateBody, { color: colors.espressoLight }]}>
                  This order has no items.
                </Text>
              </View>
            )}

            {/* All OOS message */}
            {allOOS && (
              <View testID="reorder-all-oos-message" style={styles.stateMessage}>
                <Text style={[styles.stateTitle, { color: colors.espresso }]}>
                  Nothing available
                </Text>
                <Text style={[styles.stateBody, { color: colors.espressoLight }]}>
                  All items from this order are currently unavailable.
                </Text>
              </View>
            )}

            {/* Available items */}
            {hasAvailable && (
              <>
                {available.map(({ lineItem, model, fabric }) => (
                  <View
                    key={lineItem.id}
                    testID={`reorder-item-${lineItem.id}`}
                    style={styles.itemRow}
                  >
                    <View style={[styles.itemDot, { backgroundColor: colors.sunsetCoral }]} />
                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                        ]}
                        numberOfLines={1}
                      >
                        {model.name}
                      </Text>
                      <Text style={[styles.itemDetail, { color: colors.espressoLight }]}>
                        {fabric.name} · Qty {lineItem.quantity}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* OOS section */}
            {hasUnavailable && (
              <View testID="reorder-oos-section" style={styles.oosSection}>
                <Text style={[styles.oosSectionLabel, { color: colors.espressoLight }]}>
                  Unavailable
                </Text>
                {unavailable.map((lineItem) => (
                  <View
                    key={lineItem.id}
                    testID={`reorder-oos-item-${lineItem.id}`}
                    style={styles.oosItemRow}
                  >
                    <Text style={[styles.oosItemName, { color: colors.espressoLight }]}>
                      {lineItem.modelName} — {lineItem.fabricName}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Confirm button */}
          <TouchableOpacity
            testID="reorder-confirm-btn"
            style={[
              styles.confirmBtn,
              { backgroundColor: colors.sunsetCoral },
              confirmDisabled && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={confirmDisabled}
            accessibilityLabel={confirmLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: confirmDisabled }}
          >
            <Text style={[styles.confirmBtnText, { fontFamily: typography.bodyFamilyBold }]}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(
  colors: Record<string, string>,
  spacing: Record<string, number>,
  borderRadius: Record<string, number>,
) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.espresso,
      flex: 1,
    },
    closeBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    closeBtnText: {
      fontSize: 18,
    },
    scrollArea: {
      marginBottom: spacing.md,
    },
    stateMessage: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    stateTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    stateBody: {
      fontSize: 14,
      textAlign: 'center',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    itemDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
    },
    itemDetail: {
      fontSize: 12,
      marginTop: 2,
    },
    oosSection: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sandBase,
    },
    oosSectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    oosItemRow: {
      paddingVertical: spacing.xs,
    },
    oosItemName: {
      fontSize: 13,
    },
    confirmBtn: {
      borderRadius: borderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmBtnDisabled: {
      opacity: 0.4,
    },
    confirmBtnText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
