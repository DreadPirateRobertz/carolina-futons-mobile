/**
 * @module useAccountDeletion
 *
 * Handles the account deletion flow: confirmation dialog, Wix Members API
 * deletion, clearing all local data (AsyncStorage + SecureStore), and
 * signing out. Required for GDPR/CCPA compliance.
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useWixClient } from '@/services/wix';
import { useAuth } from './useAuth';
import { captureException } from '@/services/crashReporting';

export type DeletionStatus = 'idle' | 'confirming' | 'deleting' | 'deleted' | 'error';

export interface AccountDeletionState {
  status: DeletionStatus;
  error: string | null;
  requestDeletion: () => void;
  confirmDeletion: () => Promise<void>;
  cancel: () => void;
}

const SECURE_STORE_KEYS = [
  'biometric_auth_enabled',
  'wix_auth_tokens',
  'google_session',
];

export function useAccountDeletion(): AccountDeletionState {
  const [status, setStatus] = useState<DeletionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const wixClient = useWixClient();
  const { user, signOut } = useAuth();

  const requestDeletion = useCallback(() => {
    setStatus('confirming');
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const confirmDeletion = useCallback(async () => {
    if (!user) return;

    setStatus('deleting');
    setError(null);

    try {
      // Delete member from Wix
      await wixClient.deleteMember(user.id);

      // Clear all local data
      await AsyncStorage.clear();
      for (const key of SECURE_STORE_KEYS) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // Key may not exist, ignore
        }
      }

      // Sign out
      signOut();
      setStatus('deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      setError(message);
      setStatus('error');
      captureException(err instanceof Error ? err : new Error(message));
    }
  }, [user, wixClient, signOut]);

  return { status, error, requestDeletion, confirmDeletion, cancel };
}
