import { renderHook, act } from '@testing-library/react-native';
import { useStagedItems } from '../useStagedItems';
import type { FutonModel, Fabric } from '@/data/futons';
import { futonModelId } from '@/data/productId';

const mockModel = {
  id: futonModelId('asheville-full'),
  name: 'Asheville Full',
  tagline: 'Test',
  basePrice: 599,
  dimensions: { width: 54, depth: 38, height: 33, seatHeight: 18 },
  fabrics: [],
} as FutonModel;

const mockModel2 = {
  id: futonModelId('blue-ridge-queen'),
  name: 'Blue Ridge Queen',
  tagline: 'Test 2',
  basePrice: 799,
  dimensions: { width: 60, depth: 40, height: 35, seatHeight: 18 },
  fabrics: [],
} as FutonModel;

const mockFabric: Fabric = {
  id: 'natural-linen',
  name: 'Natural Linen',
  color: '#E8D5B7',
  price: 0,
};

describe('useStagedItems', () => {
  it('starts with empty items', () => {
    const { result } = renderHook(() => useStagedItems());
    expect(result.current.items).toEqual([]);
    expect(result.current.activeId).toBeNull();
    expect(result.current.activeItem).toBeNull();
    expect(result.current.canAdd).toBe(true);
  });

  it('adds an item and sets it as active', () => {
    const { result } = renderHook(() => useStagedItems());

    let added: any;
    act(() => {
      added = result.current.addItem(mockModel, mockFabric);
    });

    expect(added).not.toBeNull();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].model.id).toBe('asheville-full');
    expect(result.current.activeId).toBe(added.id);
    expect(result.current.activeItem?.model.id).toBe('asheville-full');
  });

  it('adds multiple items', () => {
    const { result } = renderHook(() => useStagedItems());

    act(() => {
      result.current.addItem(mockModel, mockFabric);
      result.current.addItem(mockModel2, mockFabric);
    });

    expect(result.current.items).toHaveLength(2);
  });

  it('enforces max items limit', () => {
    const { result } = renderHook(() => useStagedItems());

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.addItem(mockModel, mockFabric);
      }
    });

    expect(result.current.items).toHaveLength(5);
    expect(result.current.canAdd).toBe(false);

    let overflow: any;
    act(() => {
      overflow = result.current.addItem(mockModel, mockFabric);
    });

    expect(overflow).toBeNull();
    expect(result.current.items).toHaveLength(5);
  });

  it('removes an item by id', () => {
    const { result } = renderHook(() => useStagedItems());

    let item1: any;
    act(() => {
      item1 = result.current.addItem(mockModel, mockFabric);
      result.current.addItem(mockModel2, mockFabric);
    });

    act(() => {
      result.current.removeItem(item1.id);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].model.id).toBe('blue-ridge-queen');
  });

  it('clears active when removing active item', () => {
    const { result } = renderHook(() => useStagedItems());

    let item: any;
    act(() => {
      item = result.current.addItem(mockModel, mockFabric);
    });

    expect(result.current.activeId).toBe(item.id);

    act(() => {
      result.current.removeItem(item.id);
    });

    expect(result.current.activeId).toBeNull();
  });

  it('selects an item by id', () => {
    const { result } = renderHook(() => useStagedItems());

    let item1: any;
    act(() => {
      item1 = result.current.addItem(mockModel, mockFabric);
      result.current.addItem(mockModel2, mockFabric);
    });

    act(() => {
      result.current.selectItem(item1.id);
    });

    expect(result.current.activeId).toBe(item1.id);
    expect(result.current.activeItem?.model.id).toBe('asheville-full');
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useStagedItems());

    act(() => {
      result.current.addItem(mockModel, mockFabric);
      result.current.addItem(mockModel2, mockFabric);
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.activeId).toBeNull();
    expect(result.current.canAdd).toBe(true);
  });
});
