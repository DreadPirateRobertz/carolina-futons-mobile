import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import { ARScreen } from '../ARScreen';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { WishlistProvider } from '@/hooks/useWishlist';

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
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
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
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef(({ children, ...props }: any, ref: any) =>
      createElement(View, { ...props, ref }, children),
    ),
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

/** Helper to render ARScreen with required providers */
function renderARScreen(props: React.ComponentProps<typeof ARScreen> = {}) {
  return render(
    <WishlistProvider>
      <ARScreen {...props} />
    </WishlistProvider>,
  );
}

describe('ARScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
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

    it('shows loading state when permission is null (not yet determined)', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);
      const { getByTestId, getByText, queryByTestId } = renderARScreen();
      expect(getByTestId('ar-loading')).toBeTruthy();
      expect(getByText('Initializing camera...')).toBeTruthy();
      expect(queryByTestId('ar-camera')).toBeNull();
      expect(queryByTestId('ar-controls')).toBeNull();
    });

    it('shows permission request screen when not granted', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);
      const { getByTestId, getByText, queryByTestId } = renderARScreen();
      expect(getByTestId('ar-permission')).toBeTruthy();
      expect(getByText('See Futons in Your Room')).toBeTruthy();
      expect(getByText(/Point your camera at your room/)).toBeTruthy();
      expect(getByTestId('ar-grant-permission')).toBeTruthy();
      expect(getByText('Allow Camera Access')).toBeTruthy();
      expect(queryByTestId('ar-camera')).toBeNull();
    });

    it('requests permission when Allow Camera Access button is pressed', () => {
      const mockRequest = jest.fn();
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, mockRequest]);
      const { getByTestId } = renderARScreen();
      fireEvent.press(getByTestId('ar-grant-permission'));
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('shows "Maybe Later" dismiss only when onClose is provided', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);

      const { queryByTestId, rerender } = render(
        <WishlistProvider>
          <ARScreen />
        </WishlistProvider>,
      );
      expect(queryByTestId('ar-permission-dismiss')).toBeNull();

      const onClose = jest.fn();
      rerender(
        <WishlistProvider>
          <ARScreen onClose={onClose} />
        </WishlistProvider>,
      );
      expect(queryByTestId('ar-permission-dismiss')).toBeTruthy();
    });

    it('"Maybe Later" calls onClose when pressed', () => {
      const onClose = jest.fn();
      (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);
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

    it('shows gesture instruction hint', () => {
      const { getByText } = renderARScreen();
      expect(getByText(/Drag to position · Pinch to resize · Two-finger rotate/)).toBeTruthy();
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

    it('wishlist button toggles to "Saved!" on press', () => {
      jest.useFakeTimers();
      const { getByTestId, getByText } = renderARScreen();
      fireEvent.press(getByTestId('ar-wishlist'));
      // Immediately shows "Saved!" feedback
      expect(getByText('Saved!')).toBeTruthy();
      // After 2s, switches to "Wishlisted"
      act(() => { jest.advanceTimersByTime(2000); });
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
});
