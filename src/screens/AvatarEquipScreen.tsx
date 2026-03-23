/**
 * @module AvatarEquipScreen
 *
 * Accessory equip screen — grid of available accessories.
 * Locked accessories are dimmed and non-interactive.
 * Tap an unlocked accessory to equip/unequip via Wix webMethod.
 *
 * cf-ymo / Phase 6
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useAvatarState } from '@/hooks/useAvatarState';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { ACCESSORIES, type Accessory } from '@/data/accessories';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

export function AvatarEquipScreen() {
  const { colors, borderRadius, spacing } = useTheme();
  const { equippedAccessoryId, unlockedAccessoryIds, loading, error, refreshAvatarState } =
    useAvatarState();
  const [equipping, setEquipping] = useState<string | null>(null);
  const [equipError, setEquipError] = useState<string | null>(null);

  const handleEquip = useCallback(
    async (accessory: Accessory) => {
      if (!unlockedAccessoryIds.includes(accessory.id)) return;

      setEquipError(null);
      setEquipping(accessory.id);
      try {
        const client = getWixClientSingleton();
        if (!client) {
          setEquipError('Avatar service unavailable');
          return;
        }
        // Tapping the currently-equipped accessory unequips it (pass null)
        const nextId = accessory.id === equippedAccessoryId ? null : accessory.id;
        await client.callFunction('/_functions/equipAccessory', 'POST', { accessoryId: nextId });
        await refreshAvatarState();
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : 'Failed to equip accessory');
      } finally {
        setEquipping(null);
      }
    },
    [unlockedAccessoryIds, equippedAccessoryId, refreshAvatarState],
  );

  if (loading) {
    return (
      <View testID="avatar-equip-screen" style={[styles.root, styles.centered]}>
        <ActivityIndicator testID="avatar-equip-loading" size="large" color={colors.mountainBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View testID="avatar-equip-screen" style={[styles.root, styles.centered]}>
        <Text testID="avatar-equip-error" style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View testID="avatar-equip-screen" style={styles.root}>
      {/* Preview */}
      <View style={[styles.previewSection, { backgroundColor: colors.surfaceSecondary }]}>
        {equipError && (
          <Text testID="avatar-equip-equip-error" style={[styles.equipErrorText, { color: colors.error }]}>
            {equipError}
          </Text>
        )}
        <AvatarDisplay size="lg" equippedAccessoryId={equippedAccessoryId} testID="avatar-equip-preview" />
      </View>

      {/* Accessory grid */}
      <FlatList
        testID="accessory-grid"
        data={ACCESSORIES}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => {
          const isUnlocked = unlockedAccessoryIds.includes(item.id);
          const isEquipped = item.id === equippedAccessoryId;
          const isEquipping = equipping === item.id;

          return (
            <TouchableOpacity
              testID={`accessory-item-${item.id}`}
              accessibilityLabel={`${item.name}${isUnlocked ? '' : ', locked'}${isEquipped ? ', equipped' : ''}`}
              accessibilityState={{ disabled: !isUnlocked }}
              disabled={!isUnlocked}
              onPress={() => handleEquip(item)}
              activeOpacity={isUnlocked ? 0.7 : 1}
              style={[
                styles.accessoryCard,
                {
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  borderColor: isEquipped ? colors.mountainBlue : colors.border,
                  borderWidth: isEquipped ? 2 : 1,
                  opacity: isUnlocked ? 1 : 0.45,
                  margin: spacing.xs / 2,
                },
              ]}
            >
              {isEquipping ? (
                <ActivityIndicator size="small" color={colors.mountainBlue} />
              ) : (
                <Text style={styles.accessoryEmoji}>{item.emoji}</Text>
              )}
              <Text
                style={[styles.accessoryName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {/* Lock icon for locked accessories */}
              {!isUnlocked && (
                <Text testID={`accessory-lock-${item.id}`} style={styles.lockIcon}>
                  🔒
                </Text>
              )}

              {/* Points cost for premium accessories */}
              {item.pointsCost > 0 && (
                <Text
                  testID={`accessory-cost-${item.id}`}
                  style={[styles.costLabel, { color: colors.textSecondary }]}
                >
                  {item.pointsCost} pts
                </Text>
              )}

              {/* Equipped indicator */}
              {isEquipped && (
                <View
                  testID={`accessory-equipped-${item.id}`}
                  style={[styles.equippedDot, { backgroundColor: colors.mountainBlue }]}
                />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  gridContent: {
    padding: 8,
  },
  accessoryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: 90,
  },
  accessoryEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  accessoryName: {
    fontSize: 11,
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 12,
  },
  costLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  equippedDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  equipErrorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});
