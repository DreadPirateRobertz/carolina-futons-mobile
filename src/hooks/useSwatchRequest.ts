/**
 * @module useSwatchRequest
 *
 * Manages fabric swatch sample requests. Users select up to 3 fabrics and
 * provide a shipping address to receive physical swatches. Persists request
 * history to AsyncStorage for rate-limiting (one request per product per 24h).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { events } from '@/services/analytics';
import type { Fabric } from '@/data/futons';

const STORAGE_KEY = '@carolina_futons_swatch_requests';
const MAX_FABRICS = 3;
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export interface SwatchAddress {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface StoredRequest {
  productId: string;
  fabricIds: string[];
  timestamp: number;
}

type SwatchStatus = 'idle' | 'submitting' | 'submitted' | 'error';

export interface SwatchRequestState {
  selectedFabrics: Fabric[];
  status: SwatchStatus;
  isSubmitting: boolean;
  hasRecentRequest: boolean;
  validationErrors: string[];
  toggleFabric: (fabric: Fabric) => void;
  clearSelection: () => void;
  submitRequest: (address: SwatchAddress) => Promise<boolean>;
  reset: () => void;
}

function validateAddress(address: SwatchAddress): string[] {
  const errors: string[] = [];
  if (!address.fullName.trim()) errors.push('name');
  if (!address.line1.trim()) errors.push('line1');
  if (!address.city.trim()) errors.push('city');
  if (!address.state.trim()) errors.push('state');
  if (!ZIP_REGEX.test(address.zip.trim())) errors.push('zip');
  return errors;
}

export function useSwatchRequest(productId: string): SwatchRequestState {
  const [selectedFabrics, setSelectedFabrics] = useState<Fabric[]>([]);
  const [status, setStatus] = useState<SwatchStatus>('idle');
  const [hasRecentRequest, setHasRecentRequest] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const submittingRef = useRef(false);

  // Check for recent requests on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const requests: StoredRequest[] = JSON.parse(stored);
          const recent = requests.find(
            (r) => r.productId === productId && Date.now() - r.timestamp < RATE_LIMIT_MS,
          );
          if (recent) setHasRecentRequest(true);
        }
      } catch {
        // Graceful degradation — allow request if storage fails
      }
    })();
  }, [productId]);

  const toggleFabric = useCallback((fabric: Fabric) => {
    setSelectedFabrics((prev) => {
      const exists = prev.some((f) => f.id === fabric.id);
      if (exists) return prev.filter((f) => f.id !== fabric.id);
      if (prev.length >= MAX_FABRICS) return prev;
      return [...prev, fabric];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFabrics([]);
  }, []);

  const submitRequest = useCallback(
    async (address: SwatchAddress): Promise<boolean> => {
      // Prevent double-tap race condition
      if (submittingRef.current) return false;

      // Validate fabrics
      if (selectedFabrics.length === 0) {
        setValidationErrors(['fabrics']);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Haptics not available
        }
        return false;
      }

      // Validate address
      const errors = validateAddress(address);
      if (errors.length > 0) {
        setValidationErrors(errors);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Haptics not available
        }
        return false;
      }

      submittingRef.current = true;
      setStatus('submitting');
      setValidationErrors([]);

      try {
        // Persist request
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const requests: StoredRequest[] = stored ? JSON.parse(stored) : [];

        const newRequest: StoredRequest = {
          productId,
          fabricIds: selectedFabrics.map((f) => f.id),
          timestamp: Date.now(),
        };

        // Remove old requests for this product, add new one
        const updated = requests.filter((r) => r.productId !== productId);
        updated.push(newRequest);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Analytics
        events.requestSwatches(
          productId,
          selectedFabrics.map((f) => f.id),
          address.state,
        );

        // Haptic success
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Haptics not available
        }

        setStatus('submitted');
        setHasRecentRequest(true);
        submittingRef.current = false;
        return true;
      } catch {
        setStatus('error');
        submittingRef.current = false;
        return false;
      }
    },
    [productId, selectedFabrics],
  );

  const reset = useCallback(() => {
    setSelectedFabrics([]);
    setStatus('idle');
    setValidationErrors([]);
    submittingRef.current = false;
  }, []);

  return {
    selectedFabrics,
    status,
    isSubmitting: status === 'submitting',
    hasRecentRequest,
    validationErrors,
    toggleFabric,
    clearSelection,
    submitRequest,
    reset,
  };
}
