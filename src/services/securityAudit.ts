/**
 * @module securityAudit
 *
 * Runtime audit of AsyncStorage keys — cm-keo.
 *
 * Scans all AsyncStorage keys at startup for patterns that suggest sensitive
 * data (tokens, secrets, passwords, API keys) that should instead live in
 * expo-secure-store (Keychain/Keystore).
 *
 * runSecurityAudit() is called once at app startup (via App.tsx) and reports
 * violations to crash reporting as a warning-level event. It never throws.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

// Keys that look sensitive but are explicitly known to be safe:
// - cf_session_token: a non-secret UUID v4 (no auth value if stolen)
const ALLOWLISTED_KEYS = new Set(['cf_session_token']);

// Patterns that indicate a key might hold sensitive data
const SENSITIVE_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /apikey/i,
  /api_key/i,
  /bearer/i,
  /credential/i,
  /private.*key/i,
];

function isSuspiciousKey(key: string): boolean {
  if (ALLOWLISTED_KEYS.has(key)) return false;
  return SENSITIVE_PATTERNS.some((re) => re.test(key));
}

export interface AuditResult {
  clean: boolean;
  violations: string[];
  error?: string;
}

/**
 * Reads all AsyncStorage keys and returns a report of suspicious ones.
 * Never throws — errors are returned in the result.error field.
 */
export async function auditAsyncStorage(): Promise<AuditResult> {
  let keys: readonly string[];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch (err) {
    return {
      clean: true,
      violations: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const violations = keys.filter(isSuspiciousKey);
  return { clean: violations.length === 0, violations };
}

/**
 * Runs the AsyncStorage audit and reports violations to crash reporting.
 * Called once at startup. Errors are swallowed — never blocks app launch.
 */
export async function runSecurityAudit(): Promise<void> {
  try {
    const result = await auditAsyncStorage();
    if (!result.clean) {
      captureException(
        new Error(
          `[SecurityAudit] Sensitive keys detected in AsyncStorage: ${result.violations.join(', ')}`,
        ),
        'warning',
        { violations: result.violations.join(', ') },
      );
    }
  } catch {
    // Non-blocking — never prevent app startup
  }
}
