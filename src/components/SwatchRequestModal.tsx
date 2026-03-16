/**
 * @module SwatchRequestModal
 *
 * Modal for requesting physical fabric swatches. Users select up to 3 fabrics,
 * enter a shipping address, and submit. Includes accessibility labels, haptic
 * feedback, and rate-limiting (one request per product per 24h).
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useSwatchRequest, type SwatchAddress } from '@/hooks/useSwatchRequest';
import type { Fabric } from '@/data/futons';

interface Props {
  visible: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  fabrics: Fabric[];
}

const EMPTY_ADDRESS: SwatchAddress = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
};

export function SwatchRequestModal({ visible, onClose, productId, productName, fabrics }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const swatch = useSwatchRequest(productId);
  const [address, setAddress] = useState<SwatchAddress>(EMPTY_ADDRESS);

  if (!visible) return null;

  const updateField = (field: keyof SwatchAddress) => (value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const success = await swatch.submitRequest(address);
    if (success) {
      setAddress(EMPTY_ADDRESS);
    }
  };

  const handleClose = () => {
    swatch.reset();
    setAddress(EMPTY_ADDRESS);
    onClose();
  };

  const handleDone = () => {
    swatch.reset();
    setAddress(EMPTY_ADDRESS);
    onClose();
  };

  const handleSwatchPress = (fabric: Fabric) => {
    swatch.toggleFabric(fabric);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.offWhite }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.sandDark }]}>
          <Text
            style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}
            accessibilityRole="header"
          >
            Request Free Swatches
          </Text>
          <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
            {productName} — Choose up to 3 free fabric samples
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            testID="swatch-close-button"
            accessibilityLabel="Close swatch request"
            accessibilityRole="button"
          >
            <Text style={[styles.closeText, { color: colors.espresso }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
        >
          {swatch.status === 'submitted' ? (
            /* Success State */
            <View style={styles.successContainer}>
              <Text style={[styles.successIcon]} accessibilityLabel="Success checkmark">
                ✓
              </Text>
              <Text
                style={[
                  styles.successTitle,
                  { color: colors.espresso, fontFamily: typography.headingFamily },
                ]}
              >
                Your swatches are on the way!
              </Text>
              <Text style={[styles.successBody, { color: colors.espressoLight }]}>
                We'll ship {swatch.selectedFabrics.length} fabric{' '}
                {swatch.selectedFabrics.length === 1 ? 'sample' : 'samples'} to your address. Allow
                3-5 business days for delivery.
              </Text>
              <TouchableOpacity
                onPress={handleDone}
                style={[
                  styles.doneButton,
                  { backgroundColor: colors.espresso, borderRadius: borderRadius.md },
                ]}
                testID="swatch-done-button"
                accessibilityLabel="Done, close swatch request"
                accessibilityRole="button"
              >
                <Text style={[styles.doneButtonText, { color: colors.offWhite }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Rate limit notice */}
              {swatch.hasRecentRequest && (
                <View
                  style={[
                    styles.notice,
                    { backgroundColor: colors.sandBase, borderRadius: borderRadius.sm },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: colors.espresso }]}>
                    You've already requested swatches for this product recently. You can submit a
                    new request after 24 hours.
                  </Text>
                </View>
              )}

              {/* Fabric Selection */}
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                ]}
                accessibilityRole="header"
              >
                Select Fabrics
              </Text>

              <Text
                testID="swatch-selection-counter"
                style={[styles.counter, { color: colors.espressoLight }]}
                accessibilityLabel={`${swatch.selectedFabrics.length} of 3 swatches selected`}
                accessibilityRole="text"
              >
                {swatch.selectedFabrics.length} of 3 selected
              </Text>

              {swatch.validationErrors.includes('fabrics') && (
                <Text style={[styles.errorText, { color: colors.error || '#D32F2F' }]}>
                  Please select at least one fabric swatch
                </Text>
              )}

              <View style={styles.fabricGrid}>
                {fabrics.map((fabric) => {
                  const isSelected = swatch.selectedFabrics.some((f) => f.id === fabric.id);
                  return (
                    <TouchableOpacity
                      key={fabric.id}
                      onPress={() => handleSwatchPress(fabric)}
                      style={[
                        styles.swatchOption,
                        { borderRadius: borderRadius.md, borderColor: colors.sandDark },
                        isSelected && { borderColor: colors.espresso, borderWidth: 2 },
                      ]}
                      testID={`swatch-option-${fabric.id}`}
                      accessibilityLabel={`${fabric.name} fabric swatch${isSelected ? ', selected' : ''}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.swatchColor,
                          { backgroundColor: fabric.color, borderRadius: borderRadius.sm },
                        ]}
                      />
                      <Text
                        style={[styles.swatchName, { color: colors.espresso }]}
                        numberOfLines={1}
                      >
                        {fabric.name}
                      </Text>
                      {isSelected && <Text style={styles.swatchCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Shipping Address */}
              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: colors.espresso,
                    fontFamily: typography.bodyFamilyBold,
                    marginTop: spacing.lg,
                  },
                ]}
                accessibilityRole="header"
              >
                Shipping Address
              </Text>

              <View style={styles.formGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: swatch.validationErrors.includes('name')
                        ? '#D32F2F'
                        : colors.sandDark,
                      borderRadius: borderRadius.sm,
                      color: colors.espresso,
                    },
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.espressoLight}
                  value={address.fullName}
                  onChangeText={updateField('fullName')}
                  testID="swatch-address-name"
                  accessibilityLabel="Full name for swatch delivery"
                  autoComplete="name"
                />
                {swatch.validationErrors.includes('name') && (
                  <Text
                    testID="swatch-error-name"
                    style={[styles.fieldError, { color: '#D32F2F' }]}
                  >
                    Name is required
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: swatch.validationErrors.includes('line1')
                        ? '#D32F2F'
                        : colors.sandDark,
                      borderRadius: borderRadius.sm,
                      color: colors.espresso,
                    },
                  ]}
                  placeholder="Address Line 1"
                  placeholderTextColor={colors.espressoLight}
                  value={address.line1}
                  onChangeText={updateField('line1')}
                  testID="swatch-address-line1"
                  accessibilityLabel="Street address for swatch delivery"
                  autoComplete="street-address"
                />
                {swatch.validationErrors.includes('line1') && (
                  <Text
                    testID="swatch-error-line1"
                    style={[styles.fieldError, { color: '#D32F2F' }]}
                  >
                    Address is required
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.sandDark,
                      borderRadius: borderRadius.sm,
                      color: colors.espresso,
                    },
                  ]}
                  placeholder="Address Line 2 (optional)"
                  placeholderTextColor={colors.espressoLight}
                  value={address.line2}
                  onChangeText={updateField('line2')}
                  testID="swatch-address-line2"
                  accessibilityLabel="Address line 2, optional"
                  autoComplete="street-address"
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: swatch.validationErrors.includes('city')
                          ? '#D32F2F'
                          : colors.sandDark,
                        borderRadius: borderRadius.sm,
                        color: colors.espresso,
                      },
                    ]}
                    placeholder="City"
                    placeholderTextColor={colors.espressoLight}
                    value={address.city}
                    onChangeText={updateField('city')}
                    testID="swatch-address-city"
                    accessibilityLabel="City for swatch delivery"
                  />
                  {swatch.validationErrors.includes('city') && (
                    <Text
                      testID="swatch-error-city"
                      style={[styles.fieldError, { color: '#D32F2F' }]}
                    >
                      City is required
                    </Text>
                  )}
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: swatch.validationErrors.includes('state')
                          ? '#D32F2F'
                          : colors.sandDark,
                        borderRadius: borderRadius.sm,
                        color: colors.espresso,
                      },
                    ]}
                    placeholder="State"
                    placeholderTextColor={colors.espressoLight}
                    value={address.state}
                    onChangeText={updateField('state')}
                    testID="swatch-address-state"
                    accessibilityLabel="State for swatch delivery"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                  {swatch.validationErrors.includes('state') && (
                    <Text
                      testID="swatch-error-state"
                      style={[styles.fieldError, { color: '#D32F2F' }]}
                    >
                      Required
                    </Text>
                  )}
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: swatch.validationErrors.includes('zip')
                          ? '#D32F2F'
                          : colors.sandDark,
                        borderRadius: borderRadius.sm,
                        color: colors.espresso,
                      },
                    ]}
                    placeholder="ZIP"
                    placeholderTextColor={colors.espressoLight}
                    value={address.zip}
                    onChangeText={updateField('zip')}
                    testID="swatch-address-zip"
                    accessibilityLabel="ZIP code for swatch delivery"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {swatch.validationErrors.includes('zip') && (
                    <Text
                      testID="swatch-error-zip"
                      style={[styles.fieldError, { color: '#D32F2F' }]}
                    >
                      Invalid ZIP
                    </Text>
                  )}
                </View>
              </View>

              {/* Error state */}
              {swatch.status === 'error' && (
                <Text style={[styles.errorText, { color: '#D32F2F' }]}>
                  Something went wrong. Please try again.
                </Text>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={swatch.isSubmitting || swatch.hasRecentRequest}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      swatch.isSubmitting || swatch.hasRecentRequest
                        ? colors.sandDark
                        : colors.espresso,
                    borderRadius: borderRadius.md,
                  },
                ]}
                testID="swatch-submit-button"
                accessibilityLabel={
                  swatch.hasRecentRequest
                    ? 'Swatch request already submitted'
                    : `Send ${swatch.selectedFabrics.length} free swatch${swatch.selectedFabrics.length !== 1 ? 'es' : ''} to your address`
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: swatch.isSubmitting || swatch.hasRecentRequest }}
              >
                <Text style={[styles.submitButtonText, { color: colors.offWhite }]}>
                  {swatch.isSubmitting ? 'Sending...' : 'Request Swatches'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  counter: {
    fontSize: 13,
    marginBottom: 12,
  },
  fabricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchOption: {
    width: '30%',
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  swatchColor: {
    width: 40,
    height: 40,
    marginBottom: 6,
  },
  swatchName: {
    fontSize: 11,
    textAlign: 'center',
  },
  swatchCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#4A7C59',
  },
  formGroup: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  rowFields: {
    flexDirection: 'row',
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  notice: {
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
  },
  submitButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 48,
    color: '#4A7C59',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
