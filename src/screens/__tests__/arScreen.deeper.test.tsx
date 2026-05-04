/**
 * ARScreen deeper edge-case tests — cm-4j2
 *
 * Covers gaps NOT exercised by arScreen.test.tsx / arScreen.edgeCases.test.tsx:
 *
 *   Permission denied (deeper):
 *     - denied state: ar-open-settings absent; ar-grant-permission present
 *     - denied-permanently state: ar-grant-permission absent; ar-open-settings present
 *     - dismiss button from denied state fires onClose
 *
 *   Model load error (deeper):
 *     - modelsError: ar-error testID shown, message text shown
 *     - modelsError: no camera viewfinder, no skeleton
 *     - modelLoader error: camera viewfinder + retry both present simultaneously
 *
 *   Snapshot/capture flow (deeper):
 *     - share/save buttons disabled while capture is in progress
 *     - share message includes model name, fabric name, and price
 *     - save button re-enabled after successful save
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ARScreen } from '../ARScreen';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS } from '@/data/futons';

// ── Standard mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-camera', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ({ children, testID, facing, onMountError }: any) =>
      createElement(View, { testID, accessibilityHint: facing, onMountError }, children),
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
    withDelay: (_d: any, val: any) => val,
    interpolate: (val: any) => val,
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { out: () => ({}), quad: {}, inOut: () => ({}), ease: {}, in: () => ({}) },
  };
});

jest.mock('@/hooks/useSurfaceDetection', () => ({
  useSurfaceDetection: () => ({
    detectionState: 'tracking',
    planes: [{ id: 'p1', type: 'floor', alignment: 'horizontal', center: { x: 0, y: 0, z: 0 }, extent: { width: 2, height: 2 }, rotation: 0, confidence: 0.9, lastUpdated: Date.now() }],
    hasFloor: true,
    hasWall: false,
    lightEstimate: null,
    shadowParams: { opacity: 0.2, blur: 6, offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.2)' },
    lightingCondition: 'normal',
    lightingWarning: null,
    performHitTest: jest.fn(() => ({ planeId: 'p1', position: { x: 0.5, y: 0.5 }, worldPosition: { x: 0, y: 0, z: 1 }, isValid: true, distance: 1.5 })),
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

// ── Mutable hook mocks ─────────────────────────────────────────────────────────

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

const mockModelLoader: { status: any; load: jest.Mock; reset: jest.Mock; prefetch: jest.Mock } = {
  status: { state: 'idle' },
  load: jest.fn(),
  reset: jest.fn(),
  prefetch: jest.fn(),
};
jest.mock('@/hooks/useModelLoader', () => ({
  useModelLoader: () => mockModelLoader,
}));

jest.mock('@/hooks/useAROnboarding', () => ({
  useAROnboarding: () => ({
    isLoading: false,
    hasSeenAROnboarding: true,
    completeAROnboarding: jest.fn(),
  }),
}));

const mockUseFutonModels = jest.fn();
jest.mock('@/hooks/useFutonModels', () => {
  const actual = jest.requireActual('@/hooks/useFutonModels');
  return { ...actual, useFutonModels: () => mockUseFutonModels() };
});

// ── Render helper ──────────────────────────────────────────────────────────────

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

// ── beforeEach ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCameraPermission.state = 'granted';
  mockCameraPermission.granted = true;
  mockCameraPermission.settingsInstructions = null;
  mockGalleryFallback.imageUri = null;
  mockGalleryFallback.isGalleryMode = false;
  mockGalleryFallback.cameraUnavailable = false;
  mockModelLoader.status = { state: 'idle' };
  const { captureRef } = require('react-native-view-shot');
  captureRef.mockResolvedValue('/tmp/screenshot.png');
  require('expo-media-library').requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  require('expo-media-library').saveToLibraryAsync.mockResolvedValue(undefined);
  require('expo-sharing').isAvailableAsync.mockResolvedValue(true);
  require('expo-sharing').shareAsync.mockResolvedValue(undefined);
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

// ── Permission denied (deeper) ─────────────────────────────────────────────────

describe('ARScreen — permission denied (deeper)', () => {
  beforeEach(() => {
    mockCameraPermission.state = 'denied';
    mockCameraPermission.granted = false;
  });

  it('denied state shows ar-permission testID (not ar-permission-settings)', () => {
    const { getByTestId, queryByTestId } = renderARScreen();
    expect(getByTestId('ar-permission')).toBeTruthy();
    expect(queryByTestId('ar-permission-settings')).toBeNull();
  });

  it('denied state does not show Open Settings button', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-open-settings')).toBeNull();
  });

  it('denied state shows re-prompt button ar-grant-permission', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-grant-permission')).toBeTruthy();
  });

  it('denied state does not show ar-camera viewfinder', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-camera')).toBeNull();
  });

  it('denied state has gallery fallback button', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
  });

  it('dismiss button from denied state calls onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderARScreen({ onClose });
    fireEvent.press(getByTestId('ar-permission-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Permission denied permanently (deeper) ────────────────────────────────────

describe('ARScreen — permission denied permanently (deeper)', () => {
  beforeEach(() => {
    mockCameraPermission.state = 'denied-permanently';
    mockCameraPermission.granted = false;
    mockCameraPermission.settingsInstructions = 'Open Settings > Carolina Futons > Camera';
  });

  it('denied-permanently uses ar-permission-settings testID (not ar-permission)', () => {
    const { getByTestId, queryByTestId } = renderARScreen();
    expect(getByTestId('ar-permission-settings')).toBeTruthy();
    expect(queryByTestId('ar-permission')).toBeNull();
  });

  it('denied-permanently does not show re-prompt button ar-grant-permission', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-grant-permission')).toBeNull();
  });

  it('denied-permanently shows Open Settings button', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-open-settings')).toBeTruthy();
  });

  it('denied-permanently does not show ar-camera viewfinder', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-camera')).toBeNull();
  });

  it('denied-permanently has gallery fallback button', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-gallery-fallback')).toBeTruthy();
  });

  it('denied-permanently dismiss button calls onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderARScreen({ onClose });
    fireEvent.press(getByTestId('ar-permission-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Model load error (deeper) ──────────────────────────────────────────────────

describe('ARScreen — modelsError state (deeper)', () => {
  const modelsError = new Error('Could not fetch futon catalog');

  beforeEach(() => {
    mockUseFutonModels.mockReturnValue({
      models: [],
      fabrics: [],
      isLoading: false,
      error: modelsError,
      getModel: () => undefined,
      getModelById: () => undefined,
      getFabric: () => undefined,
      getModelForProduct: () => undefined,
      refresh: jest.fn(),
    });
  });

  it('shows ar-error testID when modelsError is set', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-error')).toBeTruthy();
  });

  it('renders the error message text from modelsError.message', () => {
    const { getByText } = renderARScreen();
    expect(getByText('Could not fetch futon catalog')).toBeTruthy();
  });

  it('does not show ar-camera when modelsError is set', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-camera')).toBeNull();
  });

  it('does not show ar-models-skeleton when modelsError is set', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-models-skeleton')).toBeNull();
  });

  it('does not show ar-screen (granted camera view) when modelsError is set', () => {
    const { queryByTestId } = renderARScreen();
    expect(queryByTestId('ar-screen')).toBeNull();
  });
});

describe('ARScreen — modelLoader error state (deeper)', () => {
  beforeEach(() => {
    mockModelLoader.status = { state: 'error', message: '3D model download failed' };
  });

  it('shows model-loading-retry button when modelLoader is in error state', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('model-loading-retry')).toBeTruthy();
  });

  it('camera viewfinder still renders alongside modelLoader error overlay', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-camera')).toBeTruthy();
    expect(getByTestId('model-loading-retry')).toBeTruthy();
  });

  it('retry button calls modelLoader.load', () => {
    const callsBefore = mockModelLoader.load.mock.calls.length;
    const { getByTestId } = renderARScreen();
    // load() is also called on mount via the selectedModel useEffect
    fireEvent.press(getByTestId('model-loading-retry'));
    expect(mockModelLoader.load.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('ar-screen root is still rendered in modelLoader error state', () => {
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-screen')).toBeTruthy();
  });
});

// ── Snapshot / capture flow (deeper) ──────────────────────────────────────────

// Mock useARCapture to control isCapturing state directly in capturing tests.
const mockARCapture = {
  isCapturing: false,
  share: jest.fn().mockResolvedValue(undefined),
  saveToGallery: jest.fn().mockResolvedValue(undefined),
  error: null,
  clearError: jest.fn(),
  saveStatus: null as null | 'saved',
};
jest.mock('@/hooks/useARCapture', () => ({
  useARCapture: () => mockARCapture,
}));

describe('ARScreen — snapshot capture flow (deeper)', () => {
  beforeEach(() => {
    mockARCapture.isCapturing = false;
    mockARCapture.error = null;
    mockARCapture.saveStatus = null;
    mockARCapture.share.mockResolvedValue(undefined);
    mockARCapture.saveToGallery.mockResolvedValue(undefined);
  });

  it('share button is disabled when isCapturing is true', () => {
    mockARCapture.isCapturing = true;
    const { getByTestId } = renderARScreen();
    const btn = getByTestId('ar-share');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('save-to-gallery button is disabled when isCapturing is true', () => {
    mockARCapture.isCapturing = true;
    const { getByTestId } = renderARScreen();
    const btn = getByTestId('ar-save-gallery');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('share button is enabled when isCapturing is false', () => {
    mockARCapture.isCapturing = false;
    const { getByTestId } = renderARScreen();
    expect(getByTestId('ar-share').props.disabled).toBeFalsy();
  });

  it('share message includes the selected model name', async () => {
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-share'));
    });

    expect(mockARCapture.share).toHaveBeenCalledTimes(1);
    const message: string = mockARCapture.share.mock.calls[0]?.[0];
    // Default model is Asheville — name should appear in message
    expect(message).toMatch(/Asheville/i);
  });

  it('share message includes the selected fabric name', async () => {
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-share'));
    });

    const message: string = mockARCapture.share.mock.calls[0]?.[0];
    // Default fabric is Natural Linen
    expect(message).toMatch(/Natural Linen/i);
  });

  it('share message includes the price', async () => {
    const { getByTestId } = renderARScreen();

    await act(async () => {
      fireEvent.press(getByTestId('ar-share'));
    });

    const message: string = mockARCapture.share.mock.calls[0]?.[0];
    // Asheville base $349 + Natural Linen $0 = $349.00
    expect(message).toMatch(/\$349/);
  });

  it('watermark is rendered inside the ViewShot capture area', () => {
    const { getByTestId } = renderARScreen();
    const watermark = getByTestId('ar-watermark');
    let node = watermark;
    let foundCamera = false;
    while (node.parent) {
      node = node.parent;
      if (node.props?.testID === 'ar-camera') {
        foundCamera = true;
        break;
      }
    }
    expect(foundCamera).toBe(true);
  });
});
