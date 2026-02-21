import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

describe('Design Tokens', () => {
  describe('colors', () => {
    it('defines all required color tokens', () => {
      expect(colors.sandBase).toBeDefined();
      expect(colors.sandLight).toBeDefined();
      expect(colors.sandDark).toBeDefined();
      expect(colors.espresso).toBeDefined();
      expect(colors.espressoLight).toBeDefined();
      expect(colors.mountainBlue).toBeDefined();
      expect(colors.mountainBlueDark).toBeDefined();
      expect(colors.mountainBlueLight).toBeDefined();
      expect(colors.sunsetCoral).toBeDefined();
      expect(colors.sunsetCoralDark).toBeDefined();
      expect(colors.sunsetCoralLight).toBeDefined();
      expect(colors.mauve).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.muted).toBeDefined();
      expect(colors.white).toBeDefined();
    });

    it('uses valid hex color format', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      Object.entries(colors).forEach(([key, value]) => {
        expect(value).toMatch(hexPattern);
      });
    });

    it('has correct primary brand colors', () => {
      expect(colors.sandBase).toBe('#E8D5B7');
      expect(colors.espresso).toBe('#3A2518');
      expect(colors.mountainBlue).toBe('#5B8FA8');
    });
  });

  describe('spacing', () => {
    it('defines spacing scale from xs to xxxl', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
      expect(spacing.xxxl).toBe(64);
    });

    it('spacing values increase monotonically', () => {
      const values = Object.values(spacing);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('borderRadius', () => {
    it('defines semantic radius tokens', () => {
      expect(borderRadius.card).toBeDefined();
      expect(borderRadius.button).toBeDefined();
      expect(borderRadius.image).toBeDefined();
    });

    it('all values are positive numbers', () => {
      Object.values(borderRadius).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('typography', () => {
    it('defines heading font family', () => {
      expect(typography.heading.fontFamily).toBe('PlayfairDisplay');
    });

    it('defines body font family', () => {
      expect(typography.body.fontFamily).toBe('SourceSans3');
    });
  });
});
