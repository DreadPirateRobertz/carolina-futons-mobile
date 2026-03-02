import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, shadows } from '@/theme/tokens';

interface Props {
  title?: string;
  cartCount?: number;
  showBack?: boolean;
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onBackPress?: () => void;
  testID?: string;
}

export function Header({
  title,
  cartCount,
  showBack,
  onSearchPress,
  onCartPress,
  onBackPress,
  testID,
}: Props) {
  const showBadge = cartCount != null && cartCount > 0;
  const badgeText = cartCount != null && cartCount > 99 ? '99+' : String(cartCount ?? 0);

  return (
    <View style={[styles.container, shadows.nav]} testID={testID}>
      {/* Left: Back or spacer */}
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.iconButton}
            testID={testID ? `${testID}-back` : undefined}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {/* Center: Logo or title */}
      <View style={styles.center}>
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <Text style={styles.logo} testID={testID ? `${testID}-logo` : undefined}>
            Carolina Futons
          </Text>
        )}
      </View>

      {/* Right: Search + Cart */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={onSearchPress}
          style={styles.iconButton}
          testID={testID ? `${testID}-search` : undefined}
          accessibilityLabel="Search products"
          accessibilityRole="button"
        >
          <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">🔍</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCartPress}
          style={styles.iconButton}
          testID={testID ? `${testID}-cart` : undefined}
          accessibilityLabel={showBadge ? `Cart, ${cartCount} items` : 'Cart'}
          accessibilityRole="button"
        >
          <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">🛒</Text>
          {showBadge && (
            <View style={styles.badge} testID={testID ? `${testID}-cart-badge` : undefined}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sandLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 56,
  },
  left: {
    width: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    ...typography.h4,
    color: colors.espresso,
  },
  title: {
    ...typography.h4,
    color: colors.espresso,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  backIcon: {
    fontSize: 28,
    color: colors.espresso,
    fontWeight: '300',
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.sunsetCoral,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
