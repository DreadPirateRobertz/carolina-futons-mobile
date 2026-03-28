/**
 * TDD stubs for MiniCartDrawer Phase 2 — cm-9sr.
 *
 * New features:
 * - CF-gsza item list: image, name, price (unit×qty), qty ± controls, remove
 * - Swipe-down gesture dismiss (threshold: 100px translation OR 500 velocity)
 * - Overlay tap dismiss (already exists, verified here too)
 * - updateQuantity called on ± press; removeItem at qty=1 minus or via × button
 */
import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { MiniCartDrawer } from '../MiniCartDrawer';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Gesture handler mock — captures Pan onEnd for swipe tests ────────────────
let capturedPanOnEnd: ((e: { translationY: number; velocityY: number }) => void) | null = null;

type PanBuilder = {
  minDistance: jest.Mock<PanBuilder>;
  onUpdate: jest.Mock<PanBuilder>;
  onEnd: jest.Mock<PanBuilder>;
};

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const panBuilder: PanBuilder = {
    minDistance: jest.fn(() => panBuilder),
    onUpdate: jest.fn(() => panBuilder),
    onEnd: jest.fn((cb: (e: { translationY: number; velocityY: number }) => void) => {
      capturedPanOnEnd = cb;
      return panBuilder;
    }),
  };
  return {
    Gesture: { Pan: () => panBuilder },
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <View testID="gesture-detector">{children}</View>
    ),
  };
});

// ── Reanimated mock ──────────────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ── useCart mock ─────────────────────────────────────────────────────────────
const mockRemoveItem = jest.fn();
const mockUpdateQuantity = jest.fn();
const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
}));

// ── Test data ────────────────────────────────────────────────────────────────
const ITEM_A = {
  id: 'asheville:natural-linen',
  model: { name: 'Asheville' },
  fabric: { name: 'Natural Linen', color: '#D4C5A9' },
  quantity: 2,
  unitPrice: 349,
  imageUrl: 'https://media.wix.com/asheville-thumb.jpg',
};

const ITEM_B = {
  id: 'blue-ridge:slate-gray',
  model: { name: 'Blue Ridge' },
  fabric: { name: 'Slate Gray', color: '#6B7B8D' },
  quantity: 1,
  unitPrice: 449,
  imageUrl: undefined,
};

const CART_WITH_ITEMS = {
  itemCount: 3,
  subtotal: 1147,
  items: [ITEM_A, ITEM_B],
  removeItem: mockRemoveItem,
  updateQuantity: mockUpdateQuantity,
};

const EMPTY_CART = {
  itemCount: 0,
  subtotal: 0,
  items: [],
  removeItem: mockRemoveItem,
  updateQuantity: mockUpdateQuantity,
};

function renderDrawer(props: Partial<React.ComponentProps<typeof MiniCartDrawer>> = {}) {
  return render(
    <ThemeProvider>
      <MiniCartDrawer visible={true} onClose={jest.fn()} onCheckout={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedPanOnEnd = null;
  mockUseCart.mockReturnValue(CART_WITH_ITEMS);
});

// ── Section 1: Item list rendering ──────────────────────────────────────────

describe('item list — CF-gsza schema rendering', () => {
  it('renders a row for each cart item', () => {
    const { getByTestId } = renderDrawer();
    expect(getByTestId(`cartItemName-${ITEM_A.id}`)).toBeTruthy();
    expect(getByTestId(`cartItemName-${ITEM_B.id}`)).toBeTruthy();
  });

  it('shows product name combining model and fabric', () => {
    const { getByTestId } = renderDrawer();
    const nameEl = getByTestId(`cartItemName-${ITEM_A.id}`);
    expect(nameEl.props.children).toContain('Asheville');
    expect(nameEl.props.children).toContain('Natural Linen');
  });

  it('shows formatted line total price (unitPrice × qty)', () => {
    const { getByTestId } = renderDrawer();
    // ITEM_A: 349 × 2 = 698
    const priceEl = getByTestId(`cartItemPrice-${ITEM_A.id}`);
    expect(priceEl.props.children).toMatch(/698/);
  });

  it('shows current quantity', () => {
    const { getByTestId } = renderDrawer();
    const qtyEl = getByTestId(`cartItemQty-${ITEM_A.id}`);
    expect(qtyEl.props.children).toBe(2);
  });

  it('renders cartItemImage testID for each item', () => {
    const { getByTestId } = renderDrawer();
    expect(getByTestId(`cartItemImage-${ITEM_A.id}`)).toBeTruthy();
    expect(getByTestId(`cartItemImage-${ITEM_B.id}`)).toBeTruthy();
  });

  it('renders cartItemRemove button for each item', () => {
    const { getByTestId } = renderDrawer();
    expect(getByTestId(`cartItemRemove-${ITEM_A.id}`)).toBeTruthy();
    expect(getByTestId(`cartItemRemove-${ITEM_B.id}`)).toBeTruthy();
  });

  it('shows empty state message when cart is empty', () => {
    mockUseCart.mockReturnValue(EMPTY_CART);
    const { getByTestId } = renderDrawer();
    expect(getByTestId('mini-cart-empty')).toBeTruthy();
  });

  it('image shows imageUrl when available', () => {
    const { getByTestId } = renderDrawer();
    const img = getByTestId(`cartItemImage-${ITEM_A.id}`);
    expect(img.props.source?.uri ?? img.props.source).toEqual(
      'https://media.wix.com/asheville-thumb.jpg',
    );
  });

  it('image shows fabric color swatch when imageUrl is absent', () => {
    const { getByTestId } = renderDrawer();
    const img = getByTestId(`cartItemImage-${ITEM_B.id}`);
    // When no image URL, fallback element (View) uses fabric color — style is an array
    expect(img.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: ITEM_B.fabric.color })]),
    );
  });
});

// ── Section 2: Quantity controls ────────────────────────────────────────────

describe('quantity ± controls', () => {
  it('pressing + calls updateQuantity(itemId, qty+1)', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId(`cartItemQtyInc-${ITEM_A.id}`));
    expect(mockUpdateQuantity).toHaveBeenCalledWith(ITEM_A.id, 3);
  });

  it('pressing - at qty > 1 calls updateQuantity(itemId, qty-1)', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId(`cartItemQtyDec-${ITEM_A.id}`));
    expect(mockUpdateQuantity).toHaveBeenCalledWith(ITEM_A.id, 1);
  });

  it('pressing - at qty = 1 calls removeItem', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId(`cartItemQtyDec-${ITEM_B.id}`));
    expect(mockRemoveItem).toHaveBeenCalledWith(ITEM_B.id);
    expect(mockUpdateQuantity).not.toHaveBeenCalled();
  });

  it('+ button does not call removeItem', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId(`cartItemQtyInc-${ITEM_A.id}`));
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});

// ── Section 3: Remove button ─────────────────────────────────────────────────

describe('remove button', () => {
  it('pressing × remove button calls removeItem with itemId', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderDrawer({ onClose });
    fireEvent.press(getByTestId(`cartItemRemove-${ITEM_A.id}`));
    expect(mockRemoveItem).toHaveBeenCalledWith(ITEM_A.id);
  });

  it('remove button calls removeItem for a different item', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId(`cartItemRemove-${ITEM_B.id}`));
    expect(mockRemoveItem).toHaveBeenCalledWith(ITEM_B.id);
  });
});

// ── Section 4: Swipe-down dismiss ────────────────────────────────────────────

describe('swipe-down dismiss gesture', () => {
  it('swipe down exceeding 100px translation calls onClose', async () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });
    await act(async () => {
      capturedPanOnEnd?.({ translationY: 150, velocityY: 100 });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('fast downward swipe (velocity ≥ 500) calls onClose even below translation threshold', async () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });
    await act(async () => {
      capturedPanOnEnd?.({ translationY: 30, velocityY: 600 });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('small slow swipe (< threshold) does NOT call onClose', async () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });
    await act(async () => {
      capturedPanOnEnd?.({ translationY: 30, velocityY: 50 });
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('drawer is wrapped in GestureDetector', () => {
    const { getByTestId } = renderDrawer();
    expect(getByTestId('gesture-detector')).toBeTruthy();
  });
});

// ── Section 5: Overlay tap dismiss (regression) ──────────────────────────────

describe('overlay tap dismiss', () => {
  it('tapping backdrop calls onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderDrawer({ onClose });
    fireEvent.press(getByTestId('mini-cart-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
