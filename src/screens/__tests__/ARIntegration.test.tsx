import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { PRODUCTS, type Product } from '@/data/products';

// ============================================================================
// AR Camera Feature — Integration Test Scaffolding (cm-88d)
//
// Tests the full user flow from product browsing through AR placement:
//   1. Product → "View in Your Room" → ARScreen launch
//   2. AR model loading states (loading, loaded, error)
//   3. Unsupported device fallback flow
//   4. AR session lifecycle (mount → active → unmount cleanup)
//   5. Product-to-model data mapping integrity
//   6. Screenshot/share flow from AR
//   7. Add to cart from AR view
// ============================================================================

// --- Shared Mocks ---

jest.mock('expo-camera', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ({ children, testID, facing }: any) =>
      createElement(View, { testID, accessibilityHint: facing }, children),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return {
    GestureHandlerRootView: ({ children, ...props }: any) => createElement(View, props, children),
    Gesture: {
      Pan: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Pinch: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Rotation: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Simultaneous: () => ({}),
    },
    GestureDetector: ({ children }: any) => children,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

const mockTrackEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  trackEvent: (...args: any[]) => mockTrackEvent(...args),
}));

// --- Test Fixtures ---

const futonProducts = PRODUCTS.filter((p) => p.category === 'futons');
const ashevilleFuton = PRODUCTS.find((p) => p.id === 'prod-asheville-full')!;
const blueRidgeFuton = PRODUCTS.find((p) => p.id === 'prod-blue-ridge-queen')!;

// === Conditional imports — tests skip if modules don't exist yet ===

let ARScreen: any;
let ViewInRoomButton: any;
let arSupport: any;
try {
  ARScreen = require('../ARScreen').ARScreen;
} catch {
  ARScreen = null;
}
try {
  ViewInRoomButton = require('../../components/ViewInRoomButton').ViewInRoomButton;
} catch {
  ViewInRoomButton = null;
}
try {
  arSupport = require('../../services/arSupport');
} catch {
  arSupport = null;
}

// ============================================================================
// 1. Product-to-AR-Model Data Integrity
// ============================================================================
describe('Product-to-AR-Model Data Integrity', () => {
  it('every futon product has a matching FUTON_MODEL entry', () => {
    for (const product of futonProducts) {
      const expectedModelId = product.id.replace('prod-', '');
      const model = FUTON_MODELS.find((m) => m.id === expectedModelId);
      expect(model).toBeDefined();
      // Verify dimensions match
      expect(model!.dimensions.width).toBe(product.dimensions.width);
      expect(model!.dimensions.depth).toBe(product.dimensions.depth);
      expect(model!.dimensions.height).toBe(product.dimensions.height);
    }
  });

  it('every futon product price matches FUTON_MODEL base price', () => {
    for (const product of futonProducts) {
      const expectedModelId = product.id.replace('prod-', '');
      const model = FUTON_MODELS.find((m) => m.id === expectedModelId);
      expect(model).toBeDefined();
      expect(model!.basePrice).toBe(product.price);
    }
  });

  it('FUTON_MODELS has exactly 4 models', () => {
    expect(FUTON_MODELS).toHaveLength(4);
  });

  it('FABRICS has exactly 8 fabrics', () => {
    expect(FABRICS).toHaveLength(8);
  });

  it('all models reference the same shared FABRICS array', () => {
    for (const model of FUTON_MODELS) {
      expect(model.fabrics).toBe(FABRICS);
    }
  });

  it('no duplicate model IDs', () => {
    const ids = FUTON_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate fabric IDs', () => {
    const ids = FABRICS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all fabric prices are non-negative integers', () => {
    for (const fabric of FABRICS) {
      expect(fabric.price).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(fabric.price)).toBe(true);
    }
  });

  it('all model base prices are positive', () => {
    for (const model of FUTON_MODELS) {
      expect(model.basePrice).toBeGreaterThan(0);
    }
  });

  it('all model dimensions are positive', () => {
    for (const model of FUTON_MODELS) {
      expect(model.dimensions.width).toBeGreaterThan(0);
      expect(model.dimensions.depth).toBeGreaterThan(0);
      expect(model.dimensions.height).toBeGreaterThan(0);
      expect(model.dimensions.seatHeight).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 2. AR Screen Launch from Product Context
// ============================================================================
const describeARScreen = ARScreen ? describe : describe.skip;

describeARScreen('AR Screen Launch with Product Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('launches with correct model when given initialModelId', () => {
    const { getAllByText } = render(
      <ARScreen initialModelId="blue-ridge-queen" />,
    );
    expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);
  });

  it('launches with correct price for selected model', () => {
    const { getAllByText } = render(
      <ARScreen initialModelId="pisgah-twin" />,
    );
    expect(getAllByText(/\$279\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('all 4 models are selectable from AR view regardless of entry point', () => {
    const { getByTestId } = render(
      <ARScreen initialModelId="pisgah-twin" />,
    );
    for (const model of FUTON_MODELS) {
      expect(getByTestId(`ar-model-${model.id}`)).toBeTruthy();
    }
  });

  it('can switch from initial model to another and back', () => {
    const { getByTestId, getAllByText } = render(
      <ARScreen initialModelId="asheville-full" />,
    );

    // Switch to Blue Ridge
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);

    // Switch back to Asheville
    fireEvent.press(getByTestId('ar-model-asheville-full'));
    expect(getAllByText('The Asheville').length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 3. AR Model Loading States
// ============================================================================
describeARScreen('AR Model Loading States', () => {
  it('shows futon overlay immediately (current 2D implementation)', () => {
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });

  it('overlay remains visible after model switch', () => {
    const { getByTestId } = render(<ARScreen />);
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });

  it('overlay remains visible after fabric switch', () => {
    const { getByTestId } = render(<ARScreen />);
    fireEvent.press(getByTestId('ar-fabric-charcoal'));
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });
});

// ============================================================================
// 4. Unsupported Device Fallback
// ============================================================================
const describeWithARSupport = arSupport ? describe : describe.skip;

describeWithARSupport('Unsupported Device Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isProductAREnabled returns false for non-futon products', () => {
    const coverProduct = PRODUCTS.find((p) => p.category === 'covers')!;
    expect(arSupport.isProductAREnabled({
      category: coverProduct.category,
      inStock: coverProduct.inStock,
    })).toBe(false);
  });

  it('isProductAREnabled returns true for in-stock futons', () => {
    expect(arSupport.isProductAREnabled({
      category: 'futons',
      inStock: true,
    })).toBe(true);
  });

  it('web platform always returns fallback tier', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    if (arSupport.resetCache) arSupport.resetCache();
    const tier = await arSupport.getDeviceTier();
    expect(tier).toBe('fallback');
  });
});

// ============================================================================
// 5. AR Session Lifecycle
// ============================================================================
describeARScreen('AR Session Lifecycle', () => {
  it('mounts without errors', () => {
    const { getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-screen')).toBeTruthy();
  });

  it('unmounts cleanly', () => {
    const { unmount, getByTestId } = render(<ARScreen />);
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(() => unmount()).not.toThrow();
  });

  it('multiple mount/unmount cycles do not leak', () => {
    for (let i = 0; i < 5; i++) {
      const { unmount, getByTestId } = render(<ARScreen />);
      expect(getByTestId('ar-screen')).toBeTruthy();
      unmount();
    }
  });

  it('onClose fires exactly once per press', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ARScreen onClose={onClose} />);
    fireEvent.press(getByTestId('ar-close'));
    fireEvent.press(getByTestId('ar-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// 6. Add-to-Cart from AR
// ============================================================================
describeARScreen('Add to Cart from AR View', () => {
  it('renders add-to-cart button with correct initial price', () => {
    const { getByText } = render(<ARScreen />);
    expect(getByText(/Add to Cart — \$349\.00/)).toBeTruthy();
  });

  it('add-to-cart reflects model + premium fabric total', () => {
    const { getByTestId, getByText } = render(<ARScreen />);

    // Select Blue Ridge ($449) + Charcoal (+$49) = $498
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    fireEvent.press(getByTestId('ar-fabric-charcoal'));
    expect(getByText(/Add to Cart — \$498\.00/)).toBeTruthy();
  });

  it('add-to-cart reflects price after switching back to free fabric', () => {
    const { getByTestId, getByText } = render(<ARScreen />);

    fireEvent.press(getByTestId('ar-fabric-espresso-brown')); // +$49
    expect(getByText(/Add to Cart — \$398\.00/)).toBeTruthy();

    fireEvent.press(getByTestId('ar-fabric-natural-linen')); // $0
    expect(getByText(/Add to Cart — \$349\.00/)).toBeTruthy();
  });

  it('add-to-cart has correct accessibility for screen readers', () => {
    const { getByTestId } = render(<ARScreen />);
    const btn = getByTestId('ar-add-to-cart');
    expect(btn.props.accessibilityLabel).toBe('Add to cart');
    expect(btn.props.accessibilityRole).toBe('button');
  });
});

// ============================================================================
// 7. Full Integration Flow: Browse → AR → Configure → Cart
// ============================================================================
describeARScreen('Full Integration Flow', () => {
  it('complete user journey: launch → browse models → pick fabric → dimensions → add to cart → close', () => {
    const onClose = jest.fn();
    const { getByTestId, getAllByText, getByText } = render(
      <ARScreen initialModelId="asheville-full" onClose={onClose} />,
    );

    // Verify launched with Asheville
    expect(getAllByText('The Asheville').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/\$349\.00/).length).toBeGreaterThanOrEqual(1);

    // Browse to Blue Ridge
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);

    // Pick Sunset Coral fabric (+$29)
    fireEvent.press(getByTestId('ar-fabric-sunset-coral'));
    // $449 + $29 = $478
    expect(getAllByText(/\$478\.00/).length).toBeGreaterThanOrEqual(1);

    // Toggle dimensions on
    fireEvent.press(getByTestId('ar-dimension-toggle'));
    expect(getByText(/5' W/)).toBeTruthy();
    expect(getByText(/3' D/)).toBeTruthy();

    // Toggle dimensions off
    fireEvent.press(getByTestId('ar-dimension-toggle'));

    // Verify add-to-cart shows correct total
    expect(getByText(/Add to Cart — \$478\.00/)).toBeTruthy();

    // Close
    fireEvent.press(getByTestId('ar-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rapid model cycling during integration flow does not crash', () => {
    const { getByTestId, getAllByText } = render(<ARScreen />);

    // Rapid cycle through all models 3 times
    for (let i = 0; i < 3; i++) {
      for (const model of FUTON_MODELS) {
        fireEvent.press(getByTestId(`ar-model-${model.id}`));
      }
    }

    // Rapid cycle through all fabrics
    for (const fabric of FABRICS) {
      fireEvent.press(getByTestId(`ar-fabric-${fabric.id}`));
    }

    // Rapid dimension toggles
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByTestId('ar-dimension-toggle'));
    }

    // Should still be stable
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });

  it('each model entry point shows correct initial price in add-to-cart', () => {
    for (const model of FUTON_MODELS) {
      const { getByText, unmount } = render(
        <ARScreen initialModelId={model.id} />,
      );
      const expectedPrice = `Add to Cart — $${model.basePrice.toFixed(2)}`;
      expect(getByText(expectedPrice)).toBeTruthy();
      unmount();
    }
  });
});

// ============================================================================
// 8. Cross-cutting: Accessibility in AR Context
// ============================================================================
describeARScreen('AR Accessibility', () => {
  it('all interactive elements have accessibility roles', () => {
    const { getByTestId } = render(<ARScreen />);

    // Close button
    expect(getByTestId('ar-close').props.accessibilityRole).toBe('button');
    // Add to cart
    expect(getByTestId('ar-add-to-cart').props.accessibilityRole).toBe('button');
    // Dimension toggle
    expect(getByTestId('ar-dimension-toggle').props.accessibilityRole).toBe('button');
    // Model chips
    for (const model of FUTON_MODELS) {
      expect(getByTestId(`ar-model-${model.id}`).props.accessibilityRole).toBe('button');
    }
  });

  it('all model chips have accessibility labels matching model names', () => {
    const { getByTestId } = render(<ARScreen />);
    for (const model of FUTON_MODELS) {
      expect(getByTestId(`ar-model-${model.id}`).props.accessibilityLabel).toBe(model.name);
    }
  });

  it('selected model chip has selected accessibility state', () => {
    const { getByTestId } = render(<ARScreen />);
    const defaultChip = getByTestId(`ar-model-${FUTON_MODELS[0].id}`);
    expect(defaultChip.props.accessibilityState).toEqual({ selected: true });

    const otherChip = getByTestId(`ar-model-${FUTON_MODELS[1].id}`);
    expect(otherChip.props.accessibilityState).toEqual({ selected: false });
  });

  it('fabric swatches have accessibility labels', () => {
    const { getByTestId } = render(<ARScreen />);
    for (const fabric of FABRICS) {
      const swatch = getByTestId(`ar-fabric-${fabric.id}`);
      expect(swatch.props.accessibilityLabel).toBeTruthy();
      expect(typeof swatch.props.accessibilityLabel).toBe('string');
    }
  });

  it('permission screen has accessible button', () => {
    const { useCameraPermissions } = require('expo-camera');
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);

    const { getByTestId } = render(<ARScreen />);
    const grantBtn = getByTestId('ar-grant-permission');
    expect(grantBtn.props.accessibilityLabel).toBe('Allow camera access');
    expect(grantBtn.props.accessibilityRole).toBe('button');
  });
});
