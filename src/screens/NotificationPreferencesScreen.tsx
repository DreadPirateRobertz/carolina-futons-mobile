import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '@/theme';
import { useNotifications } from '@/hooks/useNotifications';
import {
  NOTIFICATION_TYPE_CONFIG,
  type NotificationType,
  type NotificationPreferences,
} from '@/services/notifications';

interface Props {
  onBack?: () => void;
  testID?: string;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  'order_update',
  'promotion',
  'back_in_stock',
  'cart_reminder',
];

export function NotificationPreferencesScreen({ onBack, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { permissionStatus, preferences, togglePreference, requestPermission } = useNotifications();

  const handleToggle = useCallback(
    (key: keyof NotificationPreferences) => {
      togglePreference(key);
    },
    [togglePreference],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'notification-prefs-screen'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            testID="notif-prefs-back"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        )}
        <Text
          style={[styles.headerTitle, { color: colors.espresso }]}
          accessibilityRole="header"
          testID="notif-prefs-header"
        >
          Notifications
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Permission status */}
        {permissionStatus !== 'granted' && (
          <View
            style={[
              styles.permissionCard,
              {
                backgroundColor: colors.mountainBlueLight,
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="permission-prompt"
          >
            <Text style={[styles.permissionTitle, { color: colors.mountainBlueDark }]}>
              Enable Notifications
            </Text>
            <Text style={[styles.permissionDesc, { color: colors.espressoLight }]}>
              Stay updated on order status, exclusive deals, and restocked favorites.
            </Text>
            <TouchableOpacity
              style={[
                styles.enableButton,
                {
                  backgroundColor: colors.mountainBlue,
                  borderRadius: borderRadius.button,
                },
              ]}
              onPress={requestPermission}
              testID="enable-notifications-button"
              accessibilityLabel="Enable push notifications"
              accessibilityRole="button"
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {permissionStatus === 'denied' && (
          <Text
            style={[styles.deniedNote, { color: colors.sunsetCoral, marginHorizontal: spacing.lg }]}
            testID="permission-denied-note"
          >
            Notifications are blocked. Enable them in your device settings.
          </Text>
        )}

        {/* Preference toggles */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Notification Types</Text>
          {NOTIFICATION_TYPES.map((type) => {
            const config = NOTIFICATION_TYPE_CONFIG[type];
            const isEnabled = preferences[config.prefKey];

            return (
              <View
                key={type}
                style={[
                  styles.prefRow,
                  {
                    backgroundColor: colors.sandLight,
                    borderRadius: borderRadius.card,
                  },
                  shadows.card,
                ]}
                testID={`pref-row-${type}`}
              >
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, { color: colors.espresso }]}>{config.label}</Text>
                  <Text style={[styles.prefDesc, { color: colors.espressoLight }]}>
                    {config.description}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggle(config.prefKey)}
                  trackColor={{
                    false: colors.sandDark,
                    true: colors.mountainBlue,
                  }}
                  thumbColor={colors.white}
                  testID={`pref-toggle-${type}`}
                  accessibilityLabel={`${config.label}: ${isEnabled ? 'enabled' : 'disabled'}`}
                  accessibilityRole="switch"
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  // Permission
  permissionCard: {
    padding: 20,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  enableButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deniedNote: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Preferences
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  prefInfo: {
    flex: 1,
    marginRight: 12,
  },
  prefLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  prefDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
