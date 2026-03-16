import { WixAuthService } from '../wixAuth';

// Mock dependencies
jest.mock('../wixSdkClient', () => ({
  getWixSdkClient: () => ({
    auth: {
      getTokens: () => ({ refreshToken: 'rt_test', accessToken: 'at_test' }),
      renewToken: jest.fn().mockResolvedValue({ refreshToken: 'rt_new', accessToken: 'at_new' }),
      setTokens: jest.fn(),
      loggedIn: () => true,
    },
  }),
}));
jest.mock('../tokenStorage', () => ({
  saveTokens: jest.fn().mockResolvedValue(undefined),
  loadTokens: jest.fn(),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../crashReporting', () => ({
  captureException: jest.fn(),
}));
jest.mock('../../appleAuth', () => ({
  signInWithApple: jest.fn(),
}));

describe('Token refresh mutex', () => {
  it('deduplicates concurrent refresh calls', async () => {
    const auth = new WixAuthService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshSpy = jest.spyOn(auth as any, '_doRefresh');

    // Fire 5 concurrent refresh calls
    const results = await Promise.all([
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
      auth.refreshSession(),
    ]);

    // Should only call the underlying refresh ONCE
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // All callers get the same result
    results.forEach((r) => expect(r).toBe(true));
  });

  it('allows new refresh after previous completes', async () => {
    const auth = new WixAuthService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshSpy = jest.spyOn(auth as any, '_doRefresh');

    await auth.refreshSession();
    await auth.refreshSession();

    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });

  it('clears mutex on refresh failure so next call can retry', async () => {
    const auth = new WixAuthService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshSpy = jest.spyOn(auth as any, '_doRefresh');
    refreshSpy.mockRejectedValueOnce(new Error('Network error'));

    const result1 = await auth.refreshSession();
    expect(result1).toBe(false);

    refreshSpy.mockRestore();
    const result2 = await auth.refreshSession();
    expect(result2).toBe(true);
  });
});
