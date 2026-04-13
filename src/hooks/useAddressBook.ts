/**
 * @module useAddressBook
 *
 * Manages saved shipping addresses for returning customers.
 * Persists to AsyncStorage. Supports add, edit, delete, and set-default.
 * Max 5 saved addresses. Auto-saves addresses from successful checkouts.
 *
 * Optional wixSync callback (cm-v54): when provided, fire-and-forget syncs
 * the full address array to Wix member contact after each local mutation.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_addresses';
const MAX_ADDRESSES = 5;

export interface SavedAddress {
  id: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface AddressBookOptions {
  /**
   * Optional callback to sync the full address list with an external store
   * (e.g., Wix member contacts API). Called fire-and-forget after each
   * local mutation. Failures are swallowed to keep local state authoritative.
   */
  wixSync?: (addresses: SavedAddress[]) => Promise<void>;
}

export interface AddressBookState {
  addresses: SavedAddress[];
  defaultAddress: SavedAddress | null;
  loading: boolean;
  addAddress: (address: Omit<SavedAddress, 'id' | 'isDefault'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Omit<SavedAddress, 'id'>>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  saveFromCheckout: (address: {
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
  }) => Promise<void>;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function useAddressBook(options?: AddressBookOptions): AddressBookState {
  const { wixSync } = options ?? {};
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  // Keep a ref in sync so callbacks can read latest without depending on
  // React's state-updater scheduling (React 19 may defer updater callbacks).
  const addressesRef = useRef(addresses);
  addressesRef.current = addresses;

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAddresses(parsed);
          addressesRef.current = parsed;
        }
      } catch {
        // Ignore load errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addAddress = useCallback(
    async (address: Omit<SavedAddress, 'id' | 'isDefault'>) => {
      const prev = addressesRef.current;
      const isFirst = prev.length === 0;
      const newAddr: SavedAddress = {
        ...address,
        id: generateId(),
        isDefault: isFirst,
      };
      const computed = [...prev, newAddr].slice(-MAX_ADDRESSES);
      addressesRef.current = computed;
      setAddresses(computed);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(computed));
      if (wixSync) {
        wixSync(computed).catch(() => {});
      }
    },
    [wixSync],
  );

  const updateAddress = useCallback(
    async (id: string, updates: Partial<Omit<SavedAddress, 'id'>>) => {
      const computed = addressesRef.current.map((a) => (a.id === id ? { ...a, ...updates } : a));
      addressesRef.current = computed;
      setAddresses(computed);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(computed));
      if (wixSync) {
        wixSync(computed).catch(() => {});
      }
    },
    [wixSync],
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      let updated = addressesRef.current.filter((a) => a.id !== id);
      if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
        updated = [{ ...updated[0], isDefault: true }, ...updated.slice(1)];
      }
      addressesRef.current = updated;
      setAddresses(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (wixSync) {
        wixSync(updated).catch(() => {});
      }
    },
    [wixSync],
  );

  const setDefault = useCallback(async (id: string) => {
    const updated = addressesRef.current.map((a) => ({ ...a, isDefault: a.id === id }));
    addressesRef.current = updated;
    setAddresses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const saveFromCheckout = useCallback(
    async (address: {
      fullName: string;
      line1: string;
      line2: string;
      city: string;
      state: string;
      zip: string;
    }) => {
      const prev = addressesRef.current;
      const exists = prev.some((a) => a.line1 === address.line1 && a.zip === address.zip);
      if (exists) return;

      const isFirst = prev.length === 0;
      const newAddr: SavedAddress = { ...address, id: generateId(), isDefault: isFirst };
      const updated = [...prev, newAddr].slice(-MAX_ADDRESSES);
      addressesRef.current = updated;
      setAddresses(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (wixSync) {
        wixSync(updated).catch(() => {});
      }
    },
    [wixSync],
  );

  const defaultAddress = addresses.find((a) => a.isDefault) ?? null;

  return {
    addresses,
    defaultAddress,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    saveFromCheckout,
  };
}
