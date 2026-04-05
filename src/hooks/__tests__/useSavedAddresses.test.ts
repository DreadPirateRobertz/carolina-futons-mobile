import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSavedAddresses } from '../useSavedAddresses';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;

const mockSyncMemberAddresses = jest.fn();
jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({
    syncMemberAddresses: mockSyncMemberAddresses,
  })),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Shared fixtures ────────────────────────────────────────────────────────────

const TEST_ADDRESS = {
  fullName: 'Ripley Test',
  line1: '42 Futon Lane',
  line2: '',
  city: 'Asheville',
  state: 'NC',
  zip: '28801',
};

const AUTHENTICATED_USER = { id: 'member-abc', email: 'ripley@test.com', displayName: 'Ripley' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockUseAuth.mockReturnValue({ user: AUTHENTICATED_USER, loading: false, isAuthenticated: true });
});

// ── Delegation to useAddressBook ───────────────────────────────────────────────

describe('useSavedAddresses — delegation', () => {
  it('returns addresses, defaultAddress, and loading', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    expect(result.current.addresses).toEqual([]);
    expect(result.current.defaultAddress).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('adds an address and marks first as default', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].isDefault).toBe(true);
    expect(result.current.defaultAddress?.fullName).toBe('Ripley Test');
  });

  it('updates an address', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    const id = result.current.addresses[0].id;

    await act(async () => {
      await result.current.updateAddress(id, { fullName: 'Updated Name' });
    });

    expect(result.current.addresses[0].fullName).toBe('Updated Name');
  });

  it('deletes an address and auto-promotes next as default', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
      await result.current.addAddress({ ...TEST_ADDRESS, line1: '99 Oak St', zip: '28802' });
    });

    const firstId = result.current.addresses[0].id;

    await act(async () => {
      await result.current.deleteAddress(firstId);
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].isDefault).toBe(true);
  });

  it('sets a non-default address as default', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
      await result.current.addAddress({ ...TEST_ADDRESS, line1: '99 Oak St', zip: '28802' });
    });

    const secondId = result.current.addresses[1].id;

    await act(async () => {
      await result.current.setDefault(secondId);
    });

    expect(result.current.addresses[0].isDefault).toBe(false);
    expect(result.current.addresses[1].isDefault).toBe(true);
  });

  it('enforces max 5 addresses', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await result.current.addAddress({ ...TEST_ADDRESS, line1: `${i} Street`, zip: `2880${i}` });
      });
    }

    expect(result.current.addresses.length).toBeLessThanOrEqual(5);
  });

  it('saveFromCheckout skips duplicates', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.saveFromCheckout(TEST_ADDRESS);
    });
    await act(async () => {
      await result.current.saveFromCheckout(TEST_ADDRESS);
    });

    expect(result.current.addresses).toHaveLength(1);
  });
});

// ── Wix sync — authenticated ───────────────────────────────────────────────────

describe('useSavedAddresses — Wix sync (authenticated)', () => {
  it('calls syncMemberAddresses after addAddress', async () => {
    mockSyncMemberAddresses.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(mockSyncMemberAddresses).toHaveBeenCalledWith(
      AUTHENTICATED_USER.id,
      expect.arrayContaining([expect.objectContaining({ fullName: TEST_ADDRESS.fullName })]),
    );
  });

  it('calls syncMemberAddresses after updateAddress', async () => {
    mockSyncMemberAddresses.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });
    const id = result.current.addresses[0].id;
    mockSyncMemberAddresses.mockClear();

    await act(async () => {
      await result.current.updateAddress(id, { fullName: 'Changed' });
    });

    expect(mockSyncMemberAddresses).toHaveBeenCalledWith(
      AUTHENTICATED_USER.id,
      expect.arrayContaining([expect.objectContaining({ fullName: 'Changed' })]),
    );
  });

  it('calls syncMemberAddresses after deleteAddress', async () => {
    mockSyncMemberAddresses.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
      await result.current.addAddress({ ...TEST_ADDRESS, line1: '99 Oak St', zip: '28802' });
    });
    const firstId = result.current.addresses[0].id;
    mockSyncMemberAddresses.mockClear();

    await act(async () => {
      await result.current.deleteAddress(firstId);
    });

    expect(mockSyncMemberAddresses).toHaveBeenCalledWith(
      AUTHENTICATED_USER.id,
      expect.not.arrayContaining([expect.objectContaining({ id: firstId })]),
    );
  });

  it('proceeds with local mutation even if syncMemberAddresses rejects', async () => {
    mockSyncMemberAddresses.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    // Local state updated despite sync failure
    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].fullName).toBe(TEST_ADDRESS.fullName);
  });
});

// ── Wix sync — unauthenticated ─────────────────────────────────────────────────

describe('useSavedAddresses — Wix sync (unauthenticated)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
  });

  it('does not call syncMemberAddresses when user is null', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(mockSyncMemberAddresses).not.toHaveBeenCalled();
  });

  it('still persists addresses locally when unauthenticated', async () => {
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ── Wix sync — auth loading ────────────────────────────────────────────────────

describe('useSavedAddresses — auth loading state', () => {
  it('does not call syncMemberAddresses while auth is loading', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, isAuthenticated: false });
    const { result } = renderHook(() => useSavedAddresses());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(mockSyncMemberAddresses).not.toHaveBeenCalled();
  });
});
