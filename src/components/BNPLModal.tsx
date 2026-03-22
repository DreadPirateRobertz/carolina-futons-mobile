/**
 * @module BNPLModal
 *
 * Bottom sheet modal for Buy Now Pay Later (BNPL) options.
 * Shows Klarna and Affirm installment breakdowns with a tab toggle.
 * Tapping "Continue" opens the provider's native app (if installed)
 * or falls back to their mobile web URL.
 *
 * Bead: cm-qmr
 */
import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import {
  getBNPLInstallments,
  isBNPLEligible,
  BNPL_PROVIDERS,
  openBNPLDeeplink,
  type BNPLProviderKey,
} from '@/services/bnplService';
import { formatPrice } from '@/utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  price: number;
  initialProvider?: BNPLProviderKey;
  testID?: string;
}

const PROVIDERS: BNPLProviderKey[] = ['klarna', 'affirm'];

export function BNPLModal({ visible, onClose, price, initialProvider = 'klarna', testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const [provider, setProvider] = useState<BNPLProviderKey>(initialProvider);
  const [deepLinkError, setDeepLinkError] = useState(false);

  const config = BNPL_PROVIDERS[provider];
  const eligible = isBNPLEligible(price, provider);
  const installments = eligible ? getBNPLInstallments(price, provider) : [];

  const handleProviderSwitch = useCallback((next: BNPLProviderKey) => {
    Haptics.selectionAsync();
    setProvider(next);
    setDeepLinkError(false);
  }, []);

  const handleContinue = useCallback(async () => {
    setDeepLinkError(false);
    try {
      await openBNPLDeeplink(provider);
    } catch {
      setDeepLinkError(true);
    }
  }, [provider]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID ?? 'bnpl-modal'}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        testID="bnpl-modal-overlay"
        accessibilityLabel="Close payment options"
      >
        <View
          style={[
            styles.sheet,
            shadows.modal,
            {
              backgroundColor: colors.white,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: `${colors.espressoLight}40` }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
            <Text style={[styles.title, { color: colors.espresso }]}>Pay over time</Text>
            <TouchableOpacity
              onPress={onClose}
              testID="bnpl-modal-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={[styles.closeBtn, { color: colors.espressoLight }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ paddingHorizontal: spacing.lg }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {/* Provider tab toggle */}
            <View
              style={[
                styles.tabRow,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.pill,
                  marginBottom: spacing.md,
                },
              ]}
            >
              {PROVIDERS.map((p) => {
                const active = provider === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.tab,
                      active && [
                        styles.tabActive,
                        { backgroundColor: colors.white, borderRadius: borderRadius.pill },
                      ],
                    ]}
                    onPress={() => handleProviderSwitch(p)}
                    testID={`bnpl-tab-${p}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: active ? colors.espresso : colors.espressoLight },
                      ]}
                    >
                      {BNPL_PROVIDERS[p].displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tagline */}
            <Text
              style={[styles.tagline, { color: colors.espressoLight, marginBottom: spacing.sm }]}
            >
              {config.tagline}
            </Text>

            {/* Installment rows */}
            {eligible ? (
              installments.map((inst) => (
                <View
                  key={inst.number}
                  style={[styles.installmentRow, { borderBottomColor: colors.sandLight }]}
                >
                  <Text style={[styles.installmentLabel, { color: colors.espressoLight }]}>
                    {inst.label}
                  </Text>
                  <Text style={[styles.installmentAmount, { color: colors.espresso }]}>
                    {formatPrice(inst.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.ineligibleText, { color: colors.espressoLight }]}>
                Not available for this price
              </Text>
            )}

            {/* Deep link error */}
            {deepLinkError && (
              <Text
                style={[styles.errorText, { color: colors.sunsetCoral }]}
                testID="bnpl-deeplink-error"
              >
                Unable to open {config.displayName} app. Please visit their website directly.
              </Text>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                {
                  backgroundColor: eligible ? colors.espresso : `${colors.espressoLight}60`,
                  borderRadius: borderRadius.button,
                  marginTop: spacing.md,
                },
              ]}
              onPress={handleContinue}
              disabled={!eligible}
              testID="bnpl-continue-btn"
              accessibilityRole="button"
              accessibilityLabel={`Continue with ${config.displayName}`}
              accessibilityState={{ disabled: !eligible }}
            >
              <Text style={styles.ctaText}>Continue with {config.displayName}</Text>
            </TouchableOpacity>

            <Text
              style={[styles.disclaimer, { color: colors.espressoLight, marginTop: spacing.sm }]}
            >
              Subject to credit approval. Rates vary by provider.
            </Text>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    paddingBottom: 32,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '400',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 13,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  installmentLabel: {
    fontSize: 14,
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  ineligibleText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  ctaButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
