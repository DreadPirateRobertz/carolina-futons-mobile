import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Clipboard, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useWixClient } from '@/services/wix/wixProvider';
import { useAuth } from '@/hooks/useAuth';
import { generateReferralLink } from '@/services/referralService';

export function ShareSheet() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const client = useWixClient();
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id || !client) return;
    generateReferralLink(client.callFunction.bind(client), user.id).then((l) => {
      if (l) setLink(l);
      else setError(true);
    });
  }, [user?.id, client]);

  async function handleShare() {
    if (!link) return;
    await Share.share({
      message: `Check out Carolina Futons! Use my link: ${link}`,
      url: link,
    });
  }

  function handleCopy() {
    if (!link) return;
    Clipboard.setString(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s = StyleSheet.create({
    container: { padding: spacing.md },
    shareBtn: {
      backgroundColor: colors.sunsetCoral,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    shareBtnText: {
      color: colors.offWhite,
      fontFamily: typography.bodyFamily,
      fontWeight: '600' as const,
    },
    copyBtn: {
      borderWidth: 1,
      borderColor: colors.espresso,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center' as const,
    },
    copyBtnText: { color: colors.espresso, fontFamily: typography.bodyFamily },
    error: {
      color: 'red',
      fontFamily: typography.bodyFamily,
      textAlign: 'center' as const,
      marginTop: spacing.sm,
    },
  });

  if (error) {
    return <Text style={s.error}>Unable to generate link — try again later</Text>;
  }

  return (
    <View style={s.container}>
      <TouchableOpacity
        testID="share-btn"
        style={s.shareBtn}
        onPress={handleShare}
        disabled={!link}
        accessibilityRole="button"
        accessibilityLabel="Share referral link and earn rewards"
        accessibilityState={{ disabled: !link }}
      >
        <Text style={s.shareBtnText}>Share & Earn</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="copy-link-btn"
        style={s.copyBtn}
        onPress={handleCopy}
        disabled={!link}
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Referral link copied' : 'Copy referral link'}
        accessibilityState={{ disabled: !link }}
      >
        <Text style={s.copyBtnText}>{copied ? 'Copied!' : 'Copy link'}</Text>
      </TouchableOpacity>
    </View>
  );
}
