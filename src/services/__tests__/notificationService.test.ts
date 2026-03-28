import { captureException } from '@/services/crashReporting';

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

import * as Notifications from 'expo-notifications';
import {
  registerDeviceToken,
  deregisterDeviceToken,
} from '../notificationService';

const mockWixClient = {
  callFunction: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('registerDeviceToken calls Wix registerPushToken endpoint', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockResolvedValue({ success: true });

  await registerDeviceToken(mockWixClient as never);

  expect(mockWixClient.callFunction).toHaveBeenCalledWith(
    '/_functions/registerPushToken',
    'POST',
    expect.objectContaining({ token: 'ExponentPushToken[abc123]' }),
  );
});

it('registerDeviceToken does not throw on Wix error', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockRejectedValue(new Error('network'));

  await expect(registerDeviceToken(mockWixClient as never)).resolves.not.toThrow();
  expect(captureException).toHaveBeenCalled();
});

it('deregisterDeviceToken calls Wix deregisterPushToken endpoint', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockResolvedValue({ success: true });

  await deregisterDeviceToken(mockWixClient as never);

  expect(mockWixClient.callFunction).toHaveBeenCalledWith(
    '/_functions/deregisterPushToken',
    'POST',
    expect.objectContaining({ token: 'ExponentPushToken[abc123]' }),
  );
});

it('deregisterDeviceToken does not throw on Wix error', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
    data: 'ExponentPushToken[abc123]',
  });
  mockWixClient.callFunction.mockRejectedValue(new Error('network'));

  await expect(deregisterDeviceToken(mockWixClient as never)).resolves.not.toThrow();
  expect(captureException).toHaveBeenCalled();
});

it('registerDeviceToken does not throw when getExpoPushTokenAsync fails', async () => {
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(new Error('device error'));

  await expect(registerDeviceToken(mockWixClient as never)).resolves.not.toThrow();
  expect(captureException).toHaveBeenCalled();
});
