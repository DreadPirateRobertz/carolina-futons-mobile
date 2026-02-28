import { createClient, OAuthStrategy } from '@wix/sdk';
import { members } from '@wix/members';

const CLIENT_ID = process.env.EXPO_PUBLIC_WIX_CLIENT_ID ?? '';

type WixClient = ReturnType<typeof createClient>;

let client: WixClient | null = null;

export function getWixClient(): WixClient {
  if (!client) {
    client = createClient({
      modules: { members },
      auth: OAuthStrategy({ clientId: CLIENT_ID }),
    });
  }
  return client;
}

export function resetWixClient(): void {
  client = null;
}
