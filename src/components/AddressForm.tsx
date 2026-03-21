/**
 * @module AddressForm
 *
 * Reusable add/edit address form with inline validation.
 * Used by AccountScreen for saved address CRUD (cm-v54).
 *
 * Required fields: fullName, line1, city, state, zip (5-digit).
 * Optional: line2.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { BrandedSpinner } from '@/components/BrandedSpinner';

export interface AddressFormValues {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface Props {
  /** Called with trimmed values when form is valid and submitted. */
  onSubmit: (values: AddressFormValues) => Promise<void> | void;
  /** Called when user presses cancel. */
  onCancel: () => void;
  /** Pre-fill fields when editing an existing address. */
  initialValues?: Partial<AddressFormValues>;
  /** Shows loading indicator and disables submit when true. */
  saving?: boolean;
}

interface FieldErrors {
  fullName?: string;
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

const ZIP_RE = /^\d{5}$/;

function validate(values: AddressFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.fullName) errors.fullName = 'Full name is required';
  if (!values.line1) errors.line1 = 'Street address is required';
  if (!values.city) errors.city = 'City is required';
  if (!values.state) errors.state = 'State is required';
  if (!values.zip) {
    errors.zip = 'ZIP code is required';
  } else if (!ZIP_RE.test(values.zip)) {
    errors.zip = 'ZIP code must be 5 digits';
  }
  return errors;
}

/** Add or edit address form with validation and accessibility. */
export function AddressForm({ onSubmit, onCancel, initialValues, saving }: Props) {
  const { borderRadius } = useTheme();
  const [fullName, setFullName] = useState(initialValues?.fullName ?? '');
  const [line1, setLine1] = useState(initialValues?.line1 ?? '');
  const [line2, setLine2] = useState(initialValues?.line2 ?? '');
  const [city, setCity] = useState(initialValues?.city ?? '');
  const [state, setState] = useState(initialValues?.state ?? '');
  const [zip, setZip] = useState(initialValues?.zip ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    const values: AddressFormValues = {
      fullName: fullName.trim(),
      line1: line1.trim(),
      line2: line2.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };
    const fieldErrors = validate(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setSubmitted(true);
      return;
    }
    setErrors({});
    await onSubmit(values);
  }, [fullName, line1, line2, city, state, zip, onSubmit]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: darkPalette.surfaceElevated,
      color: darkPalette.textPrimary,
      borderRadius: borderRadius.md,
      borderColor: darkPalette.borderSubtle,
    },
  ];

  return (
    <View style={styles.container} testID="address-form">
      {/* Full Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          testID="address-full-name-input"
          value={fullName}
          onChangeText={setFullName}
          style={inputStyle}
          placeholder="Full name"
          placeholderTextColor={darkPalette.textMuted}
          autoCapitalize="words"
          autoComplete="name"
          accessibilityLabel="Full name"
        />
        {(submitted || errors.fullName) && errors.fullName ? (
          <Text testID="address-full-name-error" style={styles.error}>
            {errors.fullName}
          </Text>
        ) : null}
      </View>

      {/* Street Address */}
      <View style={styles.field}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          testID="address-line1-input"
          value={line1}
          onChangeText={setLine1}
          style={inputStyle}
          placeholder="Street address"
          placeholderTextColor={darkPalette.textMuted}
          autoCapitalize="words"
          autoComplete="street-address"
          accessibilityLabel="Street address"
        />
        {(submitted || errors.line1) && errors.line1 ? (
          <Text testID="address-line1-error" style={styles.error}>
            {errors.line1}
          </Text>
        ) : null}
      </View>

      {/* Apt / Suite */}
      <View style={styles.field}>
        <Text style={styles.label}>Apt / Suite</Text>
        <TextInput
          testID="address-line2-input"
          value={line2}
          onChangeText={setLine2}
          style={inputStyle}
          placeholder="Apt, suite, unit (optional)"
          placeholderTextColor={darkPalette.textMuted}
          autoCapitalize="words"
          accessibilityLabel="Apartment or suite number"
        />
      </View>

      {/* City / State row */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 2 }]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            testID="address-city-input"
            value={city}
            onChangeText={setCity}
            style={inputStyle}
            placeholder="City"
            placeholderTextColor={darkPalette.textMuted}
            autoCapitalize="words"
            autoComplete="postal-address-locality"
            accessibilityLabel="City"
          />
          {(submitted || errors.city) && errors.city ? (
            <Text testID="address-city-error" style={styles.error}>
              {errors.city}
            </Text>
          ) : null}
        </View>

        <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>State *</Text>
          <TextInput
            testID="address-state-input"
            value={state}
            onChangeText={setState}
            style={inputStyle}
            placeholder="NC"
            placeholderTextColor={darkPalette.textMuted}
            autoCapitalize="characters"
            maxLength={2}
            autoComplete="postal-address-region"
            accessibilityLabel="State abbreviation"
          />
          {(submitted || errors.state) && errors.state ? (
            <Text testID="address-state-error" style={styles.error}>
              {errors.state}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ZIP */}
      <View style={styles.field}>
        <Text style={styles.label}>ZIP Code *</Text>
        <TextInput
          testID="address-zip-input"
          value={zip}
          onChangeText={setZip}
          style={inputStyle}
          placeholder="12345"
          placeholderTextColor={darkPalette.textMuted}
          keyboardType="number-pad"
          maxLength={5}
          autoComplete="postal-code"
          accessibilityLabel="ZIP code"
        />
        {(submitted || errors.zip) && errors.zip ? (
          <Text testID="address-zip-error" style={styles.error}>
            {errors.zip}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="address-cancel-button"
          onPress={onCancel}
          style={[styles.cancelBtn, { borderRadius: borderRadius.button }]}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelText, { color: darkPalette.textMuted }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="address-save-button"
          onPress={handleSubmit}
          disabled={!!saving}
          style={[styles.saveBtn, { borderRadius: borderRadius.button }]}
          accessibilityRole="button"
          accessibilityLabel="Save address"
          accessibilityState={{ disabled: !!saving }}
        >
          {saving ? (
            <BrandedSpinner testID="address-save-loading" size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: darkPalette.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  error: {
    fontSize: 12,
    color: '#E05252',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkPalette.borderSubtle,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#5B7FA6',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
