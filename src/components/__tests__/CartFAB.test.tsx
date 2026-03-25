/**
 * Tests for CartFAB — cm-486.
 *
 * Floating cart button that opens the mini-cart drawer.
 * Visible from any screen when the cart has items.
 *
 * Covers: hidden when empty, visible with items, badge text, opens drawer,
 * accessibility, item count cap at 99+.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CartFAB } from '../CartFAB';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockOpen = jest.fn();
jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => ({ open: mockOpen, close: jest.fn(), toggle: jest.fn(), isOpen: false }),
}));

const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderFAB() {
  return render(<CartFAB />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCart.mockReturnValue({ itemCount: 1, items: [], subtotal: 0 });
});

// ── Section 1: Visibility ─────────────────────────────────────────────────────

describe('CartFAB visibility', () => {
  it('renders when cart has items', () => {
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab')).toBeTruthy();
  });

  it('does not render when cart is empty', () => {
    mockUseCart.mockReturnValue({ itemCount: 0, items: [], subtotal: 0 });
    const { queryByTestId } = renderFAB();
    expect(queryByTestId('cart-fab')).toBeNull();
  });
});

// ── Section 2: Badge ──────────────────────────────────────────────────────────

describe('CartFAB badge', () => {
  it('shows badge with item count', () => {
    mockUseCart.mockReturnValue({ itemCount: 3, items: [], subtotal: 0 });
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab-badge').props.children).toBe('3');
  });

  it('caps badge at 99+ when count exceeds 99', () => {
    mockUseCart.mockReturnValue({ itemCount: 100, items: [], subtotal: 0 });
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab-badge').props.children).toBe('99+');
  });

  it('shows exact count for exactly 99 items', () => {
    mockUseCart.mockReturnValue({ itemCount: 99, items: [], subtotal: 0 });
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab-badge').props.children).toBe('99');
  });
});

// ── Section 3: Interaction ────────────────────────────────────────────────────

describe('CartFAB interaction', () => {
  it('calls open() when pressed', () => {
    const { getByTestId } = renderFAB();
    fireEvent.press(getByTestId('cart-fab'));
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});

// ── Section 4: Safe area insets ──────────────────────────────────────────────

describe('CartFAB safe area', () => {
  it('accounts for bottom safe area inset in position', () => {
    const mockInset = { top: 47, right: 0, bottom: 34, left: 0 };
    jest
      .spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets')
      .mockReturnValue(mockInset);

    const { getByTestId } = renderFAB();
    const fab = getByTestId('cart-fab');
    const flatStyle = Array.isArray(fab.props.style)
      ? Object.assign({}, ...fab.props.style)
      : fab.props.style;
    expect(flatStyle.bottom).toBeGreaterThanOrEqual(24 + 34);
  });

  it('positions correctly when bottom inset is zero', () => {
    const mockInset = { top: 0, right: 0, bottom: 0, left: 0 };
    jest
      .spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets')
      .mockReturnValue(mockInset);

    const { getByTestId } = renderFAB();
    const fab = getByTestId('cart-fab');
    const flatStyle = Array.isArray(fab.props.style)
      ? Object.assign({}, ...fab.props.style)
      : fab.props.style;
    expect(flatStyle.bottom).toBe(24);
  });
});

// ── Section 5: Accessibility ──────────────────────────────────────────────────

describe('CartFAB accessibility', () => {
  it('has button accessibility role', () => {
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab').props.accessibilityRole).toBe('button');
  });

  it('has descriptive accessibility label', () => {
    mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
    const { getByTestId } = renderFAB();
    expect(getByTestId('cart-fab').props.accessibilityLabel).toMatch(/2/);
  });
});
