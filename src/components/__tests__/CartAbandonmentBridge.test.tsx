/**
 * Tests for CartAbandonmentBridge integration component.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { CartAbandonmentBridge } from '../CartAbandonmentBridge';

// Mock all dependencies
const mockOnCartChanged = jest.fn();
const mockOnOrderPlaced = jest.fn();

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    itemCount: 2,
  }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    preferences: { cartReminders: true },
    permissionStatus: 'granted',
  }),
}));

jest.mock('@/hooks/useCartAbandonmentReminder', () => ({
  useCartAbandonmentReminder: () => ({
    onCartChanged: mockOnCartChanged,
    onOrderPlaced: mockOnOrderPlaced,
  }),
}));

describe('CartAbandonmentBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing (returns null)', () => {
    const { toJSON } = render(<CartAbandonmentBridge />);
    expect(toJSON()).toBeNull();
  });

  it('does not call onCartChanged on initial mount', () => {
    render(<CartAbandonmentBridge />);
    expect(mockOnCartChanged).not.toHaveBeenCalled();
  });
});
