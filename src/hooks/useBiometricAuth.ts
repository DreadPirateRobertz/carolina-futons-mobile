/**
 * @module useBiometricAuth
 *
 * Hook for biometric authentication (Face ID / Touch ID).
 * Checks hardware availability, manages the user's enrollment preference,
 * and triggers the native biometric prompt.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getBiometricStatus,
  authenticate,
  isBiometricEnabled,
  setBiometricEnabled,
  BiometricStatus,
} from '@/services/biometric';

interface UseBiometricAuthReturn {
  status: BiometricStatus;
  isEnabled: boolean;
  loading: boolean;
  authenticating: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  promptBiometric: (message?: string) => Promise<boolean>;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [status, setStatus] = useState<BiometricStatus>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: 'none',
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [bioStatus, enabled] = await Promise.all([
        getBiometricStatus(),
        isBiometricEnabled(),
      ]);
      if (!mounted) return;
      setStatus(bioStatus);
      setIsEnabled(enabled);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    const result = await authenticate('Enable biometric sign-in');
    if (result.success) {
      await setBiometricEnabled(true);
      setIsEnabled(true);
      return true;
    }
    return false;
  }, []);

  const disableBiometric = useCallback(async (): Promise<void> => {
    await setBiometricEnabled(false);
    setIsEnabled(false);
  }, []);

  const promptBiometric = useCallback(async (message?: string): Promise<boolean> => {
    setAuthenticating(true);
    try {
      const result = await authenticate(message);
      return result.success;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  return {
    status,
    isEnabled,
    loading,
    authenticating,
    enableBiometric,
    disableBiometric,
    promptBiometric,
  };
}
