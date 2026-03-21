/**
 * Tests for checkout security validation utilities.
 *
 * Security items implemented client-side (per zhora/dallas requirements):
 * 1. Amount validation — reject zero, negative, non-finite, or > $99,999 amounts
 * 2. Product ID validation — reject empty, non-string, injection-pattern IDs
 * 3. PII scrubbing — error messages must not contain card numbers / CVV patterns
 * 4. Post-checkout navigation allowlist — only known screen names are accepted
 *
 * Items 2 (session fixation) and 3 (CSRF token) are server-side responsibilities
 * handled by Wix eCommerce backend and documented in security/BOUNDARY.md.
 */
import {
  validateCheckoutAmount,
  validateProductIds,
  scrubPiiFromError,
  isAllowedPostCheckoutScreen,
} from '../checkoutSecurity';

describe('validateCheckoutAmount', () => {
  describe('valid amounts', () => {
    it('accepts a normal positive amount', () => {
      expect(validateCheckoutAmount(422.43)).toBe(true);
    });

    it('accepts the minimum valid amount ($0.50)', () => {
      expect(validateCheckoutAmount(0.5)).toBe(true);
    });

    it('accepts an integer amount', () => {
      expect(validateCheckoutAmount(349)).toBe(true);
    });

    it('accepts the maximum valid amount ($99,999)', () => {
      expect(validateCheckoutAmount(99999)).toBe(true);
    });
  });

  describe('invalid amounts', () => {
    it('rejects zero', () => {
      expect(validateCheckoutAmount(0)).toBe(false);
    });

    it('rejects negative amounts', () => {
      expect(validateCheckoutAmount(-1)).toBe(false);
    });

    it('rejects amounts below minimum ($0.50)', () => {
      expect(validateCheckoutAmount(0.49)).toBe(false);
    });

    it('rejects amounts above maximum ($99,999)', () => {
      expect(validateCheckoutAmount(100000)).toBe(false);
    });

    it('rejects NaN', () => {
      expect(validateCheckoutAmount(NaN)).toBe(false);
    });

    it('rejects Infinity', () => {
      expect(validateCheckoutAmount(Infinity)).toBe(false);
    });

    it('rejects -Infinity', () => {
      expect(validateCheckoutAmount(-Infinity)).toBe(false);
    });

    it('rejects amounts with more than 2 decimal places', () => {
      // $349.001 is not a valid monetary amount
      expect(validateCheckoutAmount(349.001)).toBe(false);
    });
  });
});

describe('validateProductIds', () => {
  describe('valid IDs', () => {
    it('accepts a list of valid product IDs', () => {
      expect(validateProductIds(['prod-001', 'prod-002'])).toBe(true);
    });

    it('accepts IDs with hyphens and alphanumerics', () => {
      expect(validateProductIds(['asheville-full:natural-linen'])).toBe(true);
    });

    it('accepts a single valid ID', () => {
      expect(validateProductIds(['blue-ridge-queen:slate-gray'])).toBe(true);
    });
  });

  describe('invalid IDs', () => {
    it('rejects an empty array', () => {
      expect(validateProductIds([])).toBe(false);
    });

    it('rejects an empty string ID', () => {
      expect(validateProductIds([''])).toBe(false);
    });

    it('rejects IDs containing SQL injection patterns', () => {
      expect(validateProductIds(["prod-001'; DROP TABLE orders; --"])).toBe(false);
    });

    it('rejects IDs containing script injection', () => {
      expect(validateProductIds(['<script>alert(1)</script>'])).toBe(false);
    });

    it('rejects IDs that are too long (>128 chars)', () => {
      expect(validateProductIds(['a'.repeat(129)])).toBe(false);
    });

    it('rejects a mix of valid and invalid IDs', () => {
      expect(validateProductIds(['prod-001', ''])).toBe(false);
    });

    it('rejects IDs with null bytes', () => {
      expect(validateProductIds(['prod-\x00001'])).toBe(false);
    });

    it('rejects IDs with path traversal patterns', () => {
      expect(validateProductIds(['../../../etc/passwd'])).toBe(false);
    });
  });
});

describe('scrubPiiFromError', () => {
  describe('scrubs card-like patterns', () => {
    it('masks a 16-digit card number', () => {
      const msg = 'Card 4111111111111111 was declined';
      expect(scrubPiiFromError(msg)).not.toContain('4111111111111111');
    });

    it('masks a card number with spaces', () => {
      const msg = 'Card 4111 1111 1111 1111 declined';
      expect(scrubPiiFromError(msg)).not.toMatch(/\d{4} \d{4} \d{4} \d{4}/);
    });

    it('masks a card number with dashes', () => {
      const msg = 'Card 4111-1111-1111-1111 declined';
      expect(scrubPiiFromError(msg)).not.toMatch(/\d{4}-\d{4}-\d{4}-\d{4}/);
    });

    it('masks a 3-digit CVV pattern after "cvv:"', () => {
      const msg = 'cvv: 123 is invalid';
      expect(scrubPiiFromError(msg)).not.toContain('123');
    });

    it('masks a 4-digit CVV (Amex)', () => {
      const msg = 'cvv: 1234 failed verification';
      expect(scrubPiiFromError(msg)).not.toContain('1234');
    });

    it('masks a 15-digit AmEx card number', () => {
      const msg = 'Card 378282246310005 was declined';
      expect(scrubPiiFromError(msg)).not.toContain('378282246310005');
    });

    it('masks a formatted AmEx card number (4-6-5)', () => {
      const msg = 'Card 3782-822463-10005 declined';
      expect(scrubPiiFromError(msg)).not.toMatch(/\d{4}-\d{6}-\d{5}/);
    });

    it('masks a formatted AmEx card number with spaces (4-6-5)', () => {
      const msg = 'Card 3782 822463 10005 declined';
      expect(scrubPiiFromError(msg)).not.toMatch(/\d{4} \d{6} \d{5}/);
    });
  });

  describe('preserves safe content', () => {
    it('preserves normal error messages', () => {
      const msg = 'Payment declined by issuing bank';
      expect(scrubPiiFromError(msg)).toBe(msg);
    });

    it('preserves order IDs that look like numbers but are short', () => {
      const msg = 'Order CF-042 failed';
      expect(scrubPiiFromError(msg)).toBe(msg);
    });

    it('preserves the word "card" without numbers', () => {
      const msg = 'Card payment was declined';
      expect(scrubPiiFromError(msg)).toBe(msg);
    });

    it('returns empty string for empty input', () => {
      expect(scrubPiiFromError('')).toBe('');
    });
  });
});

describe('isAllowedPostCheckoutScreen', () => {
  describe('allowed screens', () => {
    it('allows PaymentConfirmation', () => {
      expect(isAllowedPostCheckoutScreen('PaymentConfirmation')).toBe(true);
    });

    it('allows OrderSuccess', () => {
      expect(isAllowedPostCheckoutScreen('OrderSuccess')).toBe(true);
    });

    it('allows Tabs (reset to home)', () => {
      expect(isAllowedPostCheckoutScreen('Tabs')).toBe(true);
    });

    it('allows OrderHistory', () => {
      expect(isAllowedPostCheckoutScreen('OrderHistory')).toBe(true);
    });

    it('allows OrderDetail', () => {
      expect(isAllowedPostCheckoutScreen('OrderDetail')).toBe(true);
    });

    it('allows OrderConfirmation (legacy deep-links)', () => {
      expect(isAllowedPostCheckoutScreen('OrderConfirmation')).toBe(true);
    });
  });

  describe('blocked screens', () => {
    it('blocks arbitrary screen names', () => {
      expect(isAllowedPostCheckoutScreen('MaliciousScreen')).toBe(false);
    });

    it('blocks empty string', () => {
      expect(isAllowedPostCheckoutScreen('')).toBe(false);
    });

    it('blocks URL-shaped strings', () => {
      expect(isAllowedPostCheckoutScreen('https://evil.com')).toBe(false);
    });

    it('blocks screens with path traversal', () => {
      expect(isAllowedPostCheckoutScreen('../Login')).toBe(false);
    });

    it('blocks null-byte injection', () => {
      expect(isAllowedPostCheckoutScreen('Tabs\x00')).toBe(false);
    });

    it('is case-sensitive (Tabs ≠ tabs)', () => {
      expect(isAllowedPostCheckoutScreen('tabs')).toBe(false);
    });
  });
});
