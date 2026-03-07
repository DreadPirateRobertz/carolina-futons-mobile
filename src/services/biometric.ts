/**
 * @module biometric
 *
 * Biometric authentication service wrapping expo-local-authentication.
 * Handles Face ID / Touch ID enrollment preference persistence via
 * expo-secure-store and provides a clean API for the rest of the app.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export type BiometricType = 'facial' | 'fingerprint' | 'iris' | 'none';

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType;
}

function mapAuthType(types: LocalAuthentication.AuthenticationType[]): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'facial';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'none';
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return {
    isAvailable,
    isEnrolled,
    biometricType: mapAuthType(types),
  };
}

export async function authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage ?? 'Sign in to Carolina Futons',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  if (result.success) {
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}
