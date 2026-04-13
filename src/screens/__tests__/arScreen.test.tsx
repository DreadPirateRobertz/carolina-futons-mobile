import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ARScreen } from '../ARScreen';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { gamificationRateLimiter } from '@/utils/gamificationRateLimit';

// Mock expo-camera
jest.mock('expo-camera', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ({ children, testID, facing }: any) =>
      createElement(View, { testID, accessibilityHint: facing }, children),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

// Mock expo-haptics — use jest.fn() inline to avoid hoisting issues
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock gesture handler
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

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    withSpring: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals[0],
    withTiming: (val: any) => val,
    withDelay: (_delay: any, val: any) => val,
    interpolate: (val: any) => val,
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { out: () => ({}), quad: {}, inOut: () => ({}), ease: {}, in: () => ({}) },
  };
});

// Mock surface detection hook
jest.mock('@/hooks/useSurfaceDetection', () => ({
  useSurfaceDetection: () => ({
    detectionState: 'tracking',
    planes: [
      {
        id: 'plane-1',
        type: 'floor',
        alignment: 'horizontal',
        center: { x: 0.5, y: 0.65, z: 1.5 },
        extent: { width: 2.5, height: 1.8 },
        rotation: 0,
        confidence: 0.85,
        lastUpdated: Date.now(),
      },
    ],
    hasFloor: true,
    hasWall: false,
    lightEstimate: {
      ambientIntensity: 350,
      ambientColorTemperature: 4500,
      primaryLightDirection: { x: 0.3, y: -0.8, z: 0.5 },
      primaryLightIntensity: 0.6,
      timestamp: Date.now(),
    },
    shadowParams: {
      opacity: 0.25,
      blur: 8,
      offsetX: -2.4,
      offsetY: 6.4,
      color: 'rgba(0, 0, 10, 0.25)',
    },
    lightingCondition: 'normal',
    lightingWarning: null,
    performHitTest: jest.fn(() => ({
      planeId: 'plane-1',
      position: { x: 0.5, y: 0.5 },
      worldPosition: { x: 0.5, y: 0, z: 1.5 },
      isValid: true,
      distance: 1.5,
    })),
    isActive: true,
    error: null,
  }),
}));

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  const MockViewShot = forwardRef(({ children, ...props }: any, ref: any) =>
    createElement(View, { ...props, ref }, children),
  );
  MockViewShot.displayName = 'MockViewShot';
  return {
    __esModule: true,
    default: MockViewShot,
    captureRef: jest.fn(() => Promise.resolve('/tmp/screenshot.png')),
  };
});

// Mock expo-media-library
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
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

// Mock useGalleryFallback hook
const mockGalleryFallback = {
  imageUri: null as string | null,
  isGalleryMode: false,
  cameraUnavailable: false,
  pickImage: jest.fn(),
  clearImage: jest.fn(),
};
jest.mock('@/hooks/useGalleryFallback', () => ({
  useGalleryFallback: () => mockGalleryFallback,
}));

// Mock useModelLoader hook
const mockModelLoader: { status: any; load: jest.Mock; reset: jest.Mock; prefetch: jest.Mock } = {
  status: { state: 'idle' },
  load: jest.fn(),
  reset: jest.fn(),
  prefetch: jest.fn(),
};
jest.mock('@/hooks/useModelLoader', () => ({
  useModelLoader: () => mockModelLoader,
}));

// Mock useAROnboarding hook
const mockAROnboarding = {
  isLoading: false,
  hasSeenAROnboarding: true,
  completeAROnboarding: jest.fn(),
  currentStep: 0,
  totalSteps: 3,
  nextStep: jest.fn(),
  prevStep: jest.fn(),
};
jest.mock('@/hooks/useAROnboarding', () => ({
  useAROnboarding: () => mockAROnboarding,
}));

// Mock useFutonModels for controlling isLoading
const mockUseFutonModels = jest.fn();
jest.mock('@/hooks/useFutonModels', () => {
  const actual = jest.requireActual('@/hooks/useFutonModels');
  return {
    ...actual,
    useFutonModels: () => mockUseFutonModels(),
  };
});

/** Helper to render ARScreen with required providers */
function renderARScreen(props: React.ComponentProps<typeof ARScreen> = {}) {
  return render(
    <ThemeProvider>
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <NavigationContainer>
          <CartProvider>
            <WishlistProvider>
              <ARScreen {...props} />
            </WishlistProvider>
          </CartProvider>
        </NavigationContainer>
      </ConnectivityProvider>
    </ThemeProvider>,
  );
}

describe('ARScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    mockCameraPermission.state = 'granted';
    mockCameraPermission.granted = true;
    mockCameraPermission.settingsInstructions = null;
    mockAROnboarding.hasSeenAROnboarding = true;
    mockAROnboarding.isLoading = false;
    mockGalleryFallback.imageUri = null;
    mockGalleryFallback.isGalleryMode = false;
    mockGalleryFallback.cameraUnavailable = false;
    mockModelLoader.status = { state: 'idle' };
    // Default: models loaded, not loading
    mockUseFutonModels.mockReturnValue({
      models: FUTON_MODELS,
      fabrics: [],
      isLoading: false,
      error: null,
      getModel: (id: string) => FUTON_MODELS.find((m) => m.id === id),
      getModelById: (id: string) => FUTON_MODELS.find((m) => m.id === id),
      getFabric: () => undefined,
      getModelForProduct: () => undefined,
      refresh: jest.fn(),
    });
  });

  // =========================================================================
  // Permission Flow
  // =========================================================================
  describe('Camera Permission Flow', () => {
    it('renders camera view when permission granted', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-screen')).toBeTruthy();
      expect(getByTestId('ar-camera')).toBeTruthy();
      expect(getByTestId('ar-futon-overlay')).toBeTruthy();
      expect(getByTestId('ar-controls')).toBeTruthy();
    });

    it('shows priming screen when permission is undetermined', () => {
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      const { getByTestId, getByText, queryByTestId } = renderARScreen();
      expect(getByTestId('ar-permission')).toBeTruthy();
      expect(getByText('See Futons in Your Room')).toBeTruthy();
      expect(getByTestId('ar-grant-permission')).toBeTruthy();
      expect(queryByTestId('ar-camera')).toBeNull();
    });

    it('shows permission request screen when denied', () => {
      mockCameraPermission.state = 'denied';
      mockCameraPermission.granted = false;
      const { getByTestId, getByText, queryByTestId } = renderARScreen();
      expect(getByTestId('ar-permission')).toBeTruthy();
      expect(getByText('Camera Access Needed')).toBeTruthy();
      expect(getByText('Allow Camera Access')).toBeTruthy();
      expect(queryByTestId('ar-camera')).toBeNull();
    });

    it('requests permission when Allow Camera Access button is pressed', () => {
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-grant-permission'));
      expect(mockCameraPermission.request).toHaveBeenCalledTimes(1);
    });

    it('shows settings screen when denied permanently', () => {
      mockCameraPermission.state = 'denied-permanently';
      mockCameraPermission.granted = false;
      mockCameraPermission.settingsInstructions = 'Open Settings > Carolina Futons > Camera';
      const { getByTestId, getByText, queryByTestId } = renderARScreen();
      expect(getByTestId('ar-permission-settings')).toBeTruthy();
      expect(getByText('Camera Access Required')).toBeTruthy();
      expect(getByText('Open Settings')).toBeTruthy();
      expect(getByText(/Open Settings > Carolina Futons/)).toBeTruthy();
      expect(queryByTestId('ar-camera')).toBeNull();
    });

    it('opens settings when Open Settings button is pressed', () => {
      mockCameraPermission.state = 'denied-permanently';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-open-settings'));
      expect(mockCameraPermission.openSettings).toHaveBeenCalledTimes(1);
    });

    it('shows dismiss button on permission screen', () => {
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      const { queryByTestId } = renderARScreen();
      expect(queryByTestId('ar-permission-dismiss')).toBeTruthy();
    });

    it('dismiss calls onClose when pressed', () => {
      const onClose = jest.fn();
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen({ onClose });
      fireEvent.press(getByTestId('ar-permission-dismiss'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Camera View UI Elements
  // =========================================================================
  describe('Camera View UI', () => {
    it('uses back-facing camera', () => {
      const { getByTestId } = renderARScreen();
      const camera = getByTestId('ar-camera');
      expect(camera.props.accessibilityHint).toBe('back');
    });

    it('shows context-aware instruction hint', () => {
      const { getByText } = renderARScreen();
      // In tracking state with no placement, shows tap-to-place hint
      expect(getByText('Tap on the floor to place furniture')).toBeTruthy();
    });

    it('renders touch area for placing furniture', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-touch-area')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const { getByTestId } = renderARScreen({ testID: 'custom-ar' });
      expect(getByTestId('custom-ar')).toBeTruthy();
    });

    it('uses default testID "ar-screen" when not provided', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-screen')).toBeTruthy();
    });

    it('renders Carolina Futons watermark', () => {
      const { getByTestId, getByText } = renderARScreen();
      expect(getByTestId('ar-watermark')).toBeTruthy();
      expect(getByText('Carolina Futons')).toBeTruthy();
      expect(getByText('carolinafutons.com')).toBeTruthy();
    });
  });

  // =========================================================================
  // Model Selection
  // =========================================================================
  describe('Model Selection', () => {
    it('defaults to first model (Asheville) when no initialModelId', () => {
      const { getAllByText } = renderARScreen();
      expect(getAllByText('The Asheville').length).toBeGreaterThanOrEqual(1);
    });

    it('uses initialModelId when valid', () => {
      const { getAllByText } = renderARScreen({ initialModelId: 'pisgah-twin' });
      expect(getAllByText('The Pisgah').length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to first model when initialModelId is invalid', () => {
      const { getAllByText } = renderARScreen({ initialModelId: 'nonexistent-model' });
      expect(getAllByText(FUTON_MODELS[0].name).length).toBeGreaterThanOrEqual(1);
    });

    it('renders all 4 model selector chips', () => {
      const { getByTestId } = renderARScreen();
      for (const model of FUTON_MODELS) {
        expect(getByTestId(`ar-model-${model.id}`)).toBeTruthy();
      }
    });

    it('switches to selected model on chip press', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-model-biltmore-loveseat'));
      expect(getAllByText('The Biltmore').length).toBeGreaterThanOrEqual(1);
    });

    it('updates price when switching to more expensive model', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      expect(getAllByText(/\$349\.00/).length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(getAllByText(/\$449\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('updates price when switching to cheaper model', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      fireEvent.press(getByTestId('ar-model-pisgah-twin'));
      expect(getAllByText(/\$279\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('each model chip shows model tagline', () => {
      const { getByText } = renderARScreen();
      for (const model of FUTON_MODELS) {
        expect(getByText(model.tagline)).toBeTruthy();
      }
    });

    it('model chips have accessibility labels and roles', () => {
      const { getByTestId } = renderARScreen();
      for (const model of FUTON_MODELS) {
        const chip = getByTestId(`ar-model-${model.id}`);
        expect(chip.props.accessibilityLabel).toBe(model.name);
        expect(chip.props.accessibilityRole).toBe('button');
      }
    });
  });

  // =========================================================================
  // Fabric Selection
  // =========================================================================
  describe('Fabric Selection', () => {
    it('renders all 8 fabric swatches', () => {
      const { getByTestId } = renderARScreen();
      for (const fabric of FABRICS) {
        expect(getByTestId(`ar-fabric-${fabric.id}`)).toBeTruthy();
      }
    });

    it('defaults to first fabric shown in subtitle', () => {
      const { getAllByText } = renderARScreen();
      // Price subtitle: "The Asheville · Natural Linen"
      expect(getAllByText(/Natural Linen/).length).toBeGreaterThanOrEqual(1);
    });

    it('switches fabric on swatch press', () => {
      const { getByTestId, getAllByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      expect(getAllByText(/Mountain Blue/).length).toBeGreaterThanOrEqual(1);
    });

    it('updates total price when selecting premium fabric (+$29)', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      expect(getAllByText(/\$349\.00/).length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      expect(getAllByText(/\$378\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('updates total price with most expensive fabric (+$49)', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      fireEvent.press(getByTestId('ar-fabric-espresso-brown'));
      expect(getAllByText(/\$398\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('price updates correctly with model + fabric combination', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      // Blue Ridge ($449) + Charcoal (+$49) = $498
      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      fireEvent.press(getByTestId('ar-fabric-charcoal'));
      expect(getAllByText(/\$498\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('price returns to base when switching back to free fabric', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      expect(getAllByText(/\$378\.00/).length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-fabric-natural-linen'));
      expect(getAllByText(/\$349\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('fabric swatches have accessibility labels with price for premium fabrics', () => {
      const { getByTestId } = renderARScreen();

      const freeSwatch = getByTestId('ar-fabric-natural-linen');
      expect(freeSwatch.props.accessibilityLabel).toBe('Natural Linen');

      const premSwatch = getByTestId('ar-fabric-mountain-blue');
      expect(premSwatch.props.accessibilityLabel).toBe('Mountain Blue (+$29.00)');
    });

    it('fabric swatches have correct selected accessibility state', () => {
      const { getByTestId } = renderARScreen();

      const first = getByTestId('ar-fabric-natural-linen');
      expect(first.props.accessibilityState).toEqual({ selected: true });

      const other = getByTestId('ar-fabric-mountain-blue');
      expect(other.props.accessibilityState).toEqual({ selected: false });
    });
  });

  // =========================================================================
  // Dimension Overlay
  // =========================================================================
  describe('Dimension Overlay', () => {
    it('dimensions are hidden by default', () => {
      const { queryByText } = renderARScreen();
      expect(queryByText(/4'6" W/)).toBeNull();
    });

    it('shows W/D/H text after toggle press', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      // Asheville: 54" W, 34" D, 33" H
      expect(getByText(/4'6" W/)).toBeTruthy();
      expect(getByText(/2'10" D/)).toBeTruthy();
      expect(getByText(/2'9" H/)).toBeTruthy();
    });

    it('hides dimensions after second toggle press', () => {
      const { getByTestId, queryByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      expect(queryByText(/4'6" W/)).toBeTruthy();
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      expect(queryByText(/4'6" W/)).toBeNull();
    });

    it('shows correct dimensions for Pisgah model', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-model-pisgah-twin'));
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      // Pisgah: 39" = 3'3", 32" = 2'8", 31" = 2'7"
      expect(getByText(/3'3" W/)).toBeTruthy();
      expect(getByText(/2'8" D/)).toBeTruthy();
      expect(getByText(/2'7" H/)).toBeTruthy();
    });

    it('shows correct dimensions for Blue Ridge model', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      // Blue Ridge: 60" = 5', 36" = 3', 35" = 2'11"
      expect(getByText(/5' W/)).toBeTruthy();
      expect(getByText(/3' D/)).toBeTruthy();
      expect(getByText(/2'11" H/)).toBeTruthy();
    });

    it('dimension toggle has correct accessibility', () => {
      const { getByTestId } = renderARScreen();
      const toggle = getByTestId('ar-dimension-toggle');
      expect(toggle.props.accessibilityLabel).toBe('Toggle dimensions');
      expect(toggle.props.accessibilityRole).toBe('button');
    });
  });

  // =========================================================================
  // Close/Navigation
  // =========================================================================
  describe('Close Button', () => {
    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderARScreen({ onClose });
      fireEvent.press(getByTestId('ar-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not crash when close pressed without onClose prop', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-close'));
    });

    it('close button has correct accessibility', () => {
      const { getByTestId } = renderARScreen();
      const close = getByTestId('ar-close');
      expect(close.props.accessibilityLabel).toBe('Close AR view');
      expect(close.props.accessibilityRole).toBe('button');
    });
  });

  // =========================================================================
  // Add to Cart
  // =========================================================================
  describe('Add to Cart', () => {
    it('renders add to cart button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-add-to-cart')).toBeTruthy();
    });

    it('shows correct price on add to cart button', () => {
      const { getByText } = renderARScreen();
      expect(getByText(/Add to Cart — \$349\.00/)).toBeTruthy();
    });

    it('add to cart price updates with model change', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(getByText(/Add to Cart — \$449\.00/)).toBeTruthy();
    });

    it('add to cart price updates with fabric change', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-fabric-espresso-brown'));
      expect(getByText(/Add to Cart — \$398\.00/)).toBeTruthy();
    });

    it('add to cart button has correct accessibility', () => {
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-add-to-cart');
      expect(btn.props.accessibilityLabel).toBe('Add to cart');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('adds selected model and fabric to cart when pressed', () => {
      let cartItems: any[] = [];
      function CartSpy() {
        const { items } = useCart();
        cartItems = items;
        return null;
      }
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
          <NavigationContainer>
            <CartProvider>
              <WishlistProvider>
                <CartSpy />
                <ARScreen />
              </WishlistProvider>
            </CartProvider>
          </NavigationContainer>
        </ConnectivityProvider>,
      );
      fireEvent.press(getByTestId('ar-add-to-cart'));
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].model.id).toBe(FUTON_MODELS[0].id);
      expect(cartItems[0].fabric.id).toBe(FUTON_MODELS[0].fabrics[0].id);
      expect(cartItems[0].quantity).toBe(1);
    });

    it('adds correct model after switching model and fabric', () => {
      let cartItems: any[] = [];
      function CartSpy() {
        const { items } = useCart();
        cartItems = items;
        return null;
      }
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
          <NavigationContainer>
            <CartProvider>
              <WishlistProvider>
                <CartSpy />
                <ARScreen />
              </WishlistProvider>
            </CartProvider>
          </NavigationContainer>
        </ConnectivityProvider>,
      );
      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      fireEvent.press(getByTestId('ar-add-to-cart'));
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].model.id).toBe('blue-ridge-queen');
      expect(cartItems[0].fabric.id).toBe('mountain-blue');
    });

    it('fires haptic feedback when adding to cart', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-add-to-cart'));
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Haptic Feedback
  // =========================================================================
  describe('Haptic Feedback', () => {
    it('fires selection haptic on model change', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('fires selection haptic on fabric change', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('fires impact haptic on dimension toggle', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-dimension-toggle'));
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('fires Impact.Heavy (not Light or Medium) when furniture is placed', () => {
      // renderARScreen defaults: detectionState='tracking', hasFloor=true,
      // performHitTest returns { isValid: true, worldPosition: [...], planeId: '...' }
      const { getByTestId } = renderARScreen();
      jest.clearAllMocks();
      fireEvent.press(getByTestId('ar-touch-area'), {
        nativeEvent: { locationX: 195, locationY: 422 },
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
      expect(Haptics.impactAsync).not.toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(Haptics.impactAsync).not.toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  // =========================================================================
  // Share / Save / Wishlist
  // =========================================================================
  describe('Share and Save', () => {
    it('renders share button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-share')).toBeTruthy();
    });

    it('renders save to gallery button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-save-gallery')).toBeTruthy();
    });

    it('share button has correct accessibility', () => {
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-share');
      expect(btn.props.accessibilityLabel).toBe('Share AR screenshot');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('save button has correct accessibility', () => {
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-save-gallery');
      expect(btn.props.accessibilityLabel).toBe('Save to photo library');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('renders wishlist button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-wishlist')).toBeTruthy();
    });

    it('wishlist button shows "Wishlist" when not saved', () => {
      const { getByText } = renderARScreen();
      expect(getByText('Wishlist')).toBeTruthy();
    });

    it('wishlist button toggles to "Saved!" on press', async () => {
      jest.useFakeTimers();
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-wishlist'));
      // Immediately shows "Saved!" feedback
      expect(getByText('Saved!')).toBeTruthy();
      // After 2s, switches to "Wishlisted"
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(getByText('Wishlisted')).toBeTruthy();
      jest.useRealTimers();
    });

    it('wishlist button has correct accessibility label', () => {
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-wishlist');
      expect(btn.props.accessibilityLabel).toBe('Add to wishlist');
    });
  });

  // =========================================================================
  // Complex Interaction Sequences
  // =========================================================================
  describe('Complex Interaction Sequences', () => {
    it('full user flow: select model -> fabric -> toggle dims -> close', () => {
      const onClose = jest.fn();
      const { getByTestId, getAllByText, getByText } = renderARScreen({ onClose });

      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-fabric-sunset-coral'));
      expect(getAllByText(/Sunset Coral/).length).toBeGreaterThanOrEqual(1);

      // $449 + $29 = $478
      expect(getAllByText(/\$478\.00/).length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-dimension-toggle'));
      expect(getByText(/5' W/)).toBeTruthy();

      fireEvent.press(getByTestId('ar-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('switching models preserves fabric when available', () => {
      const { getByTestId, getAllByText } = renderARScreen();

      fireEvent.press(getByTestId('ar-fabric-mountain-blue'));
      expect(getAllByText(/Mountain Blue/).length).toBeGreaterThanOrEqual(1);

      fireEvent.press(getByTestId('ar-model-blue-ridge-queen'));
      expect(getAllByText(/Mountain Blue/).length).toBeGreaterThanOrEqual(1);
    });

    it('rapidly switching models does not crash', () => {
      const { getByTestId } = renderARScreen();

      for (let i = 0; i < 3; i++) {
        for (const model of FUTON_MODELS) {
          fireEvent.press(getByTestId(`ar-model-${model.id}`));
        }
      }
      expect(getByTestId('ar-screen')).toBeTruthy();
    });

    it('rapidly switching fabrics does not crash', () => {
      const { getByTestId } = renderARScreen();

      for (let i = 0; i < 3; i++) {
        for (const fabric of FABRICS) {
          fireEvent.press(getByTestId(`ar-fabric-${fabric.id}`));
        }
      }
      expect(getByTestId('ar-screen')).toBeTruthy();
    });

    it('rapidly toggling dimensions does not crash', () => {
      const { getByTestId } = renderARScreen();

      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('ar-dimension-toggle'));
      }
      expect(getByTestId('ar-screen')).toBeTruthy();
    });
  });

  // =========================================================================
  // AR Comparison Mode
  // =========================================================================
  describe('AR Comparison Mode', () => {
    it('renders compare button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-compare-toggle')).toBeTruthy();
    });

    it('comparison overlay is hidden by default', () => {
      const { queryByTestId } = renderARScreen();
      expect(queryByTestId('comparison-overlay')).toBeNull();
    });

    it('shows comparison overlay after selecting compare model', () => {
      const { getByTestId } = renderARScreen();
      // Enter compare mode
      fireEvent.press(getByTestId('ar-compare-toggle'));
      // Pick a second model to compare
      fireEvent.press(getByTestId('ar-compare-model-blue-ridge-queen'));
      // Comparison overlay should appear
      expect(getByTestId('comparison-overlay')).toBeTruthy();
    });

    it('comparison overlay shows both model names', () => {
      const { getByTestId, getAllByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-compare-toggle'));
      fireEvent.press(getByTestId('ar-compare-model-blue-ridge-queen'));
      // Default model is Asheville, compare with Blue Ridge
      // Names appear in both model chips and comparison overlay
      expect(getAllByText('The Asheville').length).toBeGreaterThanOrEqual(2);
      expect(getAllByText('The Blue Ridge').length).toBeGreaterThanOrEqual(2);
    });

    it('dismisses comparison when toggle pressed again', () => {
      const { getByTestId, queryByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-compare-toggle'));
      fireEvent.press(getByTestId('ar-compare-model-blue-ridge-queen'));
      expect(getByTestId('comparison-overlay')).toBeTruthy();
      // Press compare toggle again to dismiss
      fireEvent.press(getByTestId('ar-compare-toggle'));
      expect(queryByTestId('comparison-overlay')).toBeNull();
    });
  });

  // =========================================================================
  // Screenshot Capture, Save to Gallery, and Share
  // =========================================================================
  describe('Screenshot Capture and Share', () => {
    const { captureRef } = require('react-native-view-shot');
    const MediaLibrary = require('expo-media-library');
    const Sharing = require('expo-sharing');

    it('captures AR view and shares via expo-sharing on share press', async () => {
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-share'));
      });
      expect(captureRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ format: 'png', quality: 1 }),
      );
      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        '/tmp/screenshot.png',
        expect.objectContaining({ mimeType: 'image/png' }),
      );
    });

    it('falls back to Share.share when expo-sharing unavailable', async () => {
      Sharing.isAvailableAsync.mockResolvedValueOnce(false);
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-share'));
      });
      expect(captureRef).toHaveBeenCalled();
      // Falls back to RN Share.share — Sharing.shareAsync should NOT be called
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('captures AR view and saves to gallery on save press', async () => {
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-save-gallery'));
      });
      expect(captureRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ format: 'png', quality: 1 }),
      );
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('/tmp/screenshot.png');
    });

    it('shows alert when media library permission denied on save', async () => {
      MediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-save-gallery'));
      });
      expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Permission Required', expect.any(String));
      alertSpy.mockRestore();
    });

    it('shows error alert when capture fails', async () => {
      captureRef.mockRejectedValueOnce(new Error('Capture error'));
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-save-gallery'));
      });
      expect(alertSpy).toHaveBeenCalledWith('Capture Failed', expect.any(String));
      expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('shows success alert after saving to gallery', async () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-save-gallery'));
      });
      expect(alertSpy).toHaveBeenCalledWith('Saved', expect.any(String));
      alertSpy.mockRestore();
    });

    it('fires haptic feedback on successful capture', async () => {
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-save-gallery'));
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('watermark is inside ViewShot capture area', () => {
      const { getByTestId } = renderARScreen();
      const watermark = getByTestId('ar-watermark');
      // Traverse up to find ViewShot — watermark must be a descendant
      let node = watermark;
      let foundViewShot = false;
      while (node.parent) {
        node = node.parent;
        // ViewShot mock renders as a View; check we pass through the camera testID
        if (node.props?.testID === 'ar-camera') {
          foundViewShot = true;
          break;
        }
      }
      expect(foundViewShot).toBe(true);
    });

    it('does not call share when capture returns null', async () => {
      captureRef.mockRejectedValueOnce(new Error('fail'));
      const { getByTestId } = renderARScreen();
      await act(async () => {
        fireEvent.press(getByTestId('ar-share'));
      });
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Gallery Fallback
  // =========================================================================
  describe('Gallery Fallback', () => {
    it('shows "Use a Photo Instead" button when permission is denied', () => {
      mockCameraPermission.state = 'denied';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
    });

    it('shows "Use a Photo Instead" button when permission is denied permanently', () => {
      mockCameraPermission.state = 'denied-permanently';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
    });

    it('shows "Use a Photo Instead" button on undetermined permission screen', () => {
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
    });

    it('calls pickImage when gallery fallback button pressed', () => {
      mockCameraPermission.state = 'denied';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-gallery-fallback'));
      expect(mockGalleryFallback.pickImage).toHaveBeenCalledTimes(1);
    });

    it('shows gallery mode when image is picked (camera denied)', () => {
      mockCameraPermission.state = 'denied';
      mockCameraPermission.granted = false;
      mockGalleryFallback.isGalleryMode = true;
      mockGalleryFallback.imageUri = 'file:///room.jpg';
      const { getByTestId } = renderARScreen();
      // Should show the AR view with gallery background instead of permission screen
      expect(getByTestId('ar-gallery-background')).toBeTruthy();
      expect(getByTestId('ar-futon-overlay')).toBeTruthy();
    });

    it('shows "Switch to Camera" button in gallery mode when camera is granted', () => {
      mockCameraPermission.state = 'granted';
      mockCameraPermission.granted = true;
      mockGalleryFallback.isGalleryMode = true;
      mockGalleryFallback.imageUri = 'file:///room.jpg';
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-switch-to-camera')).toBeTruthy();
    });

    it('calls clearImage when "Switch to Camera" pressed', () => {
      mockCameraPermission.state = 'granted';
      mockCameraPermission.granted = true;
      mockGalleryFallback.isGalleryMode = true;
      mockGalleryFallback.imageUri = 'file:///room.jpg';
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-switch-to-camera'));
      expect(mockGalleryFallback.clearImage).toHaveBeenCalledTimes(1);
    });

    it('shows camera unavailable message on simulator', () => {
      mockCameraPermission.state = 'granted';
      mockCameraPermission.granted = true;
      mockGalleryFallback.cameraUnavailable = true;
      const { getByText, getByTestId } = renderARScreen();
      expect(getByText(/camera is not available/i)).toBeTruthy();
      expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
    });

    it('gallery fallback button has correct accessibility', () => {
      mockCameraPermission.state = 'denied';
      mockCameraPermission.granted = false;
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-gallery-fallback');
      expect(btn.props.accessibilityLabel).toBe('Use a photo from your gallery');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  // =========================================================================
  // Model Loading Error and Retry
  // =========================================================================
  describe('Model Loading Error and Retry', () => {
    it('shows error message when model download fails', () => {
      mockModelLoader.status = { state: 'error', message: 'Network error' };
      const { getByText } = renderARScreen();
      expect(getByText('Network error')).toBeTruthy();
    });

    it('shows retry button when model download fails', () => {
      mockModelLoader.status = { state: 'error', message: 'Download failed' };
      const { getByTestId } = renderARScreen();
      expect(getByTestId('model-loading-retry')).toBeTruthy();
    });

    it('retry button triggers model reload', () => {
      mockModelLoader.status = { state: 'error', message: 'Download failed' };
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('model-loading-retry'));
      expect(mockModelLoader.load).toHaveBeenCalled();
    });

    it('shows progress bar during model download', () => {
      mockModelLoader.status = { state: 'downloading', progress: 0.45 };
      const { getByTestId, getByText } = renderARScreen();
      expect(getByTestId('model-loading-overlay')).toBeTruthy();
      expect(getByText(/45%/)).toBeTruthy();
    });

    it('shows checking cache state', () => {
      mockModelLoader.status = { state: 'checking-cache' };
      const { getByTestId } = renderARScreen();
      expect(getByTestId('model-loading-overlay')).toBeTruthy();
    });

    it('hides overlay when model is ready', () => {
      mockModelLoader.status = { state: 'ready', localUri: '/path/to/model.usdz' };
      const { queryByTestId } = renderARScreen();
      expect(queryByTestId('model-loading-overlay')).toBeNull();
    });
  });

  // =========================================================================
  // AR Measurement Mode (cm-7fx)
  // =========================================================================
  describe('AR Measurement Mode', () => {
    it('renders measure toggle button', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-measure-toggle')).toBeTruthy();
    });

    it('measure toggle has correct accessibility label when inactive', () => {
      const { getByTestId } = renderARScreen();
      const btn = getByTestId('ar-measure-toggle');
      expect(btn.props.accessibilityLabel).toBe('Measure room');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('measurement overlay is hidden by default', () => {
      const { queryByTestId } = renderARScreen();
      expect(queryByTestId('ar-measurement-overlay')).toBeNull();
    });

    it('pressing measure toggle activates measurement mode and shows overlay', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      expect(getByTestId('ar-measurement-overlay')).toBeTruthy();
    });

    it('measure toggle label changes to "Exit" when measurement is active', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      expect(getByText('Exit')).toBeTruthy();
    });

    it('measure toggle accessibility label updates when active', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      const btn = getByTestId('ar-measure-toggle');
      expect(btn.props.accessibilityLabel).toBe('Exit measurement mode');
    });

    it('pressing measure toggle again deactivates measurement mode', () => {
      const { getByTestId, queryByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      expect(getByTestId('ar-measurement-overlay')).toBeTruthy();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      expect(queryByTestId('ar-measurement-overlay')).toBeNull();
    });

    it('reset button appears during measurement mode', () => {
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      expect(getByTestId('ar-measure-reset')).toBeTruthy();
    });

    it('reset button is not visible when measurement is inactive', () => {
      const { queryByTestId } = renderARScreen();
      expect(queryByTestId('ar-measure-reset')).toBeNull();
    });

    it('reset button resets measurement state', () => {
      const { getByTestId, queryByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      // Place first point via camera tap
      const touchArea = getByTestId('ar-touch-area');
      fireEvent.press(touchArea, {
        nativeEvent: { locationX: 195, locationY: 422 },
      });
      // Should be in placing-second state now — reset clears it
      fireEvent.press(getByTestId('ar-measure-reset'));
      // After reset, overlay should still be visible (still active) but no points
      expect(getByTestId('ar-measurement-overlay')).toBeTruthy();
      expect(queryByText('Tap second endpoint')).toBeNull();
    });

    it('camera tap routes to measurement when measurement is active', () => {
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-measure-toggle'));
      // Initial state: placing-first
      expect(getByText('Tap first endpoint')).toBeTruthy();
      // Tap to place first point
      fireEvent.press(getByTestId('ar-touch-area'), {
        nativeEvent: { locationX: 195, locationY: 422 },
      });
      // Advances to placing-second
      expect(getByText('Tap second endpoint')).toBeTruthy();
    });

    it('measurement overlay is absent in gallery fallback mode', () => {
      mockGalleryFallback.isGalleryMode = true;
      mockGalleryFallback.imageUri = 'file:///photo.jpg';
      const { queryByTestId } = renderARScreen();
      // In gallery mode, measure is stubbed as inactive
      expect(queryByTestId('ar-measurement-overlay')).toBeNull();
    });
  });

  // =========================================================================
  // Gamification Events
  // =========================================================================
  describe('gamification events', () => {
    beforeEach(() => {
      clearEventBuffer();
      gamificationRateLimiter.reset();
    });

    it('fires gamification_ar_used on mount when a product is loaded', () => {
      renderARScreen();
      const ev = getEventBuffer().find((e) => e.name === 'gamification_ar_used');
      expect(ev).toBeTruthy();
    });

    it('includes product_id in the gamification_ar_used event', () => {
      renderARScreen();
      const ev = getEventBuffer().find((e) => e.name === 'gamification_ar_used');
      // Default model is asheville-full → product id is prod-asheville-full
      expect(ev?.properties?.product_id).toBe('prod-asheville-full');
    });

    it('fires gamification_ar_used only once per session, not on re-render', () => {
      const { rerender } = renderARScreen();
      rerender(
        <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
          <NavigationContainer>
            <CartProvider>
              <WishlistProvider>
                <ARScreen />
              </WishlistProvider>
            </CartProvider>
          </NavigationContainer>
        </ConnectivityProvider>,
      );
      const evts = getEventBuffer().filter((e) => e.name === 'gamification_ar_used');
      expect(evts).toHaveLength(1);
    });

    it('does not fire gamification_ar_used when camera permission is not granted', () => {
      mockCameraPermission.state = 'undetermined';
      mockCameraPermission.granted = false;
      renderARScreen();
      const evts = getEventBuffer().filter((e) => e.name === 'gamification_ar_used');
      expect(evts).toHaveLength(0);
    });
  });

  // =========================================================================
  // Skeleton loading — cm-1be
  // =========================================================================
  describe('Skeleton loading', () => {
    it('renders skeleton when models are loading', () => {
      mockUseFutonModels.mockReturnValue({
        models: [],
        fabrics: [],
        isLoading: true,
        error: null,
        getModel: () => undefined,
        getModelById: () => undefined,
        getFabric: () => undefined,
        getModelForProduct: () => undefined,
        refresh: jest.fn(),
      });
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-models-loading')).toBeTruthy();
      expect(getByTestId('ar-models-skeleton')).toBeTruthy();
    });

    it('renders content (camera view) when models are loaded', () => {
      const { getByTestId } = renderARScreen();
      expect(getByTestId('ar-screen')).toBeTruthy();
      expect(getByTestId('ar-camera')).toBeTruthy();
    });
  });
});
