/**
 * @module useCartItemDeliveryEstimate
 *
 * Per-cart-item delivery estimate using the stored shipping ZIP and local
 * zip-prefix logic (deliveryEstimate.ts). Reads the same shipping_zip key
 * written by useProductShippingEstimate so the user only enters their zip once.
 *
 * Returns one of four modes — cm-afc:
 *   no-zip   No zip stored or invalid → hide estimate
 *   freight  Item width ≥ 54" → LTL freight notice
 *   local    NC/SC zip → 2–3 business days
 *   parcel   All other valid zips → carrier estimate
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeliveryEstimate, getDeliveryMode, type DeliveryMode } from '@/utils/deliveryEstimate';
import type { CartItem } from '@/hooks/useCart';

const STORAGE_KEY = 'shipping_zip';
const FREIGHT_DISPLAY_TEXT = 'Freight · Carrier will call to schedule';

export interface CartItemDeliveryInfo {
  mode: DeliveryMode;
  /** Human-readable delivery window, or null for no-zip */
  displayText: string | null;
  zip: string;
  isLoading: boolean;
}

export function useCartItemDeliveryEstimate(item: CartItem): CartItemDeliveryInfo {
  const [zip, setZip] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        setZip(stored ?? '');
      })
      .catch(() => {
        setZip('');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const mode = getDeliveryMode(zip, item.model.dimensions);

  let displayText: string | null = null;
  if (mode === 'freight') {
    displayText = FREIGHT_DISPLAY_TEXT;
  } else if (mode !== 'no-zip') {
    displayText = getDeliveryEstimate(zip);
  }

  return { mode, displayText, zip, isLoading };
}
