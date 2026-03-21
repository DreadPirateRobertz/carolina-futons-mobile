/**
 * @module sharedTransitionTag.test
 *
 * Tests for the sharedTransitionTag utility and the ID-normalization contract
 * that ensures ProductCard and ProductDetailScreen produce matching tags for
 * the same product — which is required for Reanimated shared-element transitions
 * to fire correctly.
 */

import { Platform } from 'react-native';
import { sharedTransitionTag } from '../sharedTransitionTag';
import { productIdToModelId, productId } from '@/data/productId';

// Restore the real sharedTransitionTag (jest.setup.js mocks it globally; these
// tests need the actual implementation).
jest.unmock('@/utils/sharedTransitionTag');
jest.unmock('../sharedTransitionTag');

/** Temporarily override Platform.OS for a single assertion. */
function withPlatformOS<T>(os: typeof Platform.OS, fn: () => T): T {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true, writable: true });
  }
}

describe('sharedTransitionTag', () => {
  it('returns the id on native platforms (ios)', () => {
    withPlatformOS('ios', () => {
      expect(sharedTransitionTag('my-tag')).toBe('my-tag');
    });
  });

  it('returns undefined on web (suppresses prop to avoid warnings)', () => {
    withPlatformOS('web', () => {
      expect(sharedTransitionTag('my-tag')).toBeUndefined();
    });
  });

  it('returns the id on android', () => {
    withPlatformOS('android', () => {
      expect(sharedTransitionTag('product-image-asheville-full')).toBe(
        'product-image-asheville-full',
      );
    });
  });
});

/**
 * Tag-format contract: both ProductCard and ProductDetailScreen must produce
 * IDENTICAL sharedTransitionTag values for the same product so the Reanimated
 * shared-element transition can match the source and destination elements.
 *
 * ProductCard receives a Product (id: 'prod-asheville-full').
 * ProductDetailScreen uses a FutonModel (id: 'asheville-full').
 * We normalize with productIdToModelId to strip the 'prod-' prefix.
 */
describe('tag format contract: ProductCard ↔ ProductDetailScreen', () => {
  /** Mirrors the tag construction in ProductCard */
  function cardTag(prodId: string): string {
    return `product-image-${productIdToModelId(productId(prodId))}`;
  }

  /** Mirrors the tag construction in ProductDetailScreen */
  function detailTag(modelId: string): string {
    return `product-image-${modelId}`;
  }

  const pairs: Array<[string, string]> = [
    ['prod-asheville-full', 'asheville-full'],
    ['prod-blue-ridge-queen', 'blue-ridge-queen'],
    ['prod-pisgah-twin', 'pisgah-twin'],
    ['prod-biltmore-loveseat', 'biltmore-loveseat'],
  ];

  it.each(pairs)(
    'tags match for product "%s" / model "%s"',
    (prodId, modelId) => {
      expect(cardTag(prodId)).toBe(detailTag(modelId));
    },
  );

  it('tag never contains the "prod-" prefix', () => {
    for (const [prodId] of pairs) {
      expect(cardTag(prodId)).not.toContain('prod-');
    }
  });

  it('tag always starts with "product-image-"', () => {
    for (const [prodId] of pairs) {
      expect(cardTag(prodId)).toMatch(/^product-image-/);
    }
  });
});
