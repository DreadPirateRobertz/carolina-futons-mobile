import { renderHook } from '@testing-library/react-native';
import { useSurfaceDetection } from '@/hooks/useSurfaceDetection';
import * as surfaceDetection from '@/services/surfaceDetection';
import * as lightingEstimation from '@/services/lightingEstimation';

jest.mock('@/services/surfaceDetection');
jest.mock('@/services/lightingEstimation');

const mockSurfaceDetection = surfaceDetection as jest.Mocked<typeof surfaceDetection>;
const mockLighting = lightingEstimation as jest.Mocked<typeof lightingEstimation>;

beforeEach(() => {
  jest.clearAllMocks();

  mockSurfaceDetection.getDetectedPlanes.mockReturnValue([]);
  mockSurfaceDetection.getDetectionState.mockReturnValue('initializing');
  mockSurfaceDetection.startDetection.mockImplementation(() => {});
  mockSurfaceDetection.stopDetection.mockImplementation(() => {});
  mockSurfaceDetection.resetDetection.mockImplementation(() => {});
  mockSurfaceDetection.hitTest.mockReturnValue(null);

  mockLighting.getCurrentLightEstimate.mockReturnValue({
    ambientIntensity: 350,
    ambientColorTemperature: 4500,
    primaryLightDirection: { x: 0.3, y: -0.8, z: 0.5 },
    primaryLightIntensity: 0.6,
    timestamp: Date.now(),
  });
  mockLighting.computeShadowParams.mockReturnValue({
    opacity: 0.25,
    blur: 8,
    offsetX: -2.4,
    offsetY: 6.4,
    color: 'rgba(0, 0, 10, 0.25)',
  });
  mockLighting.classifyLighting.mockReturnValue('normal');
  mockLighting.getLightingWarning.mockReturnValue(null);
  mockLighting.startLightingEstimation.mockImplementation(() => {});
  mockLighting.stopLightingEstimation.mockImplementation(() => {});
});

describe('useSurfaceDetection', () => {
  it('starts detection and lighting on mount', () => {
    renderHook(() => useSurfaceDetection());

    expect(mockSurfaceDetection.startDetection).toHaveBeenCalledTimes(1);
    expect(mockLighting.startLightingEstimation).toHaveBeenCalledTimes(1);
  });

  it('stops detection and lighting on unmount', () => {
    const { unmount } = renderHook(() => useSurfaceDetection());
    unmount();

    expect(mockSurfaceDetection.stopDetection).toHaveBeenCalled();
    expect(mockLighting.stopLightingEstimation).toHaveBeenCalled();
    expect(mockSurfaceDetection.resetDetection).toHaveBeenCalled();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useSurfaceDetection());

    expect(result.current.detectionState).toBe('initializing');
    expect(result.current.planes).toEqual([]);
    expect(result.current.hasFloor).toBe(false);
    expect(result.current.hasWall).toBe(false);
    expect(result.current.isActive).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('updates planes when callback fires', () => {
    const mockPlane: surfaceDetection.DetectedPlane = {
      id: 'plane-1',
      type: 'floor',
      alignment: 'horizontal',
      center: { x: 0.5, y: 0.65, z: 1.5 },
      extent: { width: 2, height: 1.5 },
      rotation: 0,
      confidence: 0.85,
      lastUpdated: Date.now(),
    };

    mockSurfaceDetection.startDetection.mockImplementation((_config, callbacks) => {
      // Simulate plane detection
      mockSurfaceDetection.getDetectedPlanes.mockReturnValue([mockPlane]);
      callbacks?.onPlaneDetected?.(mockPlane);
    });

    const { result } = renderHook(() => useSurfaceDetection());

    expect(result.current.planes).toHaveLength(1);
    expect(result.current.planes[0].type).toBe('floor');
    expect(result.current.hasFloor).toBe(true);
  });

  it('updates detection state on callback', () => {
    mockSurfaceDetection.startDetection.mockImplementation((_config, callbacks) => {
      callbacks?.onStateChanged?.('scanning');
    });

    const { result } = renderHook(() => useSurfaceDetection());
    expect(result.current.detectionState).toBe('scanning');
  });

  it('captures errors from detection', () => {
    const error: surfaceDetection.SurfaceDetectionError = {
      code: 'NOT_SUPPORTED',
      message: 'AR not available',
    };

    mockSurfaceDetection.startDetection.mockImplementation((_config, callbacks) => {
      callbacks?.onError?.(error);
    });

    const { result } = renderHook(() => useSurfaceDetection());
    expect(result.current.error).toEqual(error);
  });

  it('provides shadow params from lighting', () => {
    const { result } = renderHook(() => useSurfaceDetection());

    expect(result.current.shadowParams).toEqual({
      opacity: 0.25,
      blur: 8,
      offsetX: -2.4,
      offsetY: 6.4,
      color: 'rgba(0, 0, 10, 0.25)',
    });
  });

  it('provides lighting condition', () => {
    const { result } = renderHook(() => useSurfaceDetection());

    expect(result.current.lightingCondition).toBe('normal');
    expect(result.current.lightingWarning).toBeNull();
  });

  it('delegates hitTest to service', () => {
    const mockAnchor: surfaceDetection.PlacementAnchor = {
      planeId: 'plane-1',
      position: { x: 0.5, y: 0.5 },
      worldPosition: { x: 0.5, y: 0, z: 1.5 },
      isValid: true,
      distance: 1.5,
    };
    mockSurfaceDetection.hitTest.mockReturnValue(mockAnchor);

    const { result } = renderHook(() => useSurfaceDetection());
    const anchor = result.current.performHitTest(0.5, 0.5);

    expect(mockSurfaceDetection.hitTest).toHaveBeenCalledWith(0.5, 0.5);
    expect(anchor).toEqual(mockAnchor);
  });

  it('passes config to startDetection', () => {
    const config = { detectVertical: false, maxPlanes: 4 };
    renderHook(() => useSurfaceDetection(config));

    expect(mockSurfaceDetection.startDetection).toHaveBeenCalledWith(config, expect.any(Object));
  });
});
