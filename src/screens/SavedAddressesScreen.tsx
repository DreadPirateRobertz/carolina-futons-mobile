/**
 * @module SavedAddressesScreen
 *
 * Dedicated screen for managing saved shipping addresses (cm-5yl).
 * Supports add, edit, delete, and set-default. Max 5 addresses.
 * Wix MemberAddresses sync is handled inside useSavedAddresses.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import type { SavedAddress } from '@/hooks/useAddressBook';

type FormMode = 'none' | 'add' | 'edit';

/** Standalone screen for add/edit/delete/default address management. */
export function SavedAddressesScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const {
    addresses,
    defaultAddress,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
  } = useSavedAddresses();

  const [formMode, setFormMode] = useState<FormMode>('none');
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const isAtMax = addresses.length >= 5;

  const handleAddPress = useCallback(() => {
    if (isAtMax) return;
    setEditingAddress(null);
    setFormMode('add');
  }, [isAtMax]);

  const handleEditPress = useCallback((addr: SavedAddress) => {
    setEditingAddress(addr);
    setFormMode('edit');
  }, []);

  const handleCancel = useCallback(() => {
    setFormMode('none');
    setEditingAddress(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: AddressFormValues) => {
      setSaving(true);
      try {
        if (formMode === 'add') {
          await addAddress(values);
        } else if (formMode === 'edit' && editingAddress) {
          await updateAddress(editingAddress.id, values);
        }
        setFormMode('none');
        setEditingAddress(null);
      } catch {
        // hook owns error state; form stays open for retry
      } finally {
        setSaving(false);
      }
    },
    [formMode, editingAddress, addAddress, updateAddress],
  );

  const handleDeletePress = useCallback(
    (addr: SavedAddress) => {
      Alert.alert('Delete Address', `Remove ${addr.line1}?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAddress(addr.id).catch(() => {
              // hook owns error state; screen stays visible
            });
          },
        },
      ]);
    },
    [deleteAddress],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        await setDefault(id);
      } catch {
        // hook owns error state; screen stays visible
      }
    },
    [setDefault],
  );

  if (loading) {
    return (
      <View style={styles.centered} testID="saved-addresses-loading">
        <ActivityIndicator color={colors.mountainBlue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      testID="saved-addresses-screen"
    >
      {/* Header row: title + add button */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.espresso }]}>Saved Addresses</Text>
        <TouchableOpacity
          testID="add-address-button"
          onPress={handleAddPress}
          disabled={isAtMax}
          accessibilityRole="button"
          accessibilityLabel="Add new address"
          accessibilityState={{ disabled: isAtMax }}
          style={[
            styles.addButton,
            {
              backgroundColor: isAtMax ? colors.overlay : colors.mountainBlue,
              borderRadius: borderRadius.button,
            },
          ]}
        >
          <Text style={styles.addButtonText}>{isAtMax ? 'Max reached' : '+ Add Address'}</Text>
        </TouchableOpacity>
      </View>

      {/* Inline form (add or edit) */}
      {formMode !== 'none' && (
        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.sandDark, borderRadius: borderRadius.lg },
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.espresso }]}>
            {formMode === 'add' ? 'New Address' : 'Edit Address'}
          </Text>
          <AddressForm
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            initialValues={editingAddress ?? undefined}
            saving={saving}
          />
        </View>
      )}

      {/* Address list */}
      {formMode === 'none' && (
        <>
          {addresses.length === 0 ? (
            <View style={styles.emptyState} testID="saved-addresses-empty">
              <Text style={[styles.emptyText, { color: colors.espressoLight }]}>
                No saved addresses yet. Add one to speed up checkout.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {addresses.map((addr) => (
                <View
                  key={addr.id}
                  testID={`address-item-${addr.id}`}
                  style={[
                    styles.addressCard,
                    {
                      backgroundColor: colors.sandDark,
                      borderRadius: borderRadius.lg,
                      borderColor: addr.isDefault ? colors.mountainBlue : colors.overlay,
                    },
                  ]}
                >
                  {/* Default badge */}
                  {addr.isDefault && (
                    <View
                      testID={`address-default-badge-${addr.id}`}
                      style={[
                        styles.defaultBadge,
                        { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.sm },
                      ]}
                    >
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}

                  {/* Address details */}
                  <Text style={[styles.addressName, { color: colors.espresso }]}>
                    {addr.fullName}
                  </Text>
                  <Text style={[styles.addressLine, { color: colors.espressoLight }]}>
                    {addr.line2 ? `${addr.line1}, ${addr.line2}` : addr.line1}
                  </Text>
                  <Text style={[styles.addressLine, { color: colors.espressoLight }]}>
                    {addr.city}, {addr.state} {addr.zip}
                  </Text>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      testID={`edit-button-${addr.id}`}
                      onPress={() => handleEditPress(addr)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit address ${addr.line1}`}
                      accessibilityHint="Opens a form to modify this address"
                    >
                      <Text style={[styles.actionText, { color: colors.mountainBlue }]}>Edit</Text>
                    </TouchableOpacity>

                    {!addr.isDefault && (
                      <TouchableOpacity
                        testID={`set-default-button-${addr.id}`}
                        onPress={() => handleSetDefault(addr.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set ${addr.line1} as default shipping address`}
                        accessibilityHint="Makes this the default address used at checkout"
                      >
                        <Text style={[styles.actionText, { color: colors.mountainBlue }]}>
                          Set Default
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      testID={`delete-button-${addr.id}`}
                      onPress={() => handleDeletePress(addr)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete address ${addr.line1}`}
                      accessibilityHint="Opens a confirmation before deleting"
                    >
                      <Text style={[styles.actionText, { color: colors.sunsetCoral }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {isAtMax && (
            <Text
              testID="address-max-notice"
              style={[styles.maxNotice, { color: colors.espressoLight }]}
            >
              Maximum of 5 addresses saved. Delete one to add another.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    padding: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  addressCard: {
    padding: 14,
    borderWidth: 1.5,
    gap: 3,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
  },
  addressLine: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  maxNotice: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
