import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAddressBook, type SavedAddress } from '../useAddressBook';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;

const TEST_ADDRESS = {
  fullName: 'John Doe',
  line1: '123 Main St',
  line2: 'Apt 4',
  city: 'Asheville',
  state: 'NC',
  zip: '28801',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
});

describe('useAddressBook', () => {
  it('starts with empty addresses', async () => {
    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});
    expect(result.current.addresses).toEqual([]);
    expect(result.current.defaultAddress).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loads saved addresses from storage', async () => {
    const saved: SavedAddress[] = [{ ...TEST_ADDRESS, id: 'addr-1', isDefault: true }];
    mockGetItem.mockResolvedValue(JSON.stringify(saved));

    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.defaultAddress?.fullName).toBe('John Doe');
  });

  it('adds a new address and sets first as default', async () => {
    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    await act(async () => {
      await result.current.addAddress(TEST_ADDRESS);
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].isDefault).toBe(true);
    expect(result.current.addresses[0].fullName).toBe('John Doe');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('deletes an address and promotes next as default', async () => {
    const saved: SavedAddress[] = [
      { ...TEST_ADDRESS, id: 'addr-1', isDefault: true },
      { ...TEST_ADDRESS, id: 'addr-2', fullName: 'Jane Doe', line1: '456 Oak Ave', isDefault: false },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(saved));

    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    await act(async () => {
      await result.current.deleteAddress('addr-1');
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0].isDefault).toBe(true);
    expect(result.current.addresses[0].fullName).toBe('Jane Doe');
  });

  it('sets a different address as default', async () => {
    const saved: SavedAddress[] = [
      { ...TEST_ADDRESS, id: 'addr-1', isDefault: true },
      { ...TEST_ADDRESS, id: 'addr-2', fullName: 'Jane Doe', line1: '456 Oak Ave', isDefault: false },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(saved));

    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    await act(async () => {
      await result.current.setDefault('addr-2');
    });

    expect(result.current.addresses[0].isDefault).toBe(false);
    expect(result.current.addresses[1].isDefault).toBe(true);
  });

  it('saves from checkout without duplicates', async () => {
    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    await act(async () => {
      await result.current.saveFromCheckout(TEST_ADDRESS);
    });
    expect(result.current.addresses).toHaveLength(1);

    // Same address again — should not duplicate
    await act(async () => {
      await result.current.saveFromCheckout(TEST_ADDRESS);
    });
    expect(result.current.addresses).toHaveLength(1);
  });

  it('enforces max 5 addresses', async () => {
    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await result.current.addAddress({
          ...TEST_ADDRESS,
          line1: `${i} Street`,
          zip: `2880${i}`,
        });
      });
    }

    expect(result.current.addresses.length).toBeLessThanOrEqual(5);
  });

  it('updates an existing address', async () => {
    const saved: SavedAddress[] = [{ ...TEST_ADDRESS, id: 'addr-1', isDefault: true }];
    mockGetItem.mockResolvedValue(JSON.stringify(saved));

    const { result } = renderHook(() => useAddressBook());
    await act(async () => {});

    await act(async () => {
      await result.current.updateAddress('addr-1', { fullName: 'Updated Name' });
    });

    expect(result.current.addresses[0].fullName).toBe('Updated Name');
  });
});
