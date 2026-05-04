/**
 * Tests for CartAbandonmentBridge integration component.
 *
 * Covers: 24hr reminder hook wiring + 1hr recovery hook wiring (hq-8k690).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { emitCartAbandoned } from '@/services/crossRigEventBus';
import { CartAbandonmentBridge } from '../CartAbandonmentBridge';

// ── mutable mock state (prefixed 'mock' so Jest hoisting allows factory access) ──

const mockCartItems = [
  {
    id: 'asheville:linen',
    model: { id: 'asheville', name: 'The Asheville' },
    fabric: { id: 'linen', name: 'Natural Linen' },
    quantity: 1,
    unitPrice: 899,
    imageUrl: 'https://cdn.example.com/asheville.jpg',
  },
];

const mockCartState = {
  items: mockCartItems as typeof mockCartItems | [],
  itemCount: 2,
  subtotal: 899,
};

const mockNotifState = {
  preferences: { cartReminders: true, cartRecovery: true },
  permissionStatus: 'granted',
};

// ── hook stubs ────────────────────────────────────────────────────────────────

const mockOnCartChanged = jest.fn();
const mockOnOrderPlaced = jest.fn();
const mockOnCartActivity = jest.fn();
const mockOnRecoveryOrderPlaced = jest.fn();

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/services/crossRigEventBus', () => ({
  emitCartAbandoned: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: jest.fn(() => ({ callFunction: jest.fn() })),
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockCartState,
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockNotifState,
}));

jest.mock('@/hooks/useAuth', () => {
  const { createContext } = require('react');
  const AuthContext = createContext({
    user: { id: 'member-1', email: 'test@example.com' },
  });
  return {
    AuthContext,
    useAuth: () => ({ user: { id: 'member-1', email: 'test@example.com' } }),
  };
});

jest.mock('@/hooks/useCartAbandonmentReminder', () => ({
  useCartAbandonmentReminder: () => ({
    onCartChanged: mockOnCartChanged,
    onOrderPlaced: mockOnOrderPlaced,
  }),
}));

const mockUseCartAbandonmentRecovery = jest.fn((_opts: Record<string, unknown>) => ({
  onCartActivity: mockOnCartActivity,
  onOrderPlaced: mockOnRecoveryOrderPlaced,
}));

jest.mock('@/hooks/useCartAbandonmentRecovery', () => ({
  useCartAbandonmentRecovery: (opts: Record<string, unknown>) =>
    mockUseCartAbandonmentRecovery(opts),
}));

// ── test helpers ──────────────────────────────────────────────────────────────

function resetCart() {
  mockCartState.items = mockCartItems;
  mockCartState.itemCount = 2;
  mockCartState.subtotal = 899;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CartAbandonmentBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCart();
    mockNotifState.permissionStatus = 'granted';
    mockNotifState.preferences.cartRecovery = true;
  });

  it('renders nothing (returns null)', () => {
    const { toJSON } = render(<CartAbandonmentBridge />);
    expect(toJSON()).toBeNull();
  });

  it('does not call onCartChanged on initial mount', () => {
    render(<CartAbandonmentBridge />);
    expect(mockOnCartChanged).not.toHaveBeenCalled();
  });

  it('does not call onCartActivity on initial mount', () => {
    render(<CartAbandonmentBridge />);
    expect(mockOnCartActivity).not.toHaveBeenCalled();
  });

  it('passes cart items, subtotal, userId, and pushPermitted to recovery hook', () => {
    render(<CartAbandonmentBridge />);
    expect(mockUseCartAbandonmentRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        items: mockCartItems,
        subtotal: 899,
        userId: 'member-1',
        pushPermitted: true,
        cartId: expect.any(String),
      }),
    );
  });

  describe('pushPermitted derivation', () => {
    it('is true when permissionStatus is granted', () => {
      mockNotifState.permissionStatus = 'granted';
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      expect(callArgs?.pushPermitted).toBe(true);
    });

    it('is false when permissionStatus is denied', () => {
      mockNotifState.permissionStatus = 'denied';
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      expect(callArgs?.pushPermitted).toBe(false);
    });

    it('is false when permissionStatus is undetermined', () => {
      mockNotifState.permissionStatus = 'undetermined';
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      expect(callArgs?.pushPermitted).toBe(false);
    });

    it('is false when cartRecovery preference is disabled (even if OS permission granted)', () => {
      mockNotifState.permissionStatus = 'granted';
      mockNotifState.preferences.cartRecovery = false;
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      expect(callArgs?.pushPermitted).toBe(false);
    });
  });

  describe('onOrderPlaced integration — cart empties to 0 (checkout)', () => {
    it('calls onOrderPlaced on both hooks when cart transitions to 0', async () => {
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        mockCartState.items = [];
        mockCartState.itemCount = 0;
        mockCartState.subtotal = 0;
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnRecoveryOrderPlaced).toHaveBeenCalledTimes(1);
      expect(mockOnOrderPlaced).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onCartActivity when cart empties to 0', async () => {
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        mockCartState.items = [];
        mockCartState.itemCount = 0;
        mockCartState.subtotal = 0;
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnCartActivity).not.toHaveBeenCalled();
    });

    it('does NOT call onOrderPlaced when cart goes from 0 to non-zero', async () => {
      mockCartState.items = [];
      mockCartState.itemCount = 0;
      mockCartState.subtotal = 0;
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        mockCartState.items = mockCartItems;
        mockCartState.itemCount = 2;
        mockCartState.subtotal = 899;
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnRecoveryOrderPlaced).not.toHaveBeenCalled();
      expect(mockOnOrderPlaced).not.toHaveBeenCalled();
    });

    it('calls onCartActivity (not onOrderPlaced) for non-zero to non-zero item changes', async () => {
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        mockCartState.itemCount = 3;
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnCartActivity).toHaveBeenCalledTimes(1);
      expect(mockOnRecoveryOrderPlaced).not.toHaveBeenCalled();
      expect(mockOnOrderPlaced).not.toHaveBeenCalled();
    });
  });

  describe('emitCartAbandoned cross-rig emission (hq-ap43)', () => {
    it('passes onAbandoned callback to useCartAbandonmentRecovery', () => {
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      expect(callArgs?.onAbandoned).toBeInstanceOf(Function);
    });

    it('onAbandoned callback calls emitCartAbandoned with subtotal and itemCount', () => {
      render(<CartAbandonmentBridge />);
      const callArgs = mockUseCartAbandonmentRecovery.mock.calls[0]?.[0];
      const onAbandoned = callArgs?.onAbandoned as (cartTotal: number, itemCount: number) => void;

      onAbandoned(899, 2);

      expect(emitCartAbandoned).toHaveBeenCalledWith(
        expect.anything(),
        { cartTotal: 899, itemCount: 2 },
        { memberId: 'member-1' },
      );
    });

  });

  describe('cartId dep array — variant swap resets 1hr timer', () => {
    it('calls onCartActivity when cartId changes but itemCount stays the same', async () => {
      // Start with asheville:linen in cart
      mockCartState.items = [{ ...mockCartItems[0], id: 'asheville:linen' }];
      mockCartState.itemCount = 1;
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        // User swaps to a different fabric — same quantity, different item id
        mockCartState.items = [{ ...mockCartItems[0], id: 'asheville:charcoal' }];
        // itemCount stays 1
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnCartActivity).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onOrderPlaced when only cartId changes (not going to 0)', async () => {
      mockCartState.items = [{ ...mockCartItems[0], id: 'asheville:linen' }];
      mockCartState.itemCount = 1;
      const { rerender } = render(<CartAbandonmentBridge />);
      jest.clearAllMocks();

      await act(async () => {
        mockCartState.items = [{ ...mockCartItems[0], id: 'asheville:charcoal' }];
        rerender(<CartAbandonmentBridge />);
      });

      expect(mockOnRecoveryOrderPlaced).not.toHaveBeenCalled();
      expect(mockOnOrderPlaced).not.toHaveBeenCalled();
    });
  });
});
