import { renderHook, act } from '@testing-library/react-native';
import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useDataExport } from '../useDataExport';

jest.mock('@/services/wix', () => ({
  useWixClient: () => ({
    queryOrders: jest.fn().mockResolvedValue({
      orders: [{ id: 'order-1', total: 349 }],
    }),
  }),
}));

jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', displayName: 'Test User', phone: '555-1234', provider: 'email' },
  }),
}));

jest.mock('../useCart', () => ({
  useCart: () => ({
    items: [
      {
        id: 'asheville-full:natural-linen',
        model: { name: 'The Asheville' },
        fabric: { name: 'Natural Linen' },
        quantity: 1,
        unitPrice: 349,
      },
    ],
  }),
}));

jest.mock('../useWishlist', () => ({
  useWishlist: () => ({
    items: [
      { productId: 'blue-ridge-queen', name: 'The Blue Ridge', addedAt: '2026-03-01' },
    ],
  }),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as { OS: string }).OS = 'ios';
});

describe('useDataExport', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useDataExport());
    expect(result.current.status).toBe('idle');
  });

  it('exports data as JSON file on native', async () => {
    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.exportData();
    });

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [filePath, content] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(filePath).toContain('carolina-futons-data-');
    expect(filePath).toContain('.json');

    const parsed = JSON.parse(content);
    expect(parsed.profile.email).toBe('test@example.com');
    expect(parsed.orders).toHaveLength(1);
    expect(parsed.cart).toHaveLength(1);
    expect(parsed.wishlist).toHaveLength(1);
    expect(parsed.exportDate).toBeDefined();

    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });

  it('uses Share API on web', async () => {
    (Platform as { OS: string }).OS = 'web';

    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.exportData();
    });

    expect(Share.share).toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });

  it('sets error on failure', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockRejectedValueOnce(new Error('Share failed'));

    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.exportData();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Share failed');
  });
});
