/**
 * Wix SDK client singleton for authentication.
 *
 * Separate from the REST-based wixClient.ts (Stores API).
 * Uses @wix/sdk OAuthStrategy for member login/register/OAuth flows.
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { members } from '@wix/members';

const CLIENT_ID = process.env.EXPO_PUBLIC_WIX_CLIENT_ID ?? '';

type WixSdkClient = ReturnType<typeof createClient>;

let client: WixSdkClient | null = null;

export function getWixSdkClient(): WixSdkClient {
  if (!client) {
    client = createClient({
      modules: { members },
      auth: OAuthStrategy({ clientId: CLIENT_ID }),
    });
  }
  return client;
}

export function resetWixSdkClient(): void {
  client = null;
}
