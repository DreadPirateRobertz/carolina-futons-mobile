import { renderHook, act } from '@testing-library/react-native';
import { useARScene } from '../useARScene';

const mockModel = {
  id: 'blue-ridge-queen',
  name: 'Blue Ridge Queen',
  basePrice: 349,
  tagline: 'Mountain comfort',
  fabrics: [],
  dimensions: { width: 60, depth: 36, height: 35 },
};

const mockFabric = {
  id: 'natural-linen',
  name: 'Natural Linen',
  color: '#D4C5A9',
  price: 0,
};

const mockModel2 = {
  id: 'asheville-full',
  name: 'Asheville Full',
  basePrice: 299,
  tagline: 'City style',
  fabrics: [],
  dimensions: { width: 54, depth: 34, height: 33 },
};

describe('useARScene', () => {
  it('starts with empty scene', () => {
    const { result } = renderHook(() => useARScene());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.activeIndex).toBe(-1);
  });

  it('adds item to scene', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalPrice).toBe(349);
    expect(result.current.activeIndex).toBe(0);
  });

  it('adds multiple items', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel2 as any, mockFabric as any);
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalPrice).toBe(648);
  });

  it('enforces max 3 items', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    const added = result.current.addItem(mockModel as any, mockFabric as any);
    expect(result.current.items).toHaveLength(3);
    expect(added).toBe(false);
  });

  it('removes item by index', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel2 as any, mockFabric as any);
    });
    act(() => result.current.removeItem(0));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].model.id).toBe('asheville-full');
  });

  it('selects active item for editing', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel2 as any, mockFabric as any);
    });
    act(() => result.current.setActiveIndex(1));
    expect(result.current.activeIndex).toBe(1);
  });

  it('adjusts activeIndex when removing active item', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel2 as any, mockFabric as any);
    });
    act(() => result.current.setActiveIndex(1));
    act(() => result.current.removeItem(1));
    expect(result.current.activeIndex).toBe(0);
  });

  it('sets activeIndex to -1 when last item removed', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => result.current.removeItem(0));
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.items).toHaveLength(0);
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel2 as any, mockFabric as any);
    });
    act(() => result.current.clearScene());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.activeIndex).toBe(-1);
  });

  it('calculates total price including fabric premiums', () => {
    const premiumFabric = { ...mockFabric, id: 'velvet', name: 'Velvet', price: 50 };
    const { result } = renderHook(() => useARScene());
    act(() => {
      result.current.addItem(mockModel as any, premiumFabric as any);
    });
    expect(result.current.totalPrice).toBe(399); // 349 + 50
  });

  it('canAddMore returns true when under max', () => {
    const { result } = renderHook(() => useARScene());
    expect(result.current.canAddMore).toBe(true);
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    expect(result.current.canAddMore).toBe(true);
    act(() => {
      result.current.addItem(mockModel as any, mockFabric as any);
    });
    expect(result.current.canAddMore).toBe(false);
  });
});
