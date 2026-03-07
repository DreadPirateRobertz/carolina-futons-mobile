/**
 * @module useFabricTransition
 *
 * Smooth spring-based scale and border animation for fabric swatch selection.
 * Selected swatches pop up slightly with an emphasized border, while
 * deselected ones settle back to normal size.
 */
import { useState, useCallback, useRef } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const SELECTED_SCALE = 1.2;
const DESELECTED_SCALE = 1;
const SPRING_CONFIG = { damping: 14, stiffness: 300 };

interface SwatchState {
  scale: { value: number };
  borderOpacity: { value: number };
}

export function useFabricTransition() {
  const [activeFabricId, setActiveFabricId] = useState<string | null>(null);
  const swatchesRef = useRef<Map<string, SwatchState>>(new Map());

  const getOrCreateSwatch = (fabricId: string): SwatchState => {
    let swatch = swatchesRef.current.get(fabricId);
    if (!swatch) {
      swatch = {
        scale: { value: DESELECTED_SCALE },
        borderOpacity: { value: 0 },
      };
      swatchesRef.current.set(fabricId, swatch);
    }
    return swatch;
  };

  const selectFabric = useCallback((fabricId: string) => {
    // Deselect previous
    swatchesRef.current.forEach((swatch) => {
      swatch.scale.value = DESELECTED_SCALE;
      swatch.borderOpacity.value = 0;
    });

    // Select new
    const swatch = getOrCreateSwatch(fabricId);
    swatch.scale.value = SELECTED_SCALE;
    swatch.borderOpacity.value = 1;

    setActiveFabricId(fabricId);
  }, []);

  const getSwatchScale = useCallback((fabricId: string) => {
    return getOrCreateSwatch(fabricId).scale;
  }, []);

  const getBorderOpacity = useCallback((fabricId: string) => {
    return getOrCreateSwatch(fabricId).borderOpacity;
  }, []);

  return {
    activeFabricId,
    selectFabric,
    getSwatchScale,
    getBorderOpacity,
  };
}
