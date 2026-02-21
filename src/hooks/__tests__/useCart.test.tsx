import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { CartProvider, useCart } from '../useCart';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const asheville = FUTON_MODELS[0]; // $349
const blueRidge = FUTON_MODELS[1]; // $449
const naturalLinen = FABRICS[0]; // $0
const mountainBlue = FABRICS[2]; // $29
const espressoBrown = FABRICS[5]; // $49

/** Test harness that exposes cart state + actions */
function CartHarness() {
  const { items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart } = useCart();

  return (
    <View>
      <Text testID="item-count">{itemCount}</Text>
      <Text testID="subtotal">{subtotal}</Text>
      <Text testID="items-json">
        {JSON.stringify(items.map((i) => ({ id: i.id, qty: i.quantity, unit: i.unitPrice })))}
      </Text>

      <TouchableOpacity
        testID="add-asheville-linen"
        onPress={() => addItem(asheville, naturalLinen, 1)}
      />
      <TouchableOpacity
        testID="add-asheville-linen-2"
        onPress={() => addItem(asheville, naturalLinen, 2)}
      />
      <TouchableOpacity
        testID="add-blueridge-blue"
        onPress={() => addItem(blueRidge, mountainBlue, 1)}
      />
      <TouchableOpacity
        testID="add-asheville-espresso"
        onPress={() => addItem(asheville, espressoBrown, 1)}
      />
      <TouchableOpacity
        testID="remove-asheville-linen"
        onPress={() => removeItem('asheville-full:natural-linen')}
      />
      <TouchableOpacity
        testID="update-qty-3"
        onPress={() => updateQuantity('asheville-full:natural-linen', 3)}
      />
      <TouchableOpacity
        testID="update-qty-0"
        onPress={() => updateQuantity('asheville-full:natural-linen', 0)}
      />
      <TouchableOpacity
        testID="update-qty-15"
        onPress={() => updateQuantity('asheville-full:natural-linen', 15)}
      />
      <TouchableOpacity testID="clear" onPress={clearCart} />
    </View>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartHarness />
    </CartProvider>,
  );
}

describe('useCart', () => {
  describe('Initial state', () => {
    it('starts with empty cart', () => {
      const { getByTestId } = renderCart();
      expect(getByTestId('item-count').props.children).toBe(0);
      expect(getByTestId('subtotal').props.children).toBe(0);
    });
  });

  describe('Adding items', () => {
    it('adds a single item', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(1);
      expect(getByTestId('subtotal').props.children).toBe(349);
    });

    it('merges same model+fabric by increasing quantity', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(2);
      expect(getByTestId('subtotal').props.children).toBe(698);
    });

    it('adds different models as separate items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      // $349 + ($449+$29) = $827
      expect(getByTestId('subtotal').props.children).toBe(827);
    });

    it('adds same model with different fabrics as separate items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-asheville-espresso'));
      expect(getByTestId('item-count').props.children).toBe(2);
      // $349 + ($349+$49) = $747
      expect(getByTestId('subtotal').props.children).toBe(747);
    });

    it('adds item with quantity > 1', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen-2'));
      expect(getByTestId('item-count').props.children).toBe(2);
      expect(getByTestId('subtotal').props.children).toBe(698);
    });

    it('caps merged quantity at 10', () => {
      const { getByTestId } = renderCart();
      // Add 2 five times = would be 10, then add 2 more = still 10
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('add-asheville-linen-2'));
      }
      expect(getByTestId('item-count').props.children).toBe(10);
      fireEvent.press(getByTestId('add-asheville-linen-2'));
      expect(getByTestId('item-count').props.children).toBe(10);
    });
  });

  describe('Removing items', () => {
    it('removes an item by id', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      fireEvent.press(getByTestId('remove-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(1);
      expect(getByTestId('subtotal').props.children).toBe(478);
    });

    it('does nothing when removing nonexistent id', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('remove-asheville-linen'));
      fireEvent.press(getByTestId('remove-asheville-linen')); // already gone
      expect(getByTestId('item-count').props.children).toBe(0);
    });
  });

  describe('Updating quantity', () => {
    it('updates quantity to specific value', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-3'));
      expect(getByTestId('item-count').props.children).toBe(3);
      expect(getByTestId('subtotal').props.children).toBe(1047);
    });

    it('removes item when quantity set to 0', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-0'));
      expect(getByTestId('item-count').props.children).toBe(0);
    });

    it('caps quantity at 10', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-15'));
      expect(getByTestId('item-count').props.children).toBe(10);
    });
  });

  describe('Clearing cart', () => {
    it('removes all items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      fireEvent.press(getByTestId('clear'));
      expect(getByTestId('item-count').props.children).toBe(0);
      expect(getByTestId('subtotal').props.children).toBe(0);
    });

    it('clearing empty cart is a no-op', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('clear'));
      expect(getByTestId('item-count').props.children).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('throws when useCart called outside CartProvider', () => {
      function BadComponent() {
        useCart();
        return null;
      }
      expect(() => render(<BadComponent />)).toThrow('useCart must be used within a CartProvider');
    });
  });
});
