/**
 * @module ForceUpdateModal
 *
 * Blocking modal shown when the app version is below the minimum required.
 * Links to App Store / Play Store for update. Non-dismissable for critical
 * updates, dismissable for recommended updates.
 */
import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { useTheme } from '@/theme';
import { MountainSkyline } from '@/components/MountainSkyline';

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/carolina-futons/id0000000000'
    : 'https://play.google.com/store/apps/details?id=com.carolinafutons.app';

interface Props {
  visible: boolean;
  required: boolean;
  onDismiss?: () => void;
  testID?: string;
}

export function ForceUpdateModal({ visible, required, onDismiss, testID }: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();

  const handleUpdate = () => {
    Linking.openURL(STORE_URL);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.sandBase,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
        >
          <MountainSkyline variant="sunrise" height={60} />

          <View style={[styles.content, { padding: spacing.lg }]}>
            <Text
              style={[
                styles.title,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
              testID="force-update-title"
            >
              {required ? 'Update Required' : 'Update Available'}
            </Text>
            <Text style={[styles.message, { color: colors.espressoLight }]}>
              {required
                ? 'A new version of Carolina Futons is required to continue. Please update to get the latest features and fixes.'
                : 'A new version of Carolina Futons is available with improvements and new features.'}
            </Text>

            <TouchableOpacity
              style={[
                styles.updateButton,
                {
                  backgroundColor: colors.sunsetCoral,
                  borderRadius: borderRadius.button,
                },
                shadows.button,
              ]}
              onPress={handleUpdate}
              testID="force-update-button"
              accessibilityLabel="Update app"
              accessibilityRole="button"
            >
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>

            {!required && onDismiss && (
              <TouchableOpacity
                onPress={onDismiss}
                testID="force-update-dismiss"
                accessibilityLabel="Dismiss update"
                accessibilityRole="button"
              >
                <Text style={[styles.dismissText, { color: colors.espressoLight }]}>
                  Not Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 8,
  },
});
