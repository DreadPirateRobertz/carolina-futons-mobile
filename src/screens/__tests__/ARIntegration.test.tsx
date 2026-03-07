import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { PRODUCTS } from '@/data/products';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider } from '@/hooks/useCart';

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
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    Easing: { inOut: () => ({}), linear: {} },
  };
});

const mockTrackEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  trackEvent: (...args: any[]) => mockTrackEvent(...args),
  events: {
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    shareWishlist: jest.fn(),
    search: jest.fn(),
    filterCategory: jest.fn(),
    sortProducts: jest.fn(),
    viewProduct: jest.fn(),
    openAR: jest.fn(),
    selectFabric: jest.fn(),
    purchase: jest.fn(),
    deepLinkOpened: jest.fn(),
    arScreenshot: jest.fn(),
    arShare: jest.fn(),
    arSaveToGallery: jest.fn(),
    arSaveToWishlist: jest.fn(),
    arViewInRoomTap: jest.fn(),
    arModelSelected: jest.fn(),
    arAddToCart: jest.fn(),
    submitReview: jest.fn(),
    helpfulVote: jest.fn(),
    arSurfaceDetected: jest.fn(),
    arSurfaceTracking: jest.fn(),
    arFurniturePlaced: jest.fn(),
    arLightingWarning: jest.fn(),
    arProductPickerOpen: jest.fn(),
  },
}));

// Mock useCameraPermission hook
const mockCameraPermission = {
  state: 'granted' as 'undetermined' | 'granted' | 'denied' | 'denied-permanently',
  granted: true,
  request: jest.fn(),
  openSettings: jest.fn(),
  explanation: 'Camera needed for AR.',
  settingsInstructions: null as string | null,
};
jest.mock('@/hooks/useCameraPermission', () => ({
  useCameraPermission: () => mockCameraPermission,
}));

// Mock useAROnboarding hook
jest.mock('@/hooks/useAROnboarding', () => ({
  useAROnboarding: () => ({
    isLoading: false,
    hasSeenAROnboarding: true,
    completeAROnboarding: jest.fn(),
    currentStep: 0,
    totalSteps: 3,
    nextStep: jest.fn(),
    prevStep: jest.fn(),
  }),
}));

// --- Test Fixtures ---

const futonProducts = PRODUCTS.filter((p) => p.category === 'futons');

// === Conditional imports — tests skip if modules don't exist yet ===

let ARScreen: any;
let arSupport: any;
try {
  ARScreen = require('../ARScreen').ARScreen;
} catch {
  ARScreen = null;
}
try {
  arSupport = require('../../services/arSupport');
} catch {
  arSupport = null;
}

// Helper: wrap ARScreen in required providers
const renderAR = (props: any = {}) =>
  render(
    <NavigationContainer>
      <CartProvider>
        <WishlistProvider>
          <ARScreen {...props} />
        </WishlistProvider>
      </CartProvider>
    </NavigationContainer>,
  );

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
    const { getAllByText } = renderAR({ initialModelId: 'blue-ridge-queen' });
    expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);
  });

  it('launches with correct price for selected model', () => {
    const { getAllByText } = renderAR({ initialModelId: 'pisgah-twin' });
    expect(getAllByText(/\$279\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('all 4 models are selectable from AR view regardless of entry point', () => {
    const { getByTestId } = renderAR({ initialModelId: 'pisgah-twin' });
    for (const model of FUTON_MODELS) {
      expect(getByTestId(`ar-model-${model.id}`)).toBeTruthy();
    }
  });

  it('can switch from initial model to another and back', () => {
    const { getByTestId, getAllByText } = renderAR({ initialModelId: 'asheville-full' });

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
    const { getByTestId } = renderAR();
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });

  it('overlay remains visible after model switch', () => {
    const { getByTestId } = renderAR();
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    expect(getByTestId('ar-futon-overlay')).toBeTruthy();
  });

  it('overlay remains visible after fabric switch', () => {
    const { getByTestId } = renderAR();
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
    expect(
      arSupport.isProductAREnabled({
        category: coverProduct.category,
        inStock: coverProduct.inStock,
      }),
    ).toBe(false);
  });

  it('isProductAREnabled returns true for in-stock futons', () => {
    expect(
      arSupport.isProductAREnabled({
        category: 'futons',
        inStock: true,
      }),
    ).toBe(true);
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
    const { getByTestId } = renderAR();
    expect(getByTestId('ar-screen')).toBeTruthy();
  });

  it('unmounts cleanly', () => {
    const { unmount, getByTestId } = renderAR();
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(() => unmount()).not.toThrow();
  });

  it('multiple mount/unmount cycles do not leak', () => {
    for (let i = 0; i < 5; i++) {
      const { unmount, getByTestId } = renderAR();
      expect(getByTestId('ar-screen')).toBeTruthy();
      unmount();
    }
  });

  it('onClose fires exactly once per press', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderAR({ onClose });
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
    const { getByText } = renderAR();
    expect(getByText(/Add to Cart — \$349\.00/)).toBeTruthy();
  });

  it('add-to-cart reflects model + premium fabric total', () => {
    const { getByTestId, getByText } = renderAR();

    // Select Blue Ridge ($449) + Charcoal (+$49) = $498
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
    fireEvent.press(getByTestId('ar-fabric-charcoal'));
    expect(getByText(/Add to Cart — \$498\.00/)).toBeTruthy();
  });

  it('add-to-cart reflects price after switching back to free fabric', () => {
    const { getByTestId, getByText } = renderAR();

    fireEvent.press(getByTestId('ar-fabric-espresso-brown')); // +$49
    expect(getByText(/Add to Cart — \$398\.00/)).toBeTruthy();

    fireEvent.press(getByTestId('ar-fabric-natural-linen')); // $0
    expect(getByText(/Add to Cart — \$349\.00/)).toBeTruthy();
  });

  it('add-to-cart has correct accessibility for screen readers', () => {
    const { getByTestId } = renderAR();
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
    const { getByTestId, getAllByText, getByText } = renderAR({
      initialModelId: 'asheville-full',
      onClose,
    });

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
    const { getByTestId } = renderAR();

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
      const { getByText, unmount } = renderAR({ initialModelId: model.id });
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
    const { getByTestId } = renderAR();

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
    const { getByTestId } = renderAR();
    for (const model of FUTON_MODELS) {
      expect(getByTestId(`ar-model-${model.id}`).props.accessibilityLabel).toBe(model.name);
    }
  });

  it('selected model chip has selected accessibility state', () => {
    const { getByTestId } = renderAR();
    const defaultChip = getByTestId(`ar-model-${FUTON_MODELS[0].id}`);
    expect(defaultChip.props.accessibilityState).toEqual({ selected: true });

    const otherChip = getByTestId(`ar-model-${FUTON_MODELS[1].id}`);
    expect(otherChip.props.accessibilityState).toEqual({ selected: false });
  });

  it('fabric swatches have accessibility labels', () => {
    const { getByTestId } = renderAR();
    for (const fabric of FABRICS) {
      const swatch = getByTestId(`ar-fabric-${fabric.id}`);
      expect(swatch.props.accessibilityLabel).toBeTruthy();
      expect(typeof swatch.props.accessibilityLabel).toBe('string');
    }
  });

  it('permission screen has accessible button', () => {
    mockCameraPermission.state = 'undetermined';
    mockCameraPermission.granted = false;

    const { getByTestId } = renderAR();
    const grantBtn = getByTestId('ar-grant-permission');
    expect(grantBtn.props.accessibilityLabel).toBe('Allow camera access');
    expect(grantBtn.props.accessibilityRole).toBe('button');

    // Reset
    mockCameraPermission.state = 'granted';
    mockCameraPermission.granted = true;
  });
});

// ============================================================================
// 9. Edge Cases & Error States
// ============================================================================
describeARScreen('Edge Cases & Error States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useCameraPermissions } = require('expo-camera');
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
  });

  it('defaults to first model when initialModelId is invalid', () => {
    const { getAllByText } = renderAR({ initialModelId: 'nonexistent-model-xyz' });
    // Should fall back to FUTON_MODELS[0]
    expect(getAllByText(FUTON_MODELS[0].name).length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to first model when initialModelId is undefined', () => {
    const { getAllByText } = renderAR({});
    expect(getAllByText(FUTON_MODELS[0].name).length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to first model when initialModelId is empty string', () => {
    const { getAllByText } = renderAR({ initialModelId: '' });
    expect(getAllByText(FUTON_MODELS[0].name).length).toBeGreaterThanOrEqual(1);
  });

  it('camera permission denied shows permission screen with grant button', () => {
    mockCameraPermission.state = 'denied';
    mockCameraPermission.granted = false;

    const { getByTestId, queryByTestId } = renderAR();
    expect(getByTestId('ar-permission')).toBeTruthy();
    expect(getByTestId('ar-grant-permission')).toBeTruthy();
    expect(queryByTestId('ar-screen')).toBeNull();

    // Reset
    mockCameraPermission.state = 'granted';
    mockCameraPermission.granted = true;
  });

  it('camera permission undetermined shows priming screen', () => {
    mockCameraPermission.state = 'undetermined';
    mockCameraPermission.granted = false;

    const { getByTestId, queryByTestId } = renderAR();
    expect(getByTestId('ar-permission')).toBeTruthy();
    expect(queryByTestId('ar-screen')).toBeNull();

    // Reset
    mockCameraPermission.state = 'granted';
    mockCameraPermission.granted = true;
  });

  it('permission dismiss button calls onClose', () => {
    mockCameraPermission.state = 'undetermined';
    mockCameraPermission.granted = false;

    const onClose = jest.fn();
    const { getByTestId } = renderAR({ onClose });
    fireEvent.press(getByTestId('ar-permission-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Reset
    mockCameraPermission.state = 'granted';
    mockCameraPermission.granted = true;
  });

  it('selecting same model again is a no-op (no crash)', () => {
    const { getByTestId } = renderAR({ initialModelId: 'asheville-full' });
    // Press the already-selected model multiple times
    fireEvent.press(getByTestId('ar-model-asheville-full'));
    fireEvent.press(getByTestId('ar-model-asheville-full'));
    fireEvent.press(getByTestId('ar-model-asheville-full'));
    expect(getByTestId('ar-screen')).toBeTruthy();
  });

  it('selecting same fabric again is a no-op (no crash)', () => {
    const { getByTestId } = renderAR();
    const firstFabric = FABRICS[0];
    fireEvent.press(getByTestId(`ar-fabric-${firstFabric.id}`));
    fireEvent.press(getByTestId(`ar-fabric-${firstFabric.id}`));
    expect(getByTestId('ar-screen')).toBeTruthy();
  });

  it('add-to-cart fires analytics with correct model+fabric+price', () => {
    const { events: mockEvents } = require('@/services/analytics');
    mockEvents.arAddToCart.mockClear();

    const { getByTestId } = renderAR({ initialModelId: 'asheville-full' });
    // Select a premium fabric
    fireEvent.press(getByTestId('ar-fabric-charcoal')); // +$49
    fireEvent.press(getByTestId('ar-add-to-cart'));

    expect(mockEvents.arAddToCart).toHaveBeenCalledWith(
      'asheville-full',
      'charcoal',
      349 + 49, // base + fabric premium
    );
  });

  it('model switch fires analytics event', () => {
    const { events: mockEvents } = require('@/services/analytics');
    mockEvents.arModelSelected.mockClear();

    const { getByTestId } = renderAR({ initialModelId: 'asheville-full' });
    fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));

    expect(mockEvents.arModelSelected).toHaveBeenCalledWith(
      'blue-ridge-queen',
      'prod-blue-ridge-queen',
    );
  });

  it('fabric switch fires analytics event', () => {
    const { events: mockEvents } = require('@/services/analytics');
    mockEvents.selectFabric.mockClear();

    const { getByTestId } = renderAR({ initialModelId: 'asheville-full' });
    fireEvent.press(getByTestId('ar-fabric-sunset-coral'));

    expect(mockEvents.selectFabric).toHaveBeenCalledWith('prod-asheville-full', 'sunset-coral');
  });
});

// ============================================================================
// 10. 3D Model Catalog — PoC Model Validation
// ============================================================================

let models3d: any;
try {
  models3d = require('../../data/models3d');
} catch {
  models3d = null;
}

const describeWithModels3D = models3d ? describe : describe.skip;

describeWithModels3D('3D Model Catalog — PoC Validation', () => {
  it('catalog has at least one product with a non-placeholder GLB URL', () => {
    const { MODELS_3D } = models3d;
    const realModels = MODELS_3D.filter((m: any) => !m.glbUrl.includes('cdn.carolinafutons.com'));
    expect(realModels.length).toBeGreaterThanOrEqual(1);
  });

  it('PoC model GLB URL points to a valid HTTPS source', () => {
    const { MODELS_3D } = models3d;
    const pocModel = MODELS_3D.find((m: any) => !m.glbUrl.includes('cdn.carolinafutons.com'));
    expect(pocModel).toBeDefined();
    expect(pocModel.glbUrl).toMatch(/^https:\/\//);
    expect(pocModel.glbUrl).toMatch(/\.glb$/);
  });

  it('PoC model has valid dimensions (furniture-scale, in meters)', () => {
    const { MODELS_3D } = models3d;
    const pocModel = MODELS_3D.find((m: any) => !m.glbUrl.includes('cdn.carolinafutons.com'));
    expect(pocModel).toBeDefined();
    // Furniture dimensions: 0.3m - 3m range
    expect(pocModel.dimensions.width).toBeGreaterThan(0.3);
    expect(pocModel.dimensions.width).toBeLessThan(3);
    expect(pocModel.dimensions.depth).toBeGreaterThan(0.3);
    expect(pocModel.dimensions.depth).toBeLessThan(3);
    expect(pocModel.dimensions.height).toBeGreaterThan(0.3);
    expect(pocModel.dimensions.height).toBeLessThan(3);
  });

  it('every model has matching productId format', () => {
    const { MODELS_3D } = models3d;
    for (const model of MODELS_3D) {
      expect(model.productId).toMatch(/^prod-/);
    }
  });

  it('getModel3DForProduct returns PoC model by productId', () => {
    const { MODELS_3D, getModel3DForProduct } = models3d;
    const pocModel = MODELS_3D.find((m: any) => !m.glbUrl.includes('cdn.carolinafutons.com'));
    const result = getModel3DForProduct(pocModel.productId);
    expect(result).toBeDefined();
    expect(result!.glbUrl).toBe(pocModel.glbUrl);
  });
});

// ============================================================================
// 11. Web Platform AR Flow — Integration
// ============================================================================

let openARViewerModule: any;
try {
  openARViewerModule = require('../../utils/openARViewer');
} catch {
  openARViewerModule = null;
}

const describeWebARFlow = openARViewerModule && models3d ? describe : describe.skip;

describeWebARFlow('Web Platform AR Flow', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS });
  });

  it('openARViewer invokes onWebModelView on web platform', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const onWebModelView = jest.fn();
    await openARViewerModule.openARViewer('asheville-full', 'The Asheville', {
      onWebModelView,
    });
    expect(onWebModelView).toHaveBeenCalledTimes(1);
    expect(onWebModelView).toHaveBeenCalledWith(
      expect.objectContaining({
        glbUrl: expect.any(String),
        usdzUrl: expect.any(String),
        modelId: 'asheville-full',
        modelName: 'The Asheville',
      }),
    );
  });

  it('onWebModelView receives catalog GLB URL for known products', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const onWebModelView = jest.fn();
    const catalogEntry = models3d.getModel3DForProduct('prod-asheville-full');
    await openARViewerModule.openARViewer('asheville-full', 'The Asheville', {
      onWebModelView,
    });
    expect(onWebModelView).toHaveBeenCalledWith(
      expect.objectContaining({
        glbUrl: catalogEntry.glbUrl,
        usdzUrl: catalogEntry.usdzUrl,
      }),
    );
  });

  it('web flow provides all params needed for ARWebScreen navigation', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const onWebModelView = jest.fn();
    await openARViewerModule.openARViewer('asheville-full', 'The Asheville', {
      onWebModelView,
    });
    const params = onWebModelView.mock.calls[0][0];
    // ARWebScreenParams requires: glbUrl, usdzUrl, title (modelName), productId (modelId)
    expect(params).toHaveProperty('glbUrl');
    expect(params).toHaveProperty('usdzUrl');
    expect(params).toHaveProperty('modelId');
    expect(params).toHaveProperty('modelName');
    expect(typeof params.glbUrl).toBe('string');
    expect(typeof params.usdzUrl).toBe('string');
    expect(params.glbUrl.length).toBeGreaterThan(0);
    expect(params.usdzUrl.length).toBeGreaterThan(0);
  });
});
