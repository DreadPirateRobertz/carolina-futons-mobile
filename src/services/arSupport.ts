/**
 * AR device support detection and product eligibility.
 *
 * - iOS: ARKit available on A9+ (nearly all active devices)
 * - Android: ARCore availability via Play Services
 * - Web/other: Not supported
 * - Caches results to avoid repeated native bridge calls
 * - Provides device tier for quality settings
 */

import { Platform } from 'react-native';
import type { ProductCategory } from '@/data/products';
import * as self from '@/services/arSupport';
import { hasARModel } from '@/data/models3d';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceTier = 'premium' | 'standard' | 'fallback';

interface ProductLike {
  category: ProductCategory | string;
  inStock: boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _cachedSupport: boolean | null = null;
let _cachedTier: DeviceTier | null = null;

// AR-eligible product categories (includes murphy-beds for cm-9k2)
const AR_CATEGORIES = new Set<string>(['futons', 'frames', 'murphy-beds']);

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Async check for AR support on the current device.
 * Caches the result after first call.
 */
export async function checkARSupport(): Promise<boolean> {
  if (_cachedSupport !== null) {
    return _cachedSupport;
  }

  let supported = false;

  switch (Platform.OS) {
    case 'ios':
      // ARKit available on A9+ chip — nearly all active iOS devices
      supported = true;
      break;
    case 'android':
      // In production, would query Google Play Services for ARCore.
      // For now, assume supported on Android.
      supported = true;
      break;
    default:
      // web, windows, macos — no AR support
      supported = false;
      break;
  }

  _cachedSupport = supported;
  return supported;
}

/**
 * Synchronous AR support check using cached value.
 * Returns false before checkARSupport() has been called (safe default).
 * Returns false immediately on web without needing async check.
 */
export function isARSupportedSync(): boolean {
  if (Platform.OS === 'web') return false;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  return _cachedSupport ?? false;
}

/**
 * Get device quality tier for AR rendering settings.
 * - 'premium': High-end device, full effects
 * - 'standard': Mid-range, reduced effects
 * - 'fallback': AR not supported, show 2D fallback
 */
export async function getDeviceTier(): Promise<DeviceTier> {
  if (_cachedTier !== null) {
    return _cachedTier;
  }

  const supported = await self.checkARSupport();

  if (!supported) {
    _cachedTier = 'fallback';
    return 'fallback';
  }

  // For now, iOS defaults to premium, Android to standard.
  // In production, would check specific hardware (LiDAR, GPU tier).
  const tier: DeviceTier = Platform.OS === 'ios' ? 'premium' : 'standard';
  _cachedTier = tier;
  return tier;
}

/**
 * Check if a product is eligible for AR viewing.
 * Only futons, frames, and murphy-beds that are in-stock qualify.
 */
export function isProductAREnabled(product: ProductLike): boolean {
  if (!product.inStock) return false;
  return AR_CATEGORIES.has(product.category);
}

/**
 * Map a product ID to its AR model ID.
 * Uses the 3D model catalog for dynamic lookup.
 * Returns undefined for products without AR models.
 */
export function getARModelId(productId: string): string | undefined {
  if (!hasARModel(productId)) return undefined;
  return productId.replace(/^prod-/, '');
}

/**
 * Reset cached state. Used by tests to isolate between runs.
 */
export function resetCache(): void {
  _cachedSupport = null;
  _cachedTier = null;
}
