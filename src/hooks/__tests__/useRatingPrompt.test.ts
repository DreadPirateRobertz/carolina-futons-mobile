import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useRatingPrompt } from '../useRatingPrompt';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/analytics', () => ({
  events: { rateApp: jest.fn() },
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockIsAvailable = StoreReview.isAvailableAsync as jest.Mock;
const mockRequestReview = StoreReview.requestReview as jest.Mock;

let appStateCallback: ((state: string) => void) | null = null;
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
  appStateCallback = handler as (state: string) => void;
  return { remove: mockRemove } as any;
});

beforeEach(() => {
  jest.clearAllMocks();
  appStateCallback = null;
  mockGetItem.mockResolvedValue(null);
  mockIsAvailable.mockResolvedValue(true);
  mockRequestReview.mockResolvedValue(undefined);
});

async function renderLoaded() {
  const hook = renderHook(() => useRatingPrompt());
  await act(async () => {});
  return hook;
}

describe('useRatingPrompt', () => {
  it('initializes with default state when no stored data', async () => {
    const { result } = await renderLoaded();
    expect(result.current.disabled).toBe(false);
  });

  it('loads persisted state from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ purchaseCount: 2, appOpenCount: 5, lastPromptedAt: null, disabled: true }),
    );
    const { result } = await renderLoaded();
    expect(result.current.disabled).toBe(true);
  });

  it('handles corrupted storage gracefully', async () => {
    mockGetItem.mockResolvedValue('not-json');
    const { result } = await renderLoaded();
    expect(result.current.disabled).toBe(false);
  });

  describe('recordPurchase', () => {
    it('does not prompt before 3rd purchase', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it('prompts on 3rd purchase', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).toHaveBeenCalledTimes(1);
    });

    it('does not prompt if disabled', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.toggleDisabled();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it('does not prompt within 90-day cooldown', async () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          purchaseCount: 2,
          appOpenCount: 0,
          lastPromptedAt: recentTimestamp,
          disabled: false,
        }),
      );
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it('prompts again after cooldown expires', async () => {
      const oldTimestamp = Date.now() - 91 * 24 * 60 * 60 * 1000; // 91 days ago
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          purchaseCount: 2,
          appOpenCount: 0,
          lastPromptedAt: oldTimestamp,
          disabled: false,
        }),
      );
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).toHaveBeenCalledTimes(1);
    });

    it('does not prompt when StoreReview is unavailable', async () => {
      mockIsAvailable.mockResolvedValue(false);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });
      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it('persists purchase count to AsyncStorage', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.recordPurchase();
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        '@cfutons/rating_prompt',
        expect.stringContaining('"purchaseCount":1'),
      );
    });
  });

  describe('app open tracking', () => {
    it('registers AppState listener on mount', async () => {
      await renderLoaded();
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('increments app open count on foreground', async () => {
      await renderLoaded();

      await act(async () => {
        appStateCallback?.('active');
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        '@cfutons/rating_prompt',
        expect.stringContaining('"appOpenCount":1'),
      );
    });

    it('prompts on 7th app open', async () => {
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          purchaseCount: 0,
          appOpenCount: 6,
          lastPromptedAt: null,
          disabled: false,
        }),
      );
      await renderLoaded();

      await act(async () => {
        appStateCallback?.('active');
      });

      expect(mockRequestReview).toHaveBeenCalledTimes(1);
    });

    it('does not prompt on background state changes', async () => {
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          purchaseCount: 0,
          appOpenCount: 6,
          lastPromptedAt: null,
          disabled: false,
        }),
      );
      await renderLoaded();

      await act(async () => {
        appStateCallback?.('background');
      });

      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it('cleans up AppState listener on unmount', async () => {
      const { unmount } = await renderLoaded();
      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('toggleDisabled', () => {
    it('toggles disabled state', async () => {
      const { result } = await renderLoaded();
      expect(result.current.disabled).toBe(false);

      await act(async () => {
        await result.current.toggleDisabled();
      });
      expect(result.current.disabled).toBe(true);

      await act(async () => {
        await result.current.toggleDisabled();
      });
      expect(result.current.disabled).toBe(false);
    });

    it('persists disabled state to AsyncStorage', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.toggleDisabled();
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        '@cfutons/rating_prompt',
        expect.stringContaining('"disabled":true'),
      );
    });
  });
});
