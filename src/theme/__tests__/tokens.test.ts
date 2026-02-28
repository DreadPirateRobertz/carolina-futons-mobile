import { colors, spacing, borderRadius, typography, shadows, transitions } from '@/theme/tokens';

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
      expect(colors.offWhite).toBeDefined();
      expect(colors.white).toBeDefined();
    });

    it('has correct offWhite token matching web sharedTokens', () => {
      expect(colors.offWhite).toBe('#FAF7F2');
    });

    it('uses valid hex color format for solid colors', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      Object.entries(colors).forEach(([key, value]) => {
        if (!value.startsWith('rgba')) {
          expect(value).toMatch(hexPattern);
        }
      });
    });

    it('has correct primary brand colors', () => {
      expect(colors.sandBase).toBe('#E8D5B7');
      expect(colors.espresso).toBe('#3A2518');
      expect(colors.mountainBlue).toBe('#5B8FA8');
    });

    it('defines overlay color with alpha', () => {
      expect(colors.overlay).toMatch(/^rgba\(/);
    });
  });

  describe('spacing', () => {
    it('defines core spacing scale', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
      expect(spacing.xxxl).toBe(64);
    });

    it('defines layout spacing', () => {
      expect(spacing.section).toBe(80);
      expect(spacing.pagePadding).toBe(24);
    });

    it('all spacing values are positive', () => {
      Object.values(spacing).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('borderRadius', () => {
    it('defines semantic radius tokens', () => {
      expect(borderRadius.card).toBeDefined();
      expect(borderRadius.button).toBeDefined();
      expect(borderRadius.image).toBeDefined();
      expect(borderRadius.pill).toBeDefined();
    });

    it('all values are positive numbers', () => {
      Object.values(borderRadius).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('typography', () => {
    it('defines font families', () => {
      expect(typography.headingFamily).toBe('PlayfairDisplay_700Bold');
      expect(typography.bodyFamily).toBe('SourceSans3_400Regular');
    });

    it('defines type scale with fontSize and lineHeight', () => {
      const scaleKeys = [
        'heroTitle',
        'h1',
        'h2',
        'h3',
        'h4',
        'bodyLarge',
        'body',
        'bodySmall',
        'caption',
      ];
      scaleKeys.forEach((key) => {
        const style = typography[key as keyof typeof typography];
        expect(style).toHaveProperty('fontSize');
        expect(style).toHaveProperty('lineHeight');
      });
    });

    it('type scale decreases from heroTitle to caption', () => {
      expect(typography.heroTitle.fontSize).toBeGreaterThan(typography.h1.fontSize);
      expect(typography.h1.fontSize).toBeGreaterThan(typography.h2.fontSize);
      expect(typography.h2.fontSize).toBeGreaterThan(typography.body.fontSize);
      expect(typography.body.fontSize).toBeGreaterThan(typography.caption.fontSize);
    });

    it('defines price and button typography', () => {
      expect(typography.price.fontSize).toBeDefined();
      expect(typography.button.fontSize).toBeDefined();
    });
  });

  describe('shadows', () => {
    it('defines card shadow with required properties', () => {
      expect(shadows.card).toHaveProperty('shadowColor');
      expect(shadows.card).toHaveProperty('shadowOffset');
      expect(shadows.card).toHaveProperty('shadowOpacity');
      expect(shadows.card).toHaveProperty('shadowRadius');
      expect(shadows.card).toHaveProperty('elevation');
    });

    it('defines all shadow variants', () => {
      expect(shadows.card).toBeDefined();
      expect(shadows.cardHover).toBeDefined();
      expect(shadows.nav).toBeDefined();
      expect(shadows.modal).toBeDefined();
      expect(shadows.button).toBeDefined();
    });
  });

  describe('transitions', () => {
    it('defines timing values in milliseconds', () => {
      expect(transitions.fast).toBeLessThan(transitions.medium);
      expect(transitions.medium).toBeLessThan(transitions.slow);
    });
  });
});
