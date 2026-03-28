import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedFitScore,
  setCachedFitScore,
  getCachedSommelierResult,
  setCachedSommelierResult,
  invalidatePersonalizationCache,
} from '../personalizationCache';

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

it('getCachedFitScore returns null when nothing cached', async () => {
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toBeNull();
});

it('getCachedFitScore returns null when cache is expired', async () => {
  const expired = { score: 88, reasons: [], cachedAt: Date.now() - HOUR_MS - 1 };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'prod-1_member-1': expired }),
  );
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toBeNull();
});

it('getCachedFitScore returns value within TTL', async () => {
  const fresh = { score: 92, reasons: ['firm', 'queen'], cachedAt: Date.now() - 1000 };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'prod-1_member-1': fresh }),
  );
  const result = await getCachedFitScore('prod-1', 'member-1');
  expect(result).toEqual({ score: 92, reasons: ['firm', 'queen'] });
});

it('setCachedFitScore writes with timestamp', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  await setCachedFitScore('prod-1', 'member-1', { score: 75, reasons: [] });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    '@cf_fit_score_cache',
    expect.stringContaining('"score":75'),
  );
});

it('getCachedSommelierResult returns null when nothing cached', async () => {
  const result = await getCachedSommelierResult('member-1');
  expect(result).toBeNull();
});

it('getCachedSommelierResult returns null when expired', async () => {
  const expired = {
    memberId: 'member-1', topStyle: 'Modern', flavors: [], recommendations: [],
    cachedAt: Date.now() - HOUR_MS - 1,
  };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'member-1': expired }),
  );
  const result = await getCachedSommelierResult('member-1');
  expect(result).toBeNull();
});

it('getCachedSommelierResult returns value within TTL without cachedAt field', async () => {
  const fresh = {
    memberId: 'member-1', topStyle: 'Cozy', flavors: ['soft'], recommendations: [],
    cachedAt: Date.now() - 1000,
  };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ 'member-1': fresh }),
  );
  const result = await getCachedSommelierResult('member-1');
  expect(result).not.toBeNull();
  expect(result).not.toHaveProperty('cachedAt'); // cachedAt stripped from returned value
  expect(result?.topStyle).toBe('Cozy');
});

it('invalidatePersonalizationCache removes both cache keys', async () => {
  await invalidatePersonalizationCache();
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cf_fit_score_cache');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cf_sommelier_cache');
});

it('does not throw when AsyncStorage fails', async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
  await expect(getCachedFitScore('prod-1', 'member-1')).resolves.toBeNull();
});
