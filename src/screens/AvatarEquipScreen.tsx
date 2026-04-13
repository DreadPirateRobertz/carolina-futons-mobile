/**
 * @module AvatarEquipScreen
 *
 * Accessory equip screen — grid of available accessories.
 * Locked accessories are dimmed and non-interactive.
 * Tap an unlocked accessory to equip/unequip via Wix webMethod.
 *
 * Supports optimistic updates while offline — queues the equip and
 * flushes it when connectivity is restored. 403 responses roll back
 * the optimistic state and surface an error toast.
 *
 * cf-ymo / Phase 6 / cm-xch
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useOptionalConnectivity } from '@/hooks/useConnectivity';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { ACCESSORIES, type Accessory } from '@/data/accessories';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { SkeletonGrid } from '@/components/Skeleton';

function is403Error(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('403') || err.message.toLowerCase().includes('forbidden');
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as { status?: number; statusCode?: number };
    return e.status === 403 || e.statusCode === 403;
  }
  return false;
}

export function AvatarEquipScreen() {
  const { colors, borderRadius, spacing } = useTheme();
  const { equippedAccessoryId, unlockedAccessoryIds, loading, error, refreshAvatarState } =
    useAvatarState();
  const [equipping, setEquipping] = useState<string | null>(null);
  const [equipError, setEquipError] = useState<string | null>(null);

  // Optimistic state: undefined = use server value, string/null = local override
  const [optimisticEquipped, setOptimisticEquipped] = useState<string | null | undefined>(
    undefined,
  );
  const pendingEquipRef = useRef<{ accessoryId: string | null; prevId: string | null } | null>(
    null,
  );

  const connectivity = useOptionalConnectivity();
  const isOnline = connectivity?.isOnline ?? true;

  const effectiveEquipped =
    optimisticEquipped !== undefined ? optimisticEquipped : equippedAccessoryId;

  // Flush pending equip when connectivity is restored
  useEffect(() => {
    if (!isOnline || pendingEquipRef.current === null) return;
    const pending = pendingEquipRef.current;
    pendingEquipRef.current = null;

    const client = getWixClientSingleton();
    if (!client) {
      setOptimisticEquipped(pending.prevId);
      setEquipError('Avatar service unavailable');
      return;
    }

    client
      .callFunction('/_functions/equipAccessory', 'POST', { accessoryId: pending.accessoryId })
      .then(() => {
        setOptimisticEquipped(undefined);
        refreshAvatarState();
      })
      .catch((err: unknown) => {
        setOptimisticEquipped(pending.prevId);
        setEquipError(
          is403Error(err) ? 'Not authorized to equip this accessory' : 'Failed to sync accessory',
        );
      });
  }, [isOnline, refreshAvatarState]);

  const handleEquip = useCallback(
    async (accessory: Accessory) => {
      if (!unlockedAccessoryIds.includes(accessory.id)) return;

      setEquipError(null);
      const prevId = effectiveEquipped;
      const nextId = accessory.id === effectiveEquipped ? null : accessory.id;
      setOptimisticEquipped(nextId);

      if (!isOnline) {
        pendingEquipRef.current = { accessoryId: nextId, prevId };
        return;
      }

      setEquipping(accessory.id);
      try {
        const client = getWixClientSingleton();
        if (!client) {
          setOptimisticEquipped(prevId);
          setEquipError('Avatar service unavailable');
          return;
        }
        await client.callFunction('/_functions/equipAccessory', 'POST', { accessoryId: nextId });
        setOptimisticEquipped(undefined);
        await refreshAvatarState();
      } catch (err) {
        setOptimisticEquipped(prevId);
        setEquipError(
          is403Error(err)
            ? 'Not authorized to equip this accessory'
            : err instanceof Error
              ? err.message
              : 'Failed to equip accessory',
        );
      } finally {
        setEquipping(null);
      }
    },
    [unlockedAccessoryIds, effectiveEquipped, isOnline, refreshAvatarState],
  );

  if (loading) {
    return (
      <View testID="avatar-equip-screen" style={[styles.root, styles.centered]}>
        <SkeletonGrid
          testID="avatar-equip-loading"
          rows={3}
          columns={3}
          cardHeader
          cardLines={1}
          style={{ width: '100%', padding: 8 }}
        />
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
      <View style={[styles.previewSection, { backgroundColor: colors.sandLight }]}>
        {equipError && (
          <Text
            testID="avatar-equip-equip-error"
            style={[styles.equipErrorText, { color: colors.error }]}
          >
            {equipError}
          </Text>
        )}
        <AvatarDisplay
          size="lg"
          equippedAccessoryId={effectiveEquipped}
          testID="avatar-equip-preview"
        />
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
          const isEquipped = item.id === effectiveEquipped;
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
                  backgroundColor: colors.sandBase,
                  borderColor: isEquipped ? colors.mountainBlue : colors.espressoLight,
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
              <Text style={[styles.accessoryName, { color: colors.espresso }]} numberOfLines={1}>
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
                  style={[styles.costLabel, { color: colors.mutedBrown }]}
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
