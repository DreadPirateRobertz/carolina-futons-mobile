/**
 * TDD tests for InventoryBadge component — cm-91s
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { InventoryBadge } from '../InventoryBadge';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBadge(props: React.ComponentProps<typeof InventoryBadge>) {
  return render(
    <ThemeProvider>
      <InventoryBadge {...props} />
    </ThemeProvider>,
  );
}

describe('InventoryBadge', () => {
  // ── Rendering ─────────────────────────────────────────────────

  it('renders nothing when badge=none', () => {
    const { queryByTestId } = renderBadge({ badge: 'none', quantity: 0 });
    expect(queryByTestId('inventory-badge')).toBeNull();
  });

  it('renders "Only X left" text for low_stock badge', () => {
    const { getByText } = renderBadge({ badge: 'low_stock', quantity: 3 });
    expect(getByText('Only 3 left')).toBeTruthy();
  });

  it('renders "Only 1 left" for quantity=1', () => {
    const { getByText } = renderBadge({ badge: 'low_stock', quantity: 1 });
    expect(getByText('Only 1 left')).toBeTruthy();
  });

  it('renders "Only 5 left" for quantity=5', () => {
    const { getByText } = renderBadge({ badge: 'low_stock', quantity: 5 });
    expect(getByText('Only 5 left')).toBeTruthy();
  });

  it('renders "Just restocked" text for just_restocked badge', () => {
    const { getByText } = renderBadge({ badge: 'just_restocked', quantity: 0 });
    expect(getByText('Just restocked')).toBeTruthy();
  });

  // ── TestID ────────────────────────────────────────────────────

  it('has default testID for low_stock badge', () => {
    const { getByTestId } = renderBadge({ badge: 'low_stock', quantity: 2 });
    expect(getByTestId('inventory-badge')).toBeTruthy();
  });

  it('has default testID for just_restocked badge', () => {
    const { getByTestId } = renderBadge({ badge: 'just_restocked', quantity: 0 });
    expect(getByTestId('inventory-badge')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderBadge({ badge: 'low_stock', quantity: 4, testID: 'my-badge' });
    expect(getByTestId('my-badge')).toBeTruthy();
  });

  // ── Accessibility ──────────────────────────────────────────────

  it('has accessibility label for low_stock', () => {
    const { getByTestId } = renderBadge({ badge: 'low_stock', quantity: 3 });
    const badge = getByTestId('inventory-badge');
    expect(badge.props.accessibilityLabel).toContain('3');
  });

  it('has accessibility label for just_restocked', () => {
    const { getByTestId } = renderBadge({ badge: 'just_restocked', quantity: 0 });
    const badge = getByTestId('inventory-badge');
    expect(badge.props.accessibilityLabel).toContain('restocked');
  });

  // ── Variant prop ──────────────────────────────────────────────

  it('renders in compact mode without crashing', () => {
    const { getByTestId } = renderBadge({ badge: 'low_stock', quantity: 2, compact: true });
    expect(getByTestId('inventory-badge')).toBeTruthy();
  });
});
