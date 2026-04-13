/**
 * @module useShippingEstimate
 *
 * Returns shipping estimate for a given product — suitable for display on the
 * Product Detail Screen (cm-6qt / cm-9yn).
 *
 * Strategy:
 *  1. Zip resolution: `zipOverride` (user-entered) > default saved address > NC default.
 *  2. If a Wix client is available, call fetchShippingEstimate() and take all returned
 *     options. First option drives icon/label/badge for the compact badge.
 *     `isEstimate` is false when live data is returned.
 *  3. Fall back silently to getDeliveryEstimate() (local zip-prefix logic) if the API
 *     is unavailable or returns no options — never block the UI.
 *     `isEstimate` is true for fallback results.
 *  4. `zipOverride` is persisted to AsyncStorage so the user's zip survives navigation.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { useAddressBook } from '@/hooks/useAddressBook';
import { getDeliveryEstimate } from '@/utils/deliveryEstimate';

const DEFAULT_ZIP = '28801'; // Asheville, NC — Carolina Futons origin
export const SHIPPING_ZIP_STORAGE_KEY = '@shipping_estimate_zip';

export interface ShippingOption {
  code: string;
  title: string;
  price: string;
  currency: string;
  deliveryTime: string | null;
  badge: string | null;
  badgeStyle: string | null;
  icon: string;
}

export interface ShippingEstimateResult {
  icon: string;
  label: string | null;
  badge: string | null;
  badgeStyle: string | null;
  /** All rate options from the live API. Empty when using local fallback. */
  options: ShippingOption[];
  /** True when result is a local zip-prefix estimate, false when from live API. */
  isEstimate: boolean;
  isLoading: boolean;
  error: Error | null;
}

function normalizeOption(opt: Record<string, unknown>): ShippingOption {
  return {
    code: typeof opt.code === 'string' ? opt.code : '',
    title: typeof opt.title === 'string' ? opt.title : '',
    price: typeof opt.price === 'string' ? opt.price : '0.00',
    currency: typeof opt.currency === 'string' ? opt.currency : 'USD',
    deliveryTime: typeof opt.deliveryTime === 'string' ? opt.deliveryTime : null,
    badge: typeof opt.badge === 'string' ? opt.badge : null,
    badgeStyle: typeof opt.badgeStyle === 'string' ? opt.badgeStyle : null,
    icon: typeof opt.icon === 'string' ? opt.icon : '🚚',
  };
}

export function useShippingEstimate(
  productId: string,
  zipOverride?: string,
): ShippingEstimateResult {
  const wixClient = useOptionalWixClient();
  const { defaultAddress } = useAddressBook();

  const trimmedOverride = zipOverride?.trim() ?? '';
  const zip = trimmedOverride || defaultAddress?.zip?.trim() || DEFAULT_ZIP;

  const [icon, setIcon] = useState('🚚');
  const [label, setLabel] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [badgeStyle, setBadgeStyle] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [isEstimate, setIsEstimate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Persist user-entered zip so it survives navigation
  useEffect(() => {
    if (trimmedOverride) {
      AsyncStorage.setItem(SHIPPING_ZIP_STORAGE_KEY, trimmedOverride).catch(() => {});
    }
  }, [trimmedOverride]);

  useEffect(() => {
    if (!productId) {
      setLabel(null);
      setOptions([]);
      setIsEstimate(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setIsLoading(true);

      // Live API path
      if (wixClient) {
        try {
          const result = await wixClient.fetchShippingEstimate(zip, [{ productId, quantity: 1 }]);

          if (
            !cancelled &&
            result.success &&
            Array.isArray(result.options) &&
            result.options.length > 0
          ) {
            const normalized = result.options.map((opt) =>
              normalizeOption(opt as Record<string, unknown>),
            );
            const first = normalized[0];
            setIcon(first.icon);
            setLabel(first.deliveryTime);
            setBadge(first.badge);
            setBadgeStyle(first.badgeStyle);
            setOptions(normalized);
            setIsEstimate(false);
            setIsLoading(false);
            return;
          }
        } catch {
          // fall through to local estimate — never block UI
        }
      }

      // Local fallback
      if (!cancelled) {
        setIcon('🚚');
        setLabel(getDeliveryEstimate(zip));
        setBadge(null);
        setBadgeStyle(null);
        setOptions([]);
        setIsEstimate(true);
        setIsLoading(false);
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [wixClient, productId, zip]);

  return { icon, label, badge, badgeStyle, options, isEstimate, isLoading, error: null };
}
