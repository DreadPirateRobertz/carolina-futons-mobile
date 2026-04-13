import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { useOptionalWixClient } from '@/services/wix';
import { sanitizeInput } from '@/utils/sanitizeInput';

interface PromoCodeInputProps {
  cartTotal: number;
  onDiscount: (discount: number, type: 'percent' | 'fixed') => void;
}

type PromoState = 'collapsed' | 'idle' | 'loading' | 'success' | 'error';

// Promo codes are short alphanumeric strings; 30 chars is generous
const PROMO_MAX_LENGTH = 30;

export function PromoCodeInput({ cartTotal, onDiscount }: PromoCodeInputProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const client = useOptionalWixClient();
  const [state, setState] = useState<PromoState>('collapsed');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [appliedCode, setAppliedCode] = useState('');

  async function handleApply() {
    const sanitized = sanitizeInput(code, PROMO_MAX_LENGTH).toUpperCase();
    if (!sanitized) return;
    if (!client) {
      setState('error');
      setErrorMsg('Promo codes unavailable — please sign in to apply');
      return;
    }
    setState('loading');
    try {
      const result = (await client.callFunction('/_functions/validatePromoCode', 'POST', {
        code: sanitized,
        cartTotal,
      })) as { valid: boolean; discount: number; type: 'percent' | 'fixed'; error?: string };

      if (result.valid) {
        setState('success');
        setAppliedCode(sanitized);
        onDiscount(result.discount, result.type);
      } else {
        setState('error');
        setErrorMsg(result.error ?? 'Invalid promo code');
      }
    } catch {
      setState('error');
      setErrorMsg('Unable to verify code — try again');
    }
  }

  // Memoized so StyleSheet.create is not called on every render
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
        expandText: { color: colors.espresso, fontFamily: typography.bodyFamily, fontSize: 14 },
        inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
        input: {
          flex: 1,
          borderWidth: 1,
          borderColor: colors.sandDark,
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontFamily: typography.bodyFamily,
          marginRight: spacing.sm,
        },
        applyBtn: {
          backgroundColor: colors.sunsetCoral,
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        applyText: { color: colors.offWhite, fontFamily: typography.bodyFamily, fontWeight: '600' },
        error: {
          color: 'red',
          fontFamily: typography.bodyFamily,
          fontSize: 13,
          marginTop: spacing.xs,
        },
        success: {
          color: colors.success ?? '#4A7C59',
          fontFamily: typography.bodyFamily,
          fontSize: 13,
          marginTop: spacing.xs,
        },
      }),
    [colors, spacing, typography, borderRadius],
  );

  if (state === 'collapsed') {
    return (
      <TouchableOpacity style={s.row} onPress={() => setState('idle')} accessibilityRole="button">
        <Text style={s.expandText}>Add promo code ›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={s.inputRow}>
        <TextInput
          testID="promo-input"
          style={s.input}
          value={code}
          onChangeText={setCode}
          placeholder="Enter promo code"
          autoCapitalize="characters"
          maxLength={PROMO_MAX_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleApply}
          accessibilityLabel="Promo code input"
          accessibilityHint="Enter a promotional code, then tap apply"
        />
        <TouchableOpacity
          testID="promo-apply-btn"
          style={s.applyBtn}
          onPress={handleApply}
          disabled={state === 'loading'}
          accessibilityRole="button"
          accessibilityLabel="Apply promo code"
        >
          {state === 'loading' ? (
            <ActivityIndicator color={colors.offWhite} size="small" />
          ) : (
            <Text style={s.applyText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
      {state === 'error' && (
        <Text style={s.error} accessibilityLiveRegion="assertive">
          {errorMsg}
        </Text>
      )}
      {state === 'success' && (
        <Text style={s.success} accessibilityLiveRegion="assertive">
          ✓ {appliedCode} applied
        </Text>
      )}
    </View>
  );
}
