import React, { useState } from 'react';
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

interface PromoCodeInputProps {
  cartTotal: number;
  onDiscount: (discount: number, type: 'percent' | 'fixed') => void;
}

type PromoState = 'collapsed' | 'idle' | 'loading' | 'success' | 'error';

export function PromoCodeInput({ cartTotal, onDiscount }: PromoCodeInputProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const client = useOptionalWixClient();
  const [state, setState] = useState<PromoState>('collapsed');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [appliedCode, setAppliedCode] = useState('');

  async function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (!client) {
      setState('error');
      setErrorMsg('Promo codes unavailable — please sign in to apply');
      return;
    }
    setState('loading');
    try {
      const result = (await client.callFunction('/_functions/validatePromoCode', 'POST', {
        code: trimmed,
        cartTotal,
      })) as { valid: boolean; discount: number; type: 'percent' | 'fixed'; error?: string };

      if (result.valid) {
        setState('success');
        setAppliedCode(trimmed);
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

  const s = StyleSheet.create({
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
    error: { color: 'red', fontFamily: typography.bodyFamily, fontSize: 13, marginTop: spacing.xs },
    success: {
      color: colors.success ?? '#4A7C59',
      fontFamily: typography.bodyFamily,
      fontSize: 13,
      marginTop: spacing.xs,
    },
  });

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
          returnKeyType="done"
          onSubmitEditing={handleApply}
          accessibilityLabel="Promo code input"
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
