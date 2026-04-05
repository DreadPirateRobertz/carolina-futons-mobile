/**
 * @module WarrantyRegistrationScreen
 *
 * Warranty registration form — cm-wrt.
 *
 * Accepts order context (orderId, orderNumber, productName) from the entry point
 * in OrderDetailScreen. Collects product name, purchase date (YYYY-MM-DD), and
 * an optional receipt photo, then submits to the Wix WarrantyRegistrations collection.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useOptionalWixClient } from '@/services/wix';
import { registerWarranty } from '@/services/warrantyRegistration';
import { uploadReviewPhoto } from '@/services/uploadReviewPhoto';
import { captureException } from '@/services/crashReporting';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  orderId: string;
  orderNumber: string;
  /** Pre-filled product name from the order's first line item. */
  productName?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Accepts YYYY-MM-DD format, non-future dates only. */
function validatePurchaseDate(value: string): string | null {
  if (!value.trim()) return 'Purchase date is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter date as YYYY-MM-DD';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return 'Invalid date';
  if (parsed > new Date()) return 'Purchase date cannot be in the future';
  return null;
}

function validateProductName(value: string): string | null {
  if (!value.trim()) return 'Product name is required';
  return null;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function WarrantyRegistrationScreen({
  orderId,
  orderNumber,
  productName: productNameProp,
  onBack,
  onSuccess,
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const wixClient = useOptionalWixClient();

  // Form state
  const [productName, setProductName] = useState(productNameProp ?? '');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);

  // UI state
  const [productError, setProductError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── Receipt photo ────────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async () => {
    setPhotoError(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setPhotoUploading(true);
    try {
      const { mediaUrl } = await uploadReviewPhoto(localUri);
      setReceiptPhotoUrl(mediaUrl);
    } catch (err) {
      console.error(
        '[WarrantyRegistrationScreen] receipt photo upload failed:',
        err instanceof Error ? err : new Error(String(err)),
      );
      captureException(err instanceof Error ? err : new Error(String(err)));
      setPhotoError(true);
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const productErr = validateProductName(productName);
    const dateErr = validatePurchaseDate(purchaseDate);
    setProductError(productErr);
    setDateError(dateErr);
    if (productErr || dateErr) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await registerWarranty(wixClient, {
        orderId,
        orderNumber,
        productName: productName.trim(),
        purchaseDate: purchaseDate.trim(),
        ...(receiptPhotoUrl ? { receiptPhotoUrl } : {}),
      });

      if (result.success) {
        setSubmitted(true);
        onSuccess?.();
      } else {
        setSubmitError(result.error ?? 'Registration failed. Please try again.');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureException(error);
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    productName,
    purchaseDate,
    receiptPhotoUrl,
    wixClient,
    orderId,
    orderNumber,
    onSuccess,
  ]);

  // ── Success state ─────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.sandBase }]}
        testID="warranty-registration-screen"
      >
        <TouchableOpacity
          testID="warranty-back"
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backText, { color: colors.espresso }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.successContainer} testID="warranty-success">
          <Text style={[styles.successTitle, { color: colors.espresso }]}>
            Warranty Registered!
          </Text>
          <Text style={[styles.successBody, { color: colors.espressoLight }]}>
            Your warranty for order {orderNumber} has been registered successfully.
          </Text>
          <TouchableOpacity
            style={[
              styles.doneButton,
              { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
            ]}
            onPress={onBack}
            accessibilityLabel="Done"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.sandBase }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        testID="warranty-registration-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            testID="warranty-back"
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.backText, { color: colors.espresso }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.espresso }]}>Register Warranty</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.form, { paddingHorizontal: spacing.lg }]}>
          {/* Order number — read-only */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.espressoLight }]}>Order Number</Text>
            <Text
              testID="warranty-order-number"
              style={[styles.readOnlyValue, { color: colors.espresso }]}
            >
              {orderNumber}
            </Text>
          </View>

          {/* Product name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.espressoLight }]}>Product *</Text>
            <TextInput
              testID="warranty-product-input"
              style={[
                styles.input,
                {
                  color: colors.espresso,
                  borderColor: productError ? colors.error : colors.muted,
                  backgroundColor: colors.sandLight,
                },
              ]}
              value={productName}
              onChangeText={(text) => {
                setProductName(text);
                setProductError(null);
              }}
              placeholder="Product name"
              placeholderTextColor={colors.espressoLight}
              returnKeyType="next"
              accessibilityLabel="Product name"
            />
            {productError && (
              <Text
                testID="warranty-product-error"
                style={[styles.fieldError, { color: colors.error }]}
              >
                {productError}
              </Text>
            )}
          </View>

          {/* Purchase date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.espressoLight }]}>Purchase Date *</Text>
            <TextInput
              testID="warranty-date-input"
              style={[
                styles.input,
                {
                  color: colors.espresso,
                  borderColor: dateError ? colors.error : colors.muted,
                  backgroundColor: colors.sandLight,
                },
              ]}
              value={purchaseDate}
              onChangeText={(text) => {
                setPurchaseDate(text);
                setDateError(null);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.espressoLight}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              accessibilityLabel="Purchase date, format YYYY-MM-DD"
            />
            {dateError && (
              <Text
                testID="warranty-date-error"
                style={[styles.fieldError, { color: colors.error }]}
              >
                {dateError}
              </Text>
            )}
          </View>

          {/* Receipt photo */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.espressoLight }]}>
              Receipt Photo (optional)
            </Text>

            {receiptPhotoUrl && (
              <Image
                testID="warranty-receipt-preview"
                source={{ uri: receiptPhotoUrl }}
                style={styles.receiptPreview}
                resizeMode="cover"
                accessibilityLabel="Receipt photo preview"
              />
            )}

            {photoUploading && (
              <View style={styles.uploadingRow} testID="warranty-photo-uploading">
                <ActivityIndicator size="small" color={colors.sunsetCoral} />
                <Text style={[styles.uploadingText, { color: colors.espressoLight }]}>
                  Uploading photo…
                </Text>
              </View>
            )}

            {photoError && (
              <Text
                testID="warranty-photo-error"
                style={[styles.fieldError, { color: colors.error }]}
              >
                Photo upload failed. You can still register without a receipt.
              </Text>
            )}

            {!receiptPhotoUrl && !photoUploading && (
              <TouchableOpacity
                testID="warranty-add-photo"
                style={[styles.addPhotoButton, { borderColor: colors.muted }]}
                onPress={handleAddPhoto}
                accessibilityLabel="Add receipt photo"
                accessibilityRole="button"
              >
                <Text style={[styles.addPhotoText, { color: colors.sunsetCoral }]}>
                  + Add Receipt Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit error */}
          {submitError && (
            <View
              testID="warranty-submit-error"
              style={[styles.errorBanner, { backgroundColor: colors.sandLight }]}
            >
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{submitError}</Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            testID="warranty-submit"
            style={[
              styles.submitButton,
              {
                backgroundColor: submitting ? colors.muted : colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityLabel="Register warranty"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
          >
            {submitting ? (
              <View style={styles.submitLoading} testID="warranty-submitting">
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitText}>Registering…</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Register Warranty</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    lineHeight: 36,
  },
  form: {
    gap: 20,
    paddingTop: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fieldError: {
    fontSize: 13,
  },
  addPhotoButton: {
    height: 48,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '600',
  },
  receiptPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 14,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    fontSize: 14,
  },
  submitButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  doneButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
