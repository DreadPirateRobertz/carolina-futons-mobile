import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  onLogin?: () => void;
  onOrderHistory?: () => void;
  testID?: string;
}

export function AccountScreen({ onLogin, onOrderHistory, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'account-screen'}
      >
        <View style={styles.guestContent}>
          <Text style={[styles.guestTitle, { color: colors.espresso }]} testID="guest-title">
            Your Account
          </Text>
          <Text style={[styles.guestMessage, { color: colors.espressoLight }]}>
            Sign in to view orders, save favorites, and manage your profile.
          </Text>
          <TouchableOpacity
            style={[
              styles.signInButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={onLogin}
            testID="account-sign-in-button"
            accessibilityLabel="Sign in to your account"
            accessibilityRole="button"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'account-screen'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={[styles.profileHeader, { paddingHorizontal: spacing.lg }]}>
          <View
            style={[styles.avatar, { backgroundColor: colors.mountainBlue, borderRadius: 30 }]}
            testID="user-avatar"
          >
            <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.espresso }]} testID="user-display-name">
            {user.displayName}
          </Text>
          <Text style={[styles.userEmail, { color: colors.espressoLight }]} testID="user-email">
            {user.email}
          </Text>
        </View>

        {/* Menu items */}
        <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          <MenuItem
            label="Order History"
            onPress={onOrderHistory}
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-order-history"
          />
          <MenuItem
            label="Saved Addresses"
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-addresses"
          />
          <MenuItem
            label="Payment Methods"
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-payment"
          />
          <MenuItem
            label="Notification Preferences"
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-notifications"
          />
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 32 }}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              {
                borderColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
            ]}
            onPress={signOut}
            testID="sign-out-button"
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text style={[styles.signOutText, { color: colors.sunsetCoral }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  colors,
  borderRadius: br,
  shadows: sh,
  testID,
}: {
  label: string;
  onPress?: () => void;
  colors: any;
  borderRadius: any;
  shadows: any;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        {
          backgroundColor: colors.sandLight,
          borderRadius: br.card,
        },
        sh.card,
      ]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
    >
      <Text style={[styles.menuLabel, { color: colors.espresso }]}>{label}</Text>
      <Text style={[styles.menuChevron, { color: colors.muted }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Guest state
  guestContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  guestMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  signInButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  // Authenticated state
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  avatar: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  // Menu
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuChevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  // Sign out
  signOutButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
