/**
 * @module useSwatchRequest.test
 *
 * TDD tests for the useSwatchRequest hook — manages fabric swatch sample
 * requests. Users select up to 3 fabrics and provide a shipping address.
 */
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSwatchRequest } from '../useSwatchRequest';
import type { Fabric } from '@/data/futons';
import * as Haptics from 'expo-haptics';
import { events } from '@/services/analytics';

// Must mock before importing hook
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@/services/analytics', () => ({
  events: {
    requestSwatches: jest.fn(),
  },
}));

const mockFabrics: Fabric[] = [
  { id: 'natural-linen', name: 'Natural Linen', color: '#D4C5A9', price: 0 },
  { id: 'slate-gray', name: 'Slate Gray', color: '#6B7B8D', price: 0 },
  { id: 'mountain-blue', name: 'Mountain Blue', color: '#5B8FA8', price: 29 },
  { id: 'sunset-coral', name: 'Sunset Coral', color: '#E8845C', price: 29 },
];

const validAddress = {
  fullName: 'Jane Doe',
  line1: '123 Main St',
  line2: '',
  city: 'Asheville',
  state: 'NC',
  zip: '28801',
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('useSwatchRequest', () => {
  describe('fabric selection', () => {
    it('starts with no fabrics selected', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      expect(result.current.selectedFabrics).toEqual([]);
    });

    it('toggles a fabric on', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      expect(result.current.selectedFabrics).toEqual([mockFabrics[0]]);
    });

    it('toggles a fabric off', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      expect(result.current.selectedFabrics).toEqual([]);
    });

    it('enforces max 3 fabric selections', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[1]));
      act(() => result.current.toggleFabric(mockFabrics[2]));
      act(() => result.current.toggleFabric(mockFabrics[3]));
      expect(result.current.selectedFabrics).toHaveLength(3);
      expect(result.current.selectedFabrics).not.toContainEqual(mockFabrics[3]);
    });

    it('allows removing a fabric when at max to make room', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[1]));
      act(() => result.current.toggleFabric(mockFabrics[2]));
      // Remove one
      act(() => result.current.toggleFabric(mockFabrics[1]));
      expect(result.current.selectedFabrics).toHaveLength(2);
      // Now can add a new one
      act(() => result.current.toggleFabric(mockFabrics[3]));
      expect(result.current.selectedFabrics).toHaveLength(3);
      expect(result.current.selectedFabrics).toContainEqual(mockFabrics[3]);
    });

    it('clears all selected fabrics', () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[1]));
      act(() => result.current.clearSelection());
      expect(result.current.selectedFabrics).toEqual([]);
    });
  });

  describe('submission', () => {
    it('submits successfully with valid data', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(true);
      });

      expect(result.current.status).toBe('submitted');
    });

    it('fires haptic success feedback on submission', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('fires analytics event on submission', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[1]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(events.requestSwatches).toHaveBeenCalledWith(
        'prod-asheville',
        expect.arrayContaining(['natural-linen', 'slate-gray']),
        'NC',
      );
    });

    it('persists request to AsyncStorage', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@carolina_futons_swatch_requests',
        expect.any(String),
      );
    });

    it('rejects submission with no fabrics selected', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('idle');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );
    });

    it('rejects submission with missing address fields', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      const incompleteAddress = { ...validAddress, fullName: '' };

      await act(async () => {
        const success = await result.current.submitRequest(incompleteAddress);
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('idle');
    });

    it('rejects submission with invalid zip code', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      const badZip = { ...validAddress, zip: 'abc' };

      await act(async () => {
        const success = await result.current.submitRequest(badZip);
        expect(success).toBe(false);
      });

      expect(result.current.validationErrors).toContain('zip');
    });

    it('fires haptic error feedback on validation failure', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      // No fabrics selected

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );
    });

    it('is not submitting after request completes', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.status).toBe('submitted');
    });
  });

  describe('rate limiting', () => {
    it('prevents duplicate requests for same product within 24h', async () => {
      const existingRequest = JSON.stringify([
        {
          productId: 'prod-asheville',
          fabricIds: ['natural-linen'],
          timestamp: Date.now() - 1000, // 1 second ago
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(existingRequest);

      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));

      // Wait for async load
      await act(async () => {});

      expect(result.current.hasRecentRequest).toBe(true);
    });

    it('allows request if previous was more than 24h ago', async () => {
      const oldRequest = JSON.stringify([
        {
          productId: 'prod-asheville',
          fabricIds: ['natural-linen'],
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(oldRequest);

      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));

      await act(async () => {});

      expect(result.current.hasRecentRequest).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles AsyncStorage read failure gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));

      await act(async () => {});

      expect(result.current.selectedFabrics).toEqual([]);
      expect(result.current.status).toBe('idle');
    });

    it('handles AsyncStorage write failure gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('error');
    });

    it('resets error state on retry', async () => {
      (AsyncStorage.setItem as jest.Mock)
        .mockRejectedValueOnce(new Error('Write error'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });
      expect(result.current.status).toBe('error');

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(true);
      });
      expect(result.current.status).toBe('submitted');
    });
  });

  describe('reset', () => {
    it('resets all state', async () => {
      const { result } = renderHook(() => useSwatchRequest('prod-asheville'));
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      act(() => result.current.reset());

      expect(result.current.selectedFabrics).toEqual([]);
      expect(result.current.status).toBe('idle');
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
