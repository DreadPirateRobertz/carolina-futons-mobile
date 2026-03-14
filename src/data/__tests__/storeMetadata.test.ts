/**
 * Tests for store listing metadata completeness.
 */
import { STORE_METADATA } from '../storeMetadata';

describe('Store listing metadata', () => {
  describe('iOS metadata', () => {
    it('has app name within 30 char limit', () => {
      expect(STORE_METADATA.ios.appName.length).toBeLessThanOrEqual(30);
    });

    it('has subtitle within 30 char limit', () => {
      expect(STORE_METADATA.ios.subtitle.length).toBeLessThanOrEqual(30);
    });

    it('has description within 4000 char limit', () => {
      expect(STORE_METADATA.ios.description.length).toBeLessThanOrEqual(4000);
      expect(STORE_METADATA.ios.description.length).toBeGreaterThan(100);
    });

    it('has keywords within 100 char limit (comma-separated)', () => {
      expect(STORE_METADATA.ios.keywords.join(',').length).toBeLessThanOrEqual(100);
    });

    it('has promotional text within 170 char limit', () => {
      expect(STORE_METADATA.ios.promotionalText.length).toBeLessThanOrEqual(170);
    });

    it('has a primary category', () => {
      expect(STORE_METADATA.ios.primaryCategory).toBeTruthy();
    });

    it('has a privacy policy URL', () => {
      expect(STORE_METADATA.ios.privacyPolicyUrl).toMatch(/^https:\/\//);
    });

    it('has screenshot specifications for required device sizes', () => {
      const sizes = STORE_METADATA.ios.screenshotSpecs;
      expect(sizes['6.7']).toBeDefined();
      expect(sizes['6.5']).toBeDefined();
      expect(sizes['5.5']).toBeDefined();
    });
  });

  describe('Android metadata', () => {
    it('has title within 30 char limit', () => {
      expect(STORE_METADATA.android.title.length).toBeLessThanOrEqual(30);
    });

    it('has short description within 80 char limit', () => {
      expect(STORE_METADATA.android.shortDescription.length).toBeLessThanOrEqual(80);
    });

    it('has full description within 4000 char limit', () => {
      expect(STORE_METADATA.android.fullDescription.length).toBeLessThanOrEqual(4000);
      expect(STORE_METADATA.android.fullDescription.length).toBeGreaterThan(100);
    });

    it('has a category', () => {
      expect(STORE_METADATA.android.category).toBeTruthy();
    });

    it('has screenshot specifications for required device sizes', () => {
      const sizes = STORE_METADATA.android.screenshotSpecs;
      expect(sizes).toHaveProperty('phone');
      expect(sizes).toHaveProperty('7inch');
      expect(sizes).toHaveProperty('10inch');
    });
  });

  describe('screenshot plan', () => {
    it('has at least 5 screenshot scenes defined', () => {
      expect(STORE_METADATA.screenshotPlan.length).toBeGreaterThanOrEqual(5);
    });

    it('each scene has a name and description', () => {
      for (const scene of STORE_METADATA.screenshotPlan) {
        expect(scene.name).toBeTruthy();
        expect(scene.description).toBeTruthy();
      }
    });
  });
});
