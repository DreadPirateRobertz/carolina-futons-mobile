/**
 * @module AccountScreen
 *
 * User account hub. When unauthenticated, shows a branded sign-in prompt with
 * the mountain skyline backdrop. When authenticated, displays the user's profile
 * (avatar, name, email) and menu links to Order History and CF+ Premium, plus
 * placeholder rows for Saved Addresses, Payment Methods, and Notification
 * Preferences (not yet wired). Sign-out lives at the bottom.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Share,
} from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { MountainSkyline } from '@/components/MountainSkyline';
import { GlassCard } from '@/components/GlassCard';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { usePremium } from '@/hooks/usePremium';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useDataExport } from '@/hooks/useDataExport';
import { useReferral } from '@/hooks/useReferral';
import { useAddressBook, type SavedAddress } from '@/hooks/useAddressBook';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import { PremiumBadge } from '@/components/PremiumBadge';
import { LoyaltyTierBadge } from '@/components/LoyaltyTierBadge';
import { StreakBadge } from '@/components/StreakBadge';
import { TierProgressBar } from '@/components/TierProgressBar';
import { useStreak } from '@/hooks/useStreak';
import { WixAuthService } from '@/services/wix/wixAuth';
import { useLoyalty } from '@/hooks/useLoyalty';
import * as gamification from '@/services/gamification';

/** Props for the AccountScreen component. */
interface Props {
  /** Callback to navigate to the login screen (guest state). */
  onLogin?: () => void;
  /** Callback to navigate to the order history list. */
  onOrderHistory?: () => void;
  /** Callback to navigate to the premium subscription screen. */
  onPremium?: () => void;
  /** Callback to navigate to the style quiz screen. */
  onStyleQuiz?: () => void;
  /** Callback to navigate to the privacy policy screen. */
  onPrivacyPolicy?: () => void;
  /** Callback to navigate to the loyalty rewards screen. */
  onLoyalty?: () => void;
  /** Callback to navigate to the loyalty leaderboard screen. */
  onLeaderboard?: () => void;
  /** Test identifier for end-to-end tests. */
  testID?: string;
}

/**
 * Account screen that adapts between guest (sign-in prompt) and authenticated
 * (profile + settings menu) states.
 *
 * @param props - {@link Props}
 * @returns The account screen view.
 */
export function AccountScreen({
  onLogin,
  onOrderHistory,
  onPremium,
  onStyleQuiz,
  onPrivacyPolicy,
  onLoyalty,
  onLeaderboard,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { user, isAuthenticated, loading, error, signOut, updateProfile, clearError } = useAuth();
  const { isPremium, restore } = usePremium();
  const deletion = useAccountDeletion();
  const dataExport = useDataExport();
  const wixAuthService = React.useMemo(() => new WixAuthService(), []);
  const wixSync = React.useCallback(
    async (addresses: SavedAddress[]) => {
      if (!user?.id) return;
      await wixAuthService.syncMemberAddresses(user.id, addresses);
    },
    [user?.id, wixAuthService],
  );
  const addressBook = useAddressBook({ wixSync });
  const [restoring, setRestoring] = useState(false);
  const {
    status: bioStatus,
    isEnabled: biometricEnabled,
    loading: bioLoading,
    enableBiometric,
    disableBiometric,
  } = useBiometricAuth();

  const referral = useReferral();
  const loyalty = useLoyalty();
  const { streak, loading: streakLoading } = useStreak();

  const handleShareReferral = useCallback(async () => {
    if (!referral.shareUrl) return;
    try {
      await Share.share({
        message: `Get $20 off your first Carolina Futons order! Use my referral link: ${referral.shareUrl}`,
        url: referral.shareUrl,
      });
      if (referral.code) {
        gamification.referralShared(referral.code);
      }
    } catch (e) {
      console.warn('[AccountScreen] Share.share failed or cancelled:', e);
    }
  }, [referral.shareUrl, referral.code]);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showDebugMenu, setShowDebugMenu] = useState(false);

  // Address form state
  const [addressFormMode, setAddressFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appVersion =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? '1';
  const environment = __DEV__
    ? 'development'
    : (Constants.expoConfig?.extra?.environment ?? 'production');

  const handleVersionTap = useCallback(() => {
    versionTapCount.current += 1;
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    if (versionTapCount.current >= 5) {
      versionTapCount.current = 0;
      setShowDebugMenu((prev) => !prev);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      versionTapTimer.current = setTimeout(() => {
        versionTapCount.current = 0;
      }, 1500);
    }
  }, []);

  const startEditing = useCallback(() => {
    if (!user) return;
    const parts = user.displayName.split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(user.phone ?? '');
    clearError();
    setEditing(true);
  }, [user, clearError]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    clearError();
  }, [clearError]);

  const saveProfile = useCallback(async () => {
    await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });
    setEditing(false);
  }, [updateProfile, firstName, lastName, phone]);

  const handleAddAddress = useCallback(() => {
    if (addressBook.addresses.length >= 5) return;
    setEditingAddress(null);
    setAddressFormMode('add');
  }, [addressBook.addresses.length]);

  const handleEditAddress = useCallback((addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddressFormMode('edit');
  }, []);

  const handleAddressFormCancel = useCallback(() => {
    setAddressFormMode('none');
    setEditingAddress(null);
  }, []);

  const handleAddressFormSubmit = useCallback(
    async (values: AddressFormValues) => {
      setAddressSaving(true);
      try {
        if (addressFormMode === 'add') {
          await addressBook.addAddress(values);
        } else if (addressFormMode === 'edit' && editingAddress) {
          await addressBook.updateAddress(editingAddress.id, values);
        }
        setAddressFormMode('none');
        setEditingAddress(null);
      } catch {
        // Keep form open on error — user can retry
      } finally {
        setAddressSaving(false);
      }
    },
    [addressFormMode, editingAddress, addressBook],
  );

  const showBiometricToggle =
    isAuthenticated && bioStatus.isAvailable && bioStatus.isEnrolled && !bioLoading;
  const biometricLabel = bioStatus.biometricType === 'facial' ? 'Face ID' : 'Touch ID';

  const handleBiometricToggle = async (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (value) {
      await enableBiometric();
    } else {
      await disableBiometric();
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restore();
    setRestoring(false);
    Alert.alert(
      success ? 'Restored!' : 'No Purchases Found',
      success
        ? 'Your CF+ subscription has been restored.'
        : 'We could not find any previous purchases for this account.',
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <View
        style={[styles.root, { backgroundColor: darkPalette.background }]}
        testID={testID ?? 'account-screen'}
      >
        <MountainSkyline variant="sunrise" height={120} testID="account-skyline" />
        <View style={styles.guestContent}>
          <Text
            style={[
              styles.guestTitle,
              { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
            ]}
            testID="guest-title"
          >
            Your Account
          </Text>
          <Text
            style={[
              styles.guestMessage,
              { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
            ]}
          >
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
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onLogin?.();
            }}
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
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'account-screen'}
    >
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <MountainSkyline variant="sunrise" height={80} testID="account-auth-skyline" />

        {/* Profile header */}
        <View style={[styles.profileHeader, { paddingHorizontal: spacing.lg }]}>
          <View
            style={[styles.avatar, { backgroundColor: colors.mountainBlue, borderRadius: 30 }]}
            testID="user-avatar"
          >
            <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          {!editing ? (
            <>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.userName,
                    { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
                  ]}
                  testID="user-display-name"
                >
                  {user.displayName}
                </Text>
                {isPremium && <PremiumBadge />}
              </View>
              <TouchableOpacity
                onPress={onLoyalty}
                testID="account-loyalty-row"
                accessibilityLabel="View loyalty rewards"
                accessibilityHint="Opens your loyalty points and tier details"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <LoyaltyTierBadge points={loyalty.points} />
                {!streakLoading && streak > 0 && (
                  <StreakBadge streak={streak} testID="account-streak-badge" />
                )}
                <TierProgressBar points={loyalty.points} testID="account-tier-progress" />
              </TouchableOpacity>
              <Text
                style={[styles.userEmail, { color: darkPalette.textMuted }]}
                testID="user-email"
              >
                {user.email}
              </Text>
              {user.phone ? (
                <Text
                  style={[styles.userPhone, { color: darkPalette.textMuted }]}
                  testID="user-phone"
                >
                  {user.phone}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={startEditing}
                testID="edit-profile-button"
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                <Text style={[styles.editLink, { color: colors.mountainBlue }]}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.editForm} testID="edit-profile-form">
              {error && (
                <Text
                  style={[styles.editError, { color: colors.sunsetCoral }]}
                  testID="edit-profile-error"
                >
                  {error}
                </Text>
              )}
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
                  ]}
                >
                  First Name
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: darkPalette.surfaceElevated,
                      color: darkPalette.textPrimary,
                      borderRadius: borderRadius.md,
                      borderColor: darkPalette.borderSubtle,
                    },
                  ]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={darkPalette.textMuted}
                  autoCapitalize="words"
                  testID="edit-first-name-input"
                  accessibilityLabel="First name"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
                  ]}
                >
                  Last Name
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: darkPalette.surfaceElevated,
                      color: darkPalette.textPrimary,
                      borderRadius: borderRadius.md,
                      borderColor: darkPalette.borderSubtle,
                    },
                  ]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={darkPalette.textMuted}
                  autoCapitalize="words"
                  testID="edit-last-name-input"
                  accessibilityLabel="Last name"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
                  ]}
                >
                  Phone
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: darkPalette.surfaceElevated,
                      color: darkPalette.textPrimary,
                      borderRadius: borderRadius.md,
                      borderColor: darkPalette.borderSubtle,
                    },
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={darkPalette.textMuted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  testID="edit-phone-input"
                  accessibilityLabel="Phone number"
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[
                    styles.editCancelButton,
                    { borderColor: darkPalette.borderSubtle, borderRadius: borderRadius.button },
                  ]}
                  onPress={cancelEditing}
                  testID="edit-cancel-button"
                  accessibilityLabel="Cancel editing"
                  accessibilityRole="button"
                >
                  <Text style={[styles.editCancelText, { color: darkPalette.textMuted }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editSaveButton,
                    { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.button },
                  ]}
                  onPress={saveProfile}
                  disabled={loading}
                  testID="edit-save-button"
                  accessibilityLabel="Save profile"
                  accessibilityRole="button"
                >
                  {loading ? (
                    <BrandedSpinner size="small" color="#FFFFFF" testID="edit-save-loading" />
                  ) : (
                    <Text style={styles.editSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            label="Leaderboard"
            onPress={onLeaderboard}
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-leaderboard"
          />
          <MenuItem
            label={`Saved Addresses${addressBook.addresses.length > 0 ? ` (${addressBook.addresses.length})` : ''}`}
            onPress={addressBook.addresses.length < 5 ? handleAddAddress : undefined}
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-addresses"
          />
          {addressBook.addresses.length > 0 && (
            <View style={{ gap: 6 }} testID="address-list">
              {addressBook.addresses.map((addr) => (
                <GlassCard key={addr.id} intensity="light">
                  <View style={styles.addressItem} testID={`address-${addr.id}`}>
                    <View style={styles.addressInfo}>
                      <Text style={[styles.addressName, { color: darkPalette.textPrimary }]}>
                        {addr.fullName}
                        {addr.isDefault && (
                          <Text style={{ color: colors.sunsetCoral }}> (Default)</Text>
                        )}
                      </Text>
                      <Text style={[styles.addressLine, { color: darkPalette.textMuted }]}>
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}
                      </Text>
                      <Text style={[styles.addressLine, { color: darkPalette.textMuted }]}>
                        {addr.city}, {addr.state} {addr.zip}
                      </Text>
                    </View>
                    <View style={styles.addressActions}>
                      <TouchableOpacity
                        onPress={() => handleEditAddress(addr)}
                        testID={`edit-address-${addr.id}`}
                        accessibilityLabel={`Edit address ${addr.line1}`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.addressAction, { color: colors.mountainBlue }]}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      {!addr.isDefault && (
                        <TouchableOpacity
                          onPress={() => addressBook.setDefault(addr.id)}
                          testID={`set-default-${addr.id}`}
                          accessibilityLabel="Set as default address"
                          accessibilityRole="button"
                        >
                          <Text style={[styles.addressAction, { color: colors.mountainBlue }]}>
                            Default
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete Address', `Remove ${addr.line1}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => addressBook.deleteAddress(addr.id),
                            },
                          ]);
                        }}
                        testID={`delete-address-${addr.id}`}
                        accessibilityLabel="Delete address"
                        accessibilityRole="button"
                      >
                        <Text style={[styles.addressAction, { color: colors.sunsetCoral }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              ))}
              {addressBook.addresses.length >= 5 && (
                <Text
                  testID="address-max-notice"
                  style={[
                    styles.addressLine,
                    { color: darkPalette.textMuted, textAlign: 'center', paddingVertical: 4 },
                  ]}
                  accessibilityLabel="Maximum of 5 addresses reached"
                >
                  Maximum of 5 saved addresses reached
                </Text>
              )}
            </View>
          )}
          {addressFormMode !== 'none' && (
            <GlassCard intensity="light">
              <View style={{ padding: 16 }}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: darkPalette.textPrimary, marginBottom: 12 },
                  ]}
                >
                  {addressFormMode === 'add' ? 'Add Address' : 'Edit Address'}
                </Text>
                <AddressForm
                  initialValues={editingAddress ?? undefined}
                  onSubmit={handleAddressFormSubmit}
                  onCancel={handleAddressFormCancel}
                  saving={addressSaving}
                />
              </View>
            </GlassCard>
          )}
          <MenuItem
            label="Payment Methods"
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-payment"
          />
          <MenuItem
            label="CF+ Premium"
            onPress={onPremium}
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-premium"
            trailing={
              isPremium ? <PremiumBadge size="sm" testID="menu-premium-badge" /> : undefined
            }
          />
          {/* Referral program section */}
          <GlassCard intensity="light" testID="account-referral-section">
            <View style={styles.referralCard}>
              <Text
                style={[
                  styles.referralTitle,
                  { color: colors.espresso, fontFamily: typography.headingFamily },
                ]}
              >
                Refer a Friend
              </Text>
              <Text style={[styles.referralSubtitle, { color: colors.espressoLight }]}>
                Earn $20 store credit for each confirmed referral
              </Text>
              {referral.loading ? (
                <BrandedSpinner size="small" testID="account-referral-loading" />
              ) : referral.error ? (
                <Text
                  style={[styles.referralError, { color: colors.espressoLight }]}
                  testID="account-referral-error"
                >
                  {referral.error}
                </Text>
              ) : (
                <>
                  <View style={styles.referralStats}>
                    <View style={styles.referralStat}>
                      <Text style={[styles.referralStatLabel, { color: colors.espressoLight }]}>
                        Credits Earned
                      </Text>
                      <Text
                        style={[styles.referralStatValue, { color: colors.espresso }]}
                        testID="account-referral-credits"
                      >
                        {'$'}
                        {referral.creditsEarned}
                      </Text>
                    </View>
                    <View style={styles.referralStat}>
                      <Text style={[styles.referralStatLabel, { color: colors.espressoLight }]}>
                        Referrals
                      </Text>
                      <Text
                        style={[styles.referralStatValue, { color: colors.espresso }]}
                        testID="account-referral-count"
                      >
                        {''}
                        {referral.referralCount}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.referralCodeRow, { borderColor: colors.overlay }]}>
                    <Text
                      style={[
                        styles.referralCode,
                        { color: colors.espresso, fontFamily: typography.headingFamily },
                      ]}
                      testID="account-referral-code"
                    >
                      {referral.code}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.referralShareBtn,
                      {
                        backgroundColor: colors.sunsetCoral,
                        borderRadius: borderRadius.pill ?? 28,
                      },
                    ]}
                    onPress={handleShareReferral}
                    testID="account-referral-share-btn"
                    accessibilityRole="button"
                    accessibilityLabel="Share referral link"
                  >
                    <Text
                      style={[
                        styles.referralShareBtnText,
                        { fontFamily: typography.bodyFamilyBold },
                      ]}
                    >
                      Share Your Link
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </GlassCard>

          <MenuItem
            label="Notification Preferences"
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-notifications"
          />
          <MenuItem
            label="Style Preferences"
            onPress={onStyleQuiz}
            colors={colors}
            borderRadius={borderRadius}
            shadows={shadows}
            testID="account-style-quiz"
          />
          {showBiometricToggle && (
            <GlassCard intensity="light">
              <View style={styles.menuItem} testID="account-biometric-toggle">
                <Text style={[styles.menuLabel, { color: darkPalette.textPrimary }]}>
                  {biometricLabel} Sign-In
                </Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: darkPalette.borderSubtle, true: colors.mountainBlue }}
                  thumbColor="#FFFFFF"
                  testID="biometric-switch"
                  accessibilityLabel={`Enable ${biometricLabel} sign-in`}
                />
              </View>
            </GlassCard>
          )}
        </View>

        {/* Privacy section */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 24 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: darkPalette.textMuted, fontFamily: typography.bodyFamilySemiBold },
            ]}
            testID="privacy-section-title"
          >
            Privacy
          </Text>
          <View style={{ gap: 8 }}>
            {onPrivacyPolicy && (
              <MenuItem
                label="Privacy Policy"
                onPress={onPrivacyPolicy}
                colors={colors}
                borderRadius={borderRadius}
                shadows={shadows}
                testID="account-privacy-policy"
              />
            )}
            <MenuItem
              label="Export My Data"
              onPress={dataExport.exportData}
              colors={colors}
              borderRadius={borderRadius}
              shadows={shadows}
              testID="account-export-data"
            />
            <MenuItem
              label="Delete Account"
              onPress={() => {
                deletion.requestDeletion();
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account and all associated data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel', onPress: deletion.cancel },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: deletion.confirmDeletion,
                    },
                  ],
                );
              }}
              colors={colors}
              borderRadius={borderRadius}
              shadows={shadows}
              testID="account-delete-account"
            />
          </View>
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
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              signOut();
            }}
            testID="sign-out-button"
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text style={[styles.signOutText, { color: colors.sunsetCoral }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Restore purchases */}
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            testID="restore-purchases"
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
          >
            <Text style={[styles.restoreText, { color: colors.mountainBlue }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>
        </View>

        {/* App version info */}
        <View style={styles.versionContainer}>
          <TouchableOpacity
            onPress={handleVersionTap}
            activeOpacity={0.8}
            testID="app-version-tap"
            accessibilityLabel={`App version ${appVersion}, build ${buildNumber}`}
          >
            <Text
              style={[styles.versionText, { color: darkPalette.textMuted }]}
              testID="app-version-text"
            >
              v{appVersion} ({buildNumber})
            </Text>
          </TouchableOpacity>

          {showDebugMenu && (
            <View style={styles.debugMenu} testID="debug-menu">
              <Text
                style={[
                  styles.debugTitle,
                  { color: darkPalette.textMuted, fontFamily: typography.bodyFamilySemiBold },
                ]}
              >
                Debug Info
              </Text>
              <Text style={[styles.debugLine, { color: darkPalette.textMuted }]}>
                Environment: {environment}
              </Text>
              <Text style={[styles.debugLine, { color: darkPalette.textMuted }]}>
                Expo SDK: {Constants.expoConfig?.sdkVersion ?? 'N/A'}
              </Text>
              <Text style={[styles.debugLine, { color: darkPalette.textMuted }]}>
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text style={[styles.debugLine, { color: darkPalette.textMuted }]}>
                Bundle ID: {Application.applicationId ?? 'N/A'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/**
 * Single menu row rendered inside a GlassCard. Displays a label with a
 * trailing chevron. Theme props (colors, borderRadius, shadows) are accepted
 * for consistency but delegated to the GlassCard wrapper.
 *
 * @param props.label - Display text for the menu item.
 * @param props.onPress - Callback when the row is tapped.
 * @param props.testID - Test identifier for end-to-end tests.
 * @returns A pressable menu row inside a glass card.
 */
function MenuItem({
  label,
  onPress,
  testID,
  trailing,
}: {
  label: string;
  onPress?: () => void;
  colors: any;
  borderRadius: any;
  shadows: any;
  testID?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <GlassCard intensity="light">
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress?.();
        }}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.menuLabel, { color: darkPalette.textPrimary }]}>{label}</Text>
        <View style={styles.menuTrailing}>
          {trailing}
          <Text style={[styles.menuChevron, { color: darkPalette.textMuted }]}>›</Text>
        </View>
      </TouchableOpacity>
    </GlassCard>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
  },
  userPhone: {
    fontSize: 14,
    marginTop: 2,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  editForm: {
    width: '100%',
    marginTop: 8,
  },
  editError: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  editInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  editCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
  },
  addressLine: {
    fontSize: 13,
    marginTop: 2,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 8,
  },
  addressAction: {
    fontSize: 13,
    fontWeight: '600',
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
  menuTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  restoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '400',
  },
  debugMenu: {
    marginTop: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  debugLine: {
    fontSize: 12,
    lineHeight: 18,
  },
  referralCard: {
    padding: 16,
    gap: 12,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  referralSubtitle: {
    fontSize: 13,
  },
  referralStats: {
    flexDirection: 'row',
    gap: 24,
  },
  referralStat: {
    gap: 2,
  },
  referralStatLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referralStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  referralCodeRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  referralError: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  referralShareBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  referralShareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
