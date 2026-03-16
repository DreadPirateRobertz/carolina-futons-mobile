import { storeDeviceToken, sendTestPush } from '../pushService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
}));

// Mock fetch for push send
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { status: 'ok' } }),
  });
});

describe('storeDeviceToken', () => {
  it('stores device token with valid Expo format', async () => {
    const result = await storeDeviceToken({
      userId: 'user-123',
      pushToken: 'ExponentPushToken[xxxxxx]',
      platform: 'ios',
    });

    expect(result.stored).toBe(true);
  });

  it('rejects invalid Expo push tokens', async () => {
    await expect(
      storeDeviceToken({
        userId: 'user-123',
        pushToken: 'invalid-token',
        platform: 'ios',
      }),
    ).rejects.toThrow(/invalid.*token/i);
  });

  it('accepts Android platform tokens', async () => {
    const result = await storeDeviceToken({
      userId: 'user-456',
      pushToken: 'ExponentPushToken[yyyyyy]',
      platform: 'android',
    });

    expect(result.stored).toBe(true);
  });
});

describe('sendTestPush', () => {
  it('sends test push to registered token', async () => {
    const result = await sendTestPush({
      pushToken: 'ExponentPushToken[xxxxxx]',
      title: 'Test',
      body: 'Hello from spike',
    });

    expect(result.sent).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('includes custom data in push payload', async () => {
    await sendTestPush({
      pushToken: 'ExponentPushToken[xxxxxx]',
      title: 'Order Update',
      body: 'Your order shipped!',
      data: { orderId: 'ord-123', screen: 'OrderDetail' },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data).toEqual({ orderId: 'ord-123', screen: 'OrderDetail' });
  });

  it('throws on push API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      sendTestPush({
        pushToken: 'ExponentPushToken[xxxxxx]',
        title: 'Test',
        body: 'Should fail',
      }),
    ).rejects.toThrow(/push send failed/i);
  });

  it('validates token format before sending', async () => {
    await expect(
      sendTestPush({
        pushToken: 'bad-token',
        title: 'Test',
        body: 'Should fail',
      }),
    ).rejects.toThrow(/invalid.*token/i);
  });
});
