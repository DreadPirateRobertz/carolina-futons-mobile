import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { captureException } from '@/services/crashReporting';
import { version as appVersion } from '../../package.json';

interface WixClientLike {
  callFunction: (path: string, method: 'GET' | 'POST', body?: unknown) => Promise<unknown>;
}

export async function registerDeviceToken(client: WixClientLike): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await client.callFunction('/_functions/registerPushToken', 'POST', {
      token,
      platform: Platform.OS,
      appVersion,
      registeredAt: Date.now(),
    });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function deregisterDeviceToken(client: WixClientLike): Promise<void> {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await client.callFunction('/_functions/deregisterPushToken', 'POST', { token });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)));
  }
}
