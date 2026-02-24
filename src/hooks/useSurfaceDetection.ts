/**
 * React hook for AR surface detection and lighting estimation.
 *
 * Wraps surfaceDetection + lightingEstimation services into a reactive hook
 * that components consume for plane visualization and furniture placement.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startDetection,
  stopDetection,
  getDetectedPlanes,
  getDetectionState,
  hitTest,
  resetDetection,
  type DetectedPlane,
  type PlacementAnchor,
  type DetectionState,
  type SurfaceDetectionConfig,
  type SurfaceDetectionError,
} from '@/services/surfaceDetection';
import {
  startLightingEstimation,
  stopLightingEstimation,
  getCurrentLightEstimate,
  computeShadowParams,
  classifyLighting,
  getLightingWarning,
  type LightEstimate,
  type ShadowParams,
  type LightingCondition,
} from '@/services/lightingEstimation';

export interface UseSurfaceDetectionResult {
  /** Current detection state */
  detectionState: DetectionState;
  /** All detected planes */
  planes: DetectedPlane[];
  /** Whether at least one floor plane is detected */
  hasFloor: boolean;
  /** Whether at least one wall plane is detected */
  hasWall: boolean;
  /** Current lighting estimate */
  lightEstimate: LightEstimate;
  /** Computed shadow parameters for furniture rendering */
  shadowParams: ShadowParams;
  /** Current lighting condition classification */
  lightingCondition: LightingCondition;
  /** User-facing lighting warning, or null if adequate */
  lightingWarning: string | null;
  /** Perform a hit-test at screen coordinates to find a placement point */
  performHitTest: (screenX: number, screenY: number) => PlacementAnchor | null;
  /** Whether detection is actively running */
  isActive: boolean;
  /** Last error, if any */
  error: SurfaceDetectionError | null;
}

/**
 * Hook for AR surface detection with lighting estimation.
 *
 * Starts detection automatically when mounted, stops on unmount.
 * Provides reactive state updates as planes are detected and lighting changes.
 */
export function useSurfaceDetection(
  config?: Partial<SurfaceDetectionConfig>,
): UseSurfaceDetectionResult {
  const [detectionState, setDetectionState] = useState<DetectionState>('initializing');
  const [planes, setPlanes] = useState<DetectedPlane[]>([]);
  const [lightEstimate, setLightEstimate] = useState<LightEstimate>(getCurrentLightEstimate());
  const [error, setError] = useState<SurfaceDetectionError | null>(null);
  const [isActive, setIsActive] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    setIsActive(true);

    startDetection(configRef.current, {
      onPlaneDetected: () => {
        setPlanes(getDetectedPlanes());
      },
      onPlaneUpdated: () => {
        setPlanes(getDetectedPlanes());
      },
      onPlaneRemoved: () => {
        setPlanes(getDetectedPlanes());
      },
      onStateChanged: (state) => {
        setDetectionState(state);
      },
      onError: (err) => {
        setError(err);
      },
    });

    startLightingEstimation((estimate) => {
      setLightEstimate(estimate);
    });

    return () => {
      stopDetection();
      stopLightingEstimation();
      resetDetection();
      setIsActive(false);
    };
  }, []);

  const performHitTest = useCallback(
    (screenX: number, screenY: number): PlacementAnchor | null => {
      return hitTest(screenX, screenY);
    },
    [],
  );

  const hasFloor = planes.some((p) => p.type === 'floor');
  const hasWall = planes.some((p) => p.type === 'wall');
  const shadowParams = computeShadowParams(lightEstimate);
  const lightingCondition = classifyLighting(lightEstimate);
  const lightingWarning = getLightingWarning(lightEstimate);

  return {
    detectionState,
    planes,
    hasFloor,
    hasWall,
    lightEstimate,
    shadowParams,
    lightingCondition,
    lightingWarning,
    performHitTest,
    isActive,
    error,
  };
}
