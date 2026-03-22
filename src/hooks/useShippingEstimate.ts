/**
 * @module useShippingEstimate
 *
 * Returns a compact shipping estimate for a given product, suitable for
 * display as a one-line badge on the Product Detail Screen (cm-6qt).
 *
 * Strategy:
 *  1. Get user's ZIP from their default saved address (or '28801' NC default).
 *  2. If a Wix client is available, call fetchShippingEstimate() and take the
 *     first option's icon, deliveryTime, badge, and badgeStyle.
 *  3. Fall back silently to getDeliveryEstimate() (local zip-prefix logic) if
 *     the API is unavailable or returns no options — never block the UI.
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { useAddressBook } from '@/hooks/useAddressBook';
import { getDeliveryEstimate } from '@/utils/deliveryEstimate';

const DEFAULT_ZIP = '28801'; // Asheville, NC — Carolina Futons origin

export interface ShippingEstimateResult {
  icon: string;
  label: string | null;
  badge: string | null;
  badgeStyle: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useShippingEstimate(productId: string): ShippingEstimateResult {
  const wixClient = useOptionalWixClient();
  const { defaultAddress } = useAddressBook();

  const zip = defaultAddress?.zip?.trim() || DEFAULT_ZIP;

  const [icon, setIcon] = useState('🚚');
  const [label, setLabel] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [badgeStyle, setBadgeStyle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLabel(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setIsLoading(true);

      // Live API path
      if (wixClient) {
        try {
          const result = await wixClient.fetchShippingEstimate(zip, [
            { productId, quantity: 1 },
          ]);

          if (!cancelled && result.success && Array.isArray(result.options) && result.options.length > 0) {
            const first = result.options[0] as Record<string, unknown>;
            setIcon(typeof first.icon === 'string' ? first.icon : '🚚');
            setLabel(typeof first.deliveryTime === 'string' ? first.deliveryTime : null);
            setBadge(typeof first.badge === 'string' ? first.badge : null);
            setBadgeStyle(typeof first.badgeStyle === 'string' ? first.badgeStyle : null);
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
        setIsLoading(false);
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [wixClient, productId, zip]);

  return { icon, label, badge, badgeStyle, isLoading, error: null };
}
