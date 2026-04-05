/**
 * Tests for certificatePinning — cm-keo
 *
 * AC:
 *  1. validateWixEndpoint accepts allowed Wix hostnames
 *  2. validateWixEndpoint rejects unknown/unexpected hostnames
 *  3. validateWixEndpoint rejects malformed URLs
 *  4. validateWixEndpoint rejects http:// (non-HTTPS)
 *  5. WixClient constructor throws if baseUrl is not a trusted Wix host
 *  6. isAllowedWixHost utility returns correct boolean
 */

import { validateWixEndpoint, isAllowedWixHost, ALLOWED_WIX_HOSTS } from '../certificatePinning';

describe('certificatePinning', () => {
  // --- ALLOWED_WIX_HOSTS ---

  describe('ALLOWED_WIX_HOSTS', () => {
    it('includes www.wixapis.com', () => {
      expect(ALLOWED_WIX_HOSTS).toContain('www.wixapis.com');
    });

    it('includes manage.wix.com', () => {
      expect(ALLOWED_WIX_HOSTS).toContain('manage.wix.com');
    });

    it('includes frog.wix.com', () => {
      expect(ALLOWED_WIX_HOSTS).toContain('frog.wix.com');
    });
  });

  // --- isAllowedWixHost ---

  describe('isAllowedWixHost', () => {
    it('returns true for www.wixapis.com', () => {
      expect(isAllowedWixHost('www.wixapis.com')).toBe(true);
    });

    it('returns true for manage.wix.com', () => {
      expect(isAllowedWixHost('manage.wix.com')).toBe(true);
    });

    it('returns true for frog.wix.com', () => {
      expect(isAllowedWixHost('frog.wix.com')).toBe(true);
    });

    it('returns false for untrusted host', () => {
      expect(isAllowedWixHost('evil.example.com')).toBe(false);
    });

    it('returns false for wixapis.com without www (subpath attack)', () => {
      expect(isAllowedWixHost('wixapis.com')).toBe(false);
    });

    it('returns false for fake subdomain attack (www.wixapis.com.evil.com)', () => {
      expect(isAllowedWixHost('www.wixapis.com.evil.com')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isAllowedWixHost('')).toBe(false);
    });
  });

  // --- validateWixEndpoint ---

  describe('validateWixEndpoint', () => {
    it('does not throw for https://www.wixapis.com/path', () => {
      expect(() => validateWixEndpoint('https://www.wixapis.com/wix-data/v2/items')).not.toThrow();
    });

    it('does not throw for https://manage.wix.com/path', () => {
      expect(() => validateWixEndpoint('https://manage.wix.com/somepath')).not.toThrow();
    });

    it('does not throw for https://frog.wix.com/path', () => {
      expect(() => validateWixEndpoint('https://frog.wix.com/_functions/foo')).not.toThrow();
    });

    it('throws for request to unknown host', () => {
      expect(() => validateWixEndpoint('https://evil.example.com/exfil')).toThrow(
        /blocked.*untrusted/i,
      );
    });

    it('throws for http:// (non-HTTPS) even to allowed host', () => {
      expect(() => validateWixEndpoint('http://www.wixapis.com/wix-data/v2/items')).toThrow(
        /https required/i,
      );
    });

    it('throws for malformed URL', () => {
      expect(() => validateWixEndpoint('not-a-url')).toThrow(/invalid url/i);
    });

    it('throws for empty string', () => {
      expect(() => validateWixEndpoint('')).toThrow(/invalid url/i);
    });

    it('throws for subdomain spoofing attack', () => {
      expect(() => validateWixEndpoint('https://www.wixapis.com.attacker.net/steal')).toThrow(
        /blocked.*untrusted/i,
      );
    });

    it('throws for localhost (prevents dev proxy attacks in production context)', () => {
      expect(() => validateWixEndpoint('https://localhost/wix-data/v2/items')).toThrow(
        /blocked.*untrusted/i,
      );
    });
  });
});
