/**
 * hq-452z: Verify that key components have migrated from raw expo-image Image
 * to AppImage (which adds retry-on-error, skeleton placeholder, and error state).
 *
 * These are file-source tests — they verify code structure, not runtime behavior.
 * Behavioral retry/error tests live in categoryCard.test.tsx and collectionCard.test.tsx.
 */
import * as fs from 'fs';
import * as path from 'path';

function readComponent(name: string): string {
  return fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
}

describe('AppImage migration (hq-452z)', () => {
  describe('MiniCartDrawer', () => {
    const source = readComponent('MiniCartDrawer.tsx');

    it('does not import Image directly from expo-image', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });

  describe('ProductCard', () => {
    const source = readComponent('ProductCard.tsx');

    it('does not import Image directly from expo-image for product card rendering', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });

  describe('CollectionCard', () => {
    const source = readComponent('CollectionCard.tsx');

    it('does not import Image directly from expo-image', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });

  describe('CategoryCard', () => {
    const source = readComponent('CategoryCard.tsx');

    it('does not import Image directly from expo-image', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });

  describe('WixProductDetail', () => {
    const source = readComponent('WixProductDetail.tsx');

    it('does not import Image directly from expo-image', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });

  describe('RecommendationCarousel', () => {
    const source = readComponent('RecommendationCarousel.tsx');

    it('does not import Image directly from expo-image', () => {
      expect(source).not.toMatch(/import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]expo-image['"]/);
    });

    it('imports AppImage', () => {
      expect(source).toMatch(/AppImage/);
    });
  });
});
