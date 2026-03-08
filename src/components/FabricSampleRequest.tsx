/**
 * @module FabricSampleRequest
 *
 * Collapsible form for requesting free fabric swatches from ProductDetailScreen.
 * User selects up to 5 fabrics, enters name and shipping address, and submits.
 * Uses AnimatedPressable with haptic feedback for the CTA button.
 */
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { trackEvent } from '@/services/analytics';
import type { Fabric } from '@/data/futons';

const MAX_SWATCHES = 5;

interface Props {
  fabrics: Fabric[];
  productName: string;
  testID?: string;
}

export function FabricSampleRequest({ fabrics, productName, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (fabrics.length === 0) return null;

  const toggleFabric = useCallback(
    (fabricId: string) => {
      setSelectedFabricIds((prev) => {
        const next = new Set(prev);
        if (next.has(fabricId)) {
          next.delete(fabricId);
        } else if (next.size < MAX_SWATCHES) {
          next.add(fabricId);
        }
        return next;
      });
    },
    [],
  );

  const handleExpand = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !address.trim() || selectedFabricIds.size === 0) {
      Alert.alert(
        'Missing Information',
        'Please enter your name, shipping address, and select at least one fabric swatch.',
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      trackEvent('fabric_sample_request' as any, {
        product_name: productName,
        fabric_count: selectedFabricIds.size,
        fabrics: Array.from(selectedFabricIds).join(','),
      });
    } catch (err) {
      console.warn('FabricSampleRequest: analytics tracking failed', err);
    }

    setSubmitted(true);
  }, [name, address, selectedFabricIds, productName]);

  if (submitted) {
    return (
      <View
        style={[styles.confirmationContainer, { backgroundColor: `${colors.mountainBlue}15` }]}
        testID={testID ?? 'swatch-confirmation'}
      >
        <Text style={[styles.confirmationTitle, { color: colors.mountainBlue }]}>
          Swatches are on the way!
        </Text>
        <Text style={[styles.confirmationText, { color: colors.espressoLight }]}>
          {selectedFabricIds.size} fabric {selectedFabricIds.size === 1 ? 'swatch' : 'swatches'} will
          arrive in 5-7 business days.
        </Text>
      </View>
    );
  }

  if (!expanded) {
    return (
      <TouchableOpacity
        style={[styles.ctaButton, { borderColor: colors.mountainBlue, borderRadius: borderRadius.button }]}
        onPress={handleExpand}
        testID={testID ?? 'request-swatches-btn'}
        accessibilityLabel="Request free fabric swatches"
        accessibilityRole="button"
      >
        <Text style={[styles.ctaText, { color: colors.mountainBlue }]}>
          Request Free Swatches
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.formContainer, { borderColor: colors.sandDark, borderRadius: borderRadius.card }]}
      testID="swatch-form"
    >
      <Text style={[styles.formTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}>
        Select up to {MAX_SWATCHES} swatches
      </Text>

      <View style={styles.chipGrid}>
        {fabrics.map((fabric) => {
          const selected = selectedFabricIds.has(fabric.id);
          return (
            <TouchableOpacity
              key={fabric.id}
              style={[
                styles.chip,
                {
                  borderColor: selected ? colors.mountainBlue : colors.sandDark,
                  backgroundColor: selected ? `${colors.mountainBlue}15` : colors.white,
                },
              ]}
              onPress={() => toggleFabric(fabric.id)}
              testID={`swatch-chip-${fabric.id}`}
              accessibilityLabel={`${fabric.name}${selected ? ', selected' : ''}`}
              accessibilityRole="checkbox"
              accessibilityState={{ selected }}
            >
              <View style={[styles.chipSwatch, { backgroundColor: fabric.color }]} />
              <Text
                style={[
                  styles.chipLabel,
                  { color: selected ? colors.mountainBlue : colors.espresso },
                ]}
                numberOfLines={1}
              >
                {fabric.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text
        style={[styles.selectedCount, { color: colors.espressoLight }]}
        testID="swatch-count"
      >
        {selectedFabricIds.size}/{MAX_SWATCHES} selected
      </Text>

      <TextInput
        style={[styles.input, { borderColor: colors.sandDark, color: colors.espresso }]}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
        testID="swatch-name-input"
        accessibilityLabel="Your name"
        autoCapitalize="words"
      />

      <TextInput
        style={[styles.input, styles.addressInput, { borderColor: colors.sandDark, color: colors.espresso }]}
        placeholder="Shipping address"
        placeholderTextColor={colors.muted}
        value={address}
        onChangeText={setAddress}
        testID="swatch-address-input"
        accessibilityLabel="Shipping address"
        multiline
        numberOfLines={2}
      />

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button }]}
        onPress={handleSubmit}
        testID="swatch-submit-btn"
        accessibilityLabel="Submit swatch request"
        accessibilityRole="button"
      >
        <Text style={styles.submitText}>Send My Free Swatches</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
  },
  formContainer: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  chipSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmationContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  confirmationText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
