import { Platform } from 'react-native';
import { registerPushToken } from '../notifications';

const mockCallFn = jest.fn();

beforeEach(() => {
  mockCallFn.mockClear();
});

describe('registerPushToken', () => {
  it('sends memberId, token, and platform to Wix function endpoint', async () => {
    mockCallFn.mockResolvedValueOnce({ success: true });

    await registerPushToken('ExponentPushToken[abc123]', 'member-001', mockCallFn);

    expect(mockCallFn).toHaveBeenCalledWith(
      '/_functions/registerPushToken',
      'POST',
      expect.objectContaining({
        memberId: 'member-001',
        token: 'ExponentPushToken[abc123]',
        platform: Platform.OS,
      }),
    );
  });

  it('resolves on success', async () => {
    mockCallFn.mockResolvedValueOnce({ success: true });

    await expect(
      registerPushToken('ExponentPushToken[abc123]', 'member-001', mockCallFn),
    ).resolves.toBeUndefined();
  });

  it('propagates errors from the Wix function call', async () => {
    mockCallFn.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      registerPushToken('ExponentPushToken[abc123]', 'member-001', mockCallFn),
    ).rejects.toThrow('Network error');
  });

  it('calls the function endpoint exactly once', async () => {
    mockCallFn.mockResolvedValueOnce({ success: true });

    await registerPushToken('ExponentPushToken[abc123]', 'member-001', mockCallFn);

    expect(mockCallFn).toHaveBeenCalledTimes(1);
  });
});
