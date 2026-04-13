import { generateReferralLink, recordReferralConversion } from '../referralService';

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

const mockCallFunction = jest.fn();

beforeEach(() => jest.clearAllMocks());

it('generateReferralLink calls Wix and returns deep link URL', async () => {
  mockCallFunction.mockResolvedValue({ code: 'ABC123' });
  const link = await generateReferralLink(mockCallFunction, 'member-1');
  expect(link).toBe('carolinafutons://referral/ABC123');
  expect(mockCallFunction).toHaveBeenCalledWith('/_functions/generateReferralLink', 'POST', {
    memberId: 'member-1',
  });
});

it('generateReferralLink returns null on error without throwing', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  const link = await generateReferralLink(mockCallFunction, 'member-1');
  expect(link).toBeNull();
});

it('recordReferralConversion calls Wix record endpoint', async () => {
  mockCallFunction.mockResolvedValue({ success: true });
  await recordReferralConversion(mockCallFunction, 'ABC123', 'new-member-1');
  expect(mockCallFunction).toHaveBeenCalledWith('/_functions/recordReferralConversion', 'POST', {
    code: 'ABC123',
    newMemberId: 'new-member-1',
  });
});

it('recordReferralConversion does not throw on Wix error', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  await expect(
    recordReferralConversion(mockCallFunction, 'ABC123', 'new-member-1'),
  ).resolves.not.toThrow();
});

it('generateReferralLink captures exception on error', async () => {
  const { captureException } = require('@/services/crashReporting');
  mockCallFunction.mockRejectedValue(new Error('timeout'));
  await generateReferralLink(mockCallFunction, 'member-1');
  expect(captureException).toHaveBeenCalled();
});
