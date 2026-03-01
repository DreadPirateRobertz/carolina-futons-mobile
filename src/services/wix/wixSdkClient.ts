/**
 * Wix SDK client singleton for authentication.
 *
 * Separate from the REST-based wixClient.ts (Stores API).
 * Uses @wix/sdk OAuthStrategy for member login/register/OAuth flows.
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { members } from '@wix/members';

type WixSdkClient = ReturnType<typeof createClient>;

let client: WixSdkClient | null = null;

export function getWixSdkClient(): WixSdkClient {
  if (!client) {
    const key = 'EXPO_PUBLIC_WIX_CLIENT_ID';
    const clientId = process.env[key] ?? '';
    if (!clientId) {
      console.warn(
        'EXPO_PUBLIC_WIX_CLIENT_ID is not set — Wix auth will fail at runtime.',
      );
    }
    client = createClient({
      modules: { members },
      auth: OAuthStrategy({ clientId }),
    });
  }
  return client;
}

export function resetWixSdkClient(): void {
  client = null;
}
