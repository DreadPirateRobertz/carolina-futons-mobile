/**
 * @module useAddressBook
 *
 * Manages saved shipping addresses for returning customers.
 * Persists to AsyncStorage. Supports add, edit, delete, and set-default.
 * Max 5 saved addresses. Auto-saves addresses from successful checkouts.
 */
import { useState, useEffect, useCallback } from 'react';
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

export function useAddressBook(): AddressBookState {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setAddresses(JSON.parse(stored));
        }
      } catch {
        // Ignore load errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const _persist = useCallback(async (updated: SavedAddress[]) => {
    setAddresses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addAddress = useCallback(async (address: Omit<SavedAddress, 'id' | 'isDefault'>) => {
    setAddresses((prev) => {
      const isFirst = prev.length === 0;
      const newAddr: SavedAddress = { ...address, id: generateId(), isDefault: isFirst };
      const updated = [...prev, newAddr].slice(-MAX_ADDRESSES);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateAddress = useCallback(
    async (id: string, updates: Partial<Omit<SavedAddress, 'id'>>) => {
      setAddresses((prev) => {
        const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const deleteAddress = useCallback(async (id: string) => {
    setAddresses((prev) => {
      let updated = prev.filter((a) => a.id !== id);
      // If deleted was default and others remain, promote first
      if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
        updated = [{ ...updated[0], isDefault: true }, ...updated.slice(1)];
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setDefault = useCallback(async (id: string) => {
    setAddresses((prev) => {
      const updated = prev.map((a) => ({ ...a, isDefault: a.id === id }));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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
      setAddresses((prev) => {
        // Don't save duplicates (match on line1 + zip)
        const exists = prev.some((a) => a.line1 === address.line1 && a.zip === address.zip);
        if (exists) return prev;

        const isFirst = prev.length === 0;
        const newAddr: SavedAddress = { ...address, id: generateId(), isDefault: isFirst };
        const updated = [...prev, newAddr].slice(-MAX_ADDRESSES);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [],
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
