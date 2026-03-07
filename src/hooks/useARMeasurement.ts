/**
 * @module useARMeasurement
 *
 * AR room measurement hook. Lets users tap two points on detected surfaces
 * to measure wall-to-wall distance, then compares against selected futon
 * dimensions to show "Fits!" or "Too large" feedback.
 */
import { useState, useCallback } from 'react';

export type Point3D = { x: number; y: number; z: number };
export type MeasurementState = 'idle' | 'placing-first' | 'placing-second' | 'measured';

export interface ModelDimensions {
  width: number;
  depth: number;
  height: number;
}

function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2) + Math.pow(b.z - a.z, 2));
}

function metersToFeetInches(meters: number): string {
  const totalInches = meters * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}' ${inches}"`;
}

export function useARMeasurement() {
  const [state, setState] = useState<MeasurementState>('idle');
  const [points, setPoints] = useState<Point3D[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [distanceDisplay, setDistanceDisplay] = useState('');

  const activate = useCallback(() => {
    setState('placing-first');
    setPoints([]);
    setDistanceMeters(0);
    setDistanceDisplay('');
  }, []);

  const deactivate = useCallback(() => {
    setState('idle');
    setPoints([]);
    setDistanceMeters(0);
    setDistanceDisplay('');
  }, []);

  const reset = useCallback(() => {
    setState('placing-first');
    setPoints([]);
    setDistanceMeters(0);
    setDistanceDisplay('');
  }, []);

  const placePoint = useCallback(
    (point: Point3D) => {
      if (state === 'idle' || state === 'measured') return;

      if (state === 'placing-first') {
        setPoints([point]);
        setState('placing-second');
      } else if (state === 'placing-second') {
        setPoints((prev) => {
          const newPoints = [...prev, point];
          const dist = distance3D(prev[0], point);
          setDistanceMeters(dist);
          setDistanceDisplay(metersToFeetInches(dist));
          return newPoints;
        });
        setState('measured');
      }
    },
    [state],
  );

  const checkFit = useCallback(
    (dimensions: ModelDimensions): boolean | null => {
      if (state !== 'measured' || distanceMeters === 0) return null;
      return dimensions.width <= distanceMeters;
    },
    [state, distanceMeters],
  );

  return {
    state,
    points,
    distanceMeters,
    distanceDisplay,
    activate,
    deactivate,
    reset,
    placePoint,
    checkFit,
  };
}
