/**
 * Integration tests for ARScreen capture button (hq-x7r).
 *
 * Verifies the capture button is present in AR mode, the screenshot is taken
 * via useARCapture, and that permission-denied / capture-failure errors surface
 * as Alerts. Uses the same mock setup as ARScreen.test.tsx.
 *
 * hq-x7r: AR session save — capture + share sheet.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ARScreen } from '../ARScreen';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';

// ── Mocks — mirrors ARScreen.test.tsx setup ───────────────────────────────────

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
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
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
    useAnimatedStyle: (fn: any) => { try { return fn(); } catch { return {}; } },
    withSpring: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals[0],
    withTiming: (val: any) => val,
    withDelay: (_: any, val: any) => val,
    interpolate: (val: any) => val,
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { out: () => ({}), quad: {}, inOut: () => ({}), ease: {}, in: () => ({}) },
  };
});

jest.mock('@/hooks/useSurfaceDetection', () => ({
  useSurfaceDetection: () => ({
    detectionState: 'tracking',
    planes: [{ id: 'p1', type: 'floor', alignment: 'horizontal', center: {x:0,y:0,z:0}, extent: {width:2,height:2}, rotation: 0, confidence: 0.9, lastUpdated: 0 }],
    hasFloor: true,
    hasWall: false,
    lightEstimate: null,
    shadowParams: { opacity: 0.25, blur: 8, offsetX: 0, offsetY: 0, color: 'rgba(0,0,0,0.25)' },
    lightingCondition: 'normal',
    lightingWarning: null,
    performHitTest: jest.fn(() => ({ planeId: 'p1', position: {x:0,y:0}, worldPosition: {x:0,y:0,z:0}, isValid: true, distance: 1.5 })),
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
    captureRef: jest.fn(() => Promise.resolve('/tmp/ar-shot.png')),
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

jest.mock('@/hooks/useCameraPermission', () => ({
  useCameraPermission: () => ({
    state: 'granted',
    granted: true,
    request: jest.fn(),
    openSettings: jest.fn(),
    explanation: 'Camera needed for AR.',
    settingsInstructions: null,
  }),
}));

jest.mock('@/hooks/useGalleryFallback', () => ({
  useGalleryFallback: () => ({ imageUri: null, isGalleryMode: false, cameraUnavailable: false, pickImage: jest.fn(), clearImage: jest.fn() }),
}));

jest.mock('@/hooks/useModelLoader', () => ({
  useModelLoader: () => ({ status: { state: 'idle' }, load: jest.fn(), reset: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/hooks/useAROnboarding', () => ({
  useAROnboarding: () => ({ isLoading: false, hasSeenAROnboarding: true, completeAROnboarding: jest.fn(), currentStep: 0, totalSteps: 3, nextStep: jest.fn(), prevStep: jest.fn() }),
}));

jest.mock('@/hooks/useARMeasurement', () => ({
  useARMeasurement: () => ({
    state: 'idle',
    points: [],
    distance: null,
    placePoint: jest.fn(),
    reset: jest.fn(),
    checkFit: jest.fn().mockReturnValue({ fits: true, margin: 0.5 }),
    start: jest.fn(),
    cancel: jest.fn(),
  }),
}));

jest.mock('@/services/analytics', () => ({
  events: {
    arScreenshot: jest.fn(), arShare: jest.fn(), arSaveToGallery: jest.fn(),
    arSurfaceDetected: jest.fn(), arSurfaceTracking: jest.fn(), arLightingWarning: jest.fn(),
    arModelSelected: jest.fn(), arFurniturePlaced: jest.fn(), arAddToCart: jest.fn(),
    arMaterialSwap: jest.fn(), selectFabric: jest.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderARScreen(props: React.ComponentProps<typeof ARScreen> = {}) {
  return render(
    <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
      <NavigationContainer>
        <CartProvider>
          <WishlistProvider>
            <ARScreen {...props} />
          </WishlistProvider>
        </CartProvider>
      </NavigationContainer>
    </ConnectivityProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ARScreen — capture button (hq-x7r)', () => {
  const { captureRef } = require('react-native-view-shot');
  const MediaLibrary = require('expo-media-library');
  const Sharing = require('expo-sharing');

  beforeEach(() => {
    jest.clearAllMocks();
    captureRef.mockResolvedValue('/tmp/ar-shot.png');
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    MediaLibrary.saveToLibraryAsync.mockResolvedValue(undefined);
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
  });

  it('renders the share button in AR mode', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-share')).toBeTruthy();
  });

  it('renders the save-to-gallery button in AR mode', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-save-gallery')).toBeTruthy();
  });

  it('tapping share captures the scene and opens share sheet', async () => {
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-share'));
    });

    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'png', quality: 1 }),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      '/tmp/ar-shot.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
  });

  it('tapping save captures the scene and saves to library', async () => {
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-save-gallery'));
    });

    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'png', quality: 1 }),
    );
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('/tmp/ar-shot.png');
  });

  it('shows Alert when media library permission denied', async () => {
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

  it('shows Alert when captureRef throws', async () => {
    captureRef.mockRejectedValueOnce(new Error('sensor error'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-save-gallery'));
    });

    expect(alertSpy).toHaveBeenCalledWith('Capture Failed', expect.any(String));
    alertSpy.mockRestore();
  });
});
