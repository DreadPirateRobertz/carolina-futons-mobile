import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

export function NotificationPermissionPromptScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation();
  const { requestPermission } = useNotificationPermission();

  async function handleEnable() {
    await requestPermission();
    navigation.navigate('Home' as never);
  }

  function handleLater() {
    navigation.navigate('Home' as never);
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.offWhite,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    title: {
      fontFamily: typography.headingFamily,
      fontSize: 24,
      color: colors.espresso,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    body: {
      fontFamily: typography.bodyFamily,
      fontSize: 16,
      color: colors.espresso,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    primaryBtn: {
      backgroundColor: colors.sunsetCoral,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    primaryText: {
      color: colors.offWhite,
      fontFamily: typography.bodyFamily,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryText: {
      color: colors.espresso,
      fontFamily: typography.bodyFamily,
      fontSize: 14,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.body}>
        Get notified when your order ships, when you earn a badge, and when a futon you love drops
        in price.
      </Text>
      <TouchableOpacity
        testID="notif-prompt-enable"
        style={styles.primaryBtn}
        onPress={handleEnable}
        accessibilityRole="button"
        accessibilityLabel="Turn on notifications"
      >
        <Text style={styles.primaryText}>Turn on notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLater}
        accessibilityRole="button"
        accessibilityLabel="Maybe later"
      >
        <Text style={styles.secondaryText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}
