/**
 * @module sommelierResults.test
 *
 * Tests for SommelierResults CMS service — read/write style quiz results.
 * Covers: happy path read, no results, API error, write success, write error.
 *
 * hq-5hnml
 */

import { getSommelierResults, recordSommelierResult } from '../sommelierResults';

const mockCallFunction = jest.fn();
const mockWixClient = { callFunction: mockCallFunction };

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockWixClient,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getSommelierResults', () => {
  it('fetches sommelier results for a member', async () => {
    mockCallFunction.mockResolvedValueOnce({
      topCategory: 'modern',
      flavors: ['minimalist', 'coastal'],
      recommendations: ['asheville-full-futon', 'blue-ridge-queen-futon'],
    });

    const result = await getSommelierResults('member-123');

    expect(mockCallFunction).toHaveBeenCalledWith('getSommelierResults', {
      memberId: 'member-123',
    });
    expect(result).toEqual({
      topCategory: 'modern',
      flavors: ['minimalist', 'coastal'],
      recommendations: ['asheville-full-futon', 'blue-ridge-queen-futon'],
    });
  });

  it('returns null when no results exist for member', async () => {
    mockCallFunction.mockResolvedValueOnce(null);

    const result = await getSommelierResults('member-no-quiz');
    expect(result).toBeNull();
  });

  it('returns null on API error', async () => {
    mockCallFunction.mockRejectedValueOnce(new Error('Network error'));

    const result = await getSommelierResults('member-123');
    expect(result).toBeNull();
  });

  it('returns null when wix client is unavailable', async () => {
    jest.resetModules();
    jest.doMock('@/services/wix/wixClientSingleton', () => ({
      getWixClientSingleton: () => null,
    }));

    // Re-import to pick up new mock
    const { getSommelierResults: getSR } = require('../sommelierResults');
    const result = await getSR('member-123');
    expect(result).toBeNull();
  });
});

describe('recordSommelierResult', () => {
  it('writes quiz results to CMS', async () => {
    mockCallFunction.mockResolvedValueOnce({ success: true });

    const answers = {
      roomType: 'living-room' as const,
      stylePreference: 'modern' as const,
      primaryUse: 'both' as const,
      sizeNeeds: 'queen' as const,
      budgetRange: '500-1000' as const,
    };

    const result = await recordSommelierResult('member-123', answers);

    expect(mockCallFunction).toHaveBeenCalledWith('recordSommelierResult', {
      memberId: 'member-123',
      quizAnswers: answers,
    });
    expect(result).toBe(true);
  });

  it('returns false on API error', async () => {
    mockCallFunction.mockRejectedValueOnce(new Error('Write failed'));

    const result = await recordSommelierResult('member-123', {
      roomType: 'dorm',
      stylePreference: 'rustic',
      primaryUse: 'sleeping',
      sizeNeeds: 'twin',
      budgetRange: 'under-500',
    });

    expect(result).toBe(false);
  });

  it('returns false when wix client is unavailable', async () => {
    jest.resetModules();
    jest.doMock('@/services/wix/wixClientSingleton', () => ({
      getWixClientSingleton: () => null,
    }));

    const { recordSommelierResult: recSR } = require('../sommelierResults');
    const result = await recSR('member-123', {
      roomType: 'office',
      stylePreference: 'classic',
      primaryUse: 'sitting',
      sizeNeeds: 'full',
      budgetRange: '1000-2000',
    });
    expect(result).toBe(false);
  });
});
