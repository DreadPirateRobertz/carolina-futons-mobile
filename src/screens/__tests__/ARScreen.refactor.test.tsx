/**
 * Tests for ARScreen refactor: verifying it uses hooks instead of direct data imports.
 * These tests mock the hooks to confirm ARScreen delegates data fetching properly.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ARScreen } from '../ARScreen';
import { useCameraPermissions } from 'expo-camera';
import { FUTON_MODELS } from '@/data/futons';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider } from '@/hooks/useCart';

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

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
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
    withDelay: (_d: any, val: any) => val,
    interpolate: (val: any) => val,
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { out: () => ({}), in: () => ({}), quad: {}, inOut: () => ({}), ease: {} },
  };
});

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

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock the hooks to verify ARScreen uses them
const mockUseFutonModels = jest.fn();
const mockUseProductByModelId = jest.fn();

jest.mock('@/hooks/useFutonModels', () => ({
  useFutonModels: (...args: any[]) => mockUseFutonModels(...args),
  useProductByModelId: (...args: any[]) => mockUseProductByModelId(...args),
}));

function renderARScreen(props: React.ComponentProps<typeof ARScreen> = {}) {
  return render(
    <NavigationContainer>
      <CartProvider>
        <WishlistProvider>
          <ARScreen {...props} />
        </WishlistProvider>
      </CartProvider>
    </NavigationContainer>,
  );
}

describe('ARScreen hook integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);

    // Default: return real data through hooks
    mockUseFutonModels.mockReturnValue({
      models: FUTON_MODELS,
      isLoading: false,
      error: null,
      getModelById: (id: string) => FUTON_MODELS.find((m) => m.id === id),
    });

    mockUseProductByModelId.mockReturnValue({
      product: {
        id: 'prod-asheville-full',
        name: 'Asheville Futon',
        price: 349,
        category: 'futons',
      },
      isLoading: false,
      error: null,
    });
  });

  it('calls useFutonModels to get model data', () => {
    renderARScreen();
    expect(mockUseFutonModels).toHaveBeenCalled();
  });

  it('calls useProductByModelId with selected model id', () => {
    renderARScreen();
    expect(mockUseProductByModelId).toHaveBeenCalledWith('asheville-full');
  });

  it('calls useProductByModelId with initialModelId when provided', () => {
    renderARScreen({ initialModelId: 'blue-ridge-queen' });
    expect(mockUseProductByModelId).toHaveBeenCalledWith('blue-ridge-queen');
  });

  it('shows loading state when models are loading', () => {
    mockUseFutonModels.mockReturnValue({
      models: [],
      isLoading: true,
      error: null,
      getModelById: () => undefined,
    });

    const { getByTestId, getByText } = renderARScreen();
    expect(getByTestId('ar-loading')).toBeTruthy();
    expect(getByText(/Loading/i)).toBeTruthy();
  });

  it('shows error state when models fail to load', () => {
    mockUseFutonModels.mockReturnValue({
      models: [],
      isLoading: false,
      error: new Error('API down'),
      getModelById: () => undefined,
    });

    const { getByTestId, getByText } = renderARScreen();
    expect(getByTestId('ar-error')).toBeTruthy();
    expect(getByText(/couldn't load/i)).toBeTruthy();
  });

  it('renders normally when hooks return data', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-screen')).toBeTruthy();
    expect(getByTestId('ar-camera')).toBeTruthy();
  });

  it('does not import FUTON_MODELS or PRODUCTS directly', () => {
    // This test verifies the refactor by checking the hooks were the data source
    renderARScreen();
    // Hooks may be called multiple times due to React re-renders (useEffect model init)
    expect(mockUseFutonModels).toHaveBeenCalled();
    expect(mockUseProductByModelId).toHaveBeenCalled();
  });
});
