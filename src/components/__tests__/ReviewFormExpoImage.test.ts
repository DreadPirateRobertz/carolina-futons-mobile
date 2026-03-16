/**
 * Test verifying ReviewForm uses expo-image instead of react-native Image.
 *
 * expo-image provides better performance (caching, blurhash, progressive loading)
 * and is the project standard — all other image-rendering components use it.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('ReviewForm — expo-image migration', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../ReviewForm.tsx'),
    'utf8',
  );

  it('does not import Image from react-native', () => {
    // Should not have RN Image import
    expect(source).not.toMatch(/Image.*from\s+['"]react-native['"]/);
    expect(source).not.toMatch(/from\s+['"]react-native['"].*Image/);
  });

  it('imports Image from expo-image', () => {
    expect(source).toMatch(/from\s+['"]expo-image['"]/);
  });
});
