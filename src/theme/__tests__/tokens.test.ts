import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
  easing,
} from '@/theme/tokens';

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

    it('matches canonical brand palette (sharedTokens.js)', () => {
      // These values MUST match cfutons/src/public/sharedTokens.js
      // If this test fails, the palettes have diverged — sync them.
      const canonical: Record<string, string> = {
        sandBase: '#E8D5B7',
        sandLight: '#F2E8D5',
        sandDark: '#D4BC96',
        espresso: '#3A2518',
        espressoLight: '#5C4033',
        mountainBlue: '#5B8FA8',
        mountainBlueDark: '#3D6B80',
        mountainBlueLight: '#A8CCD8',
        sunsetCoral: '#E8845C',
        sunsetCoralDark: '#C96B44',
        sunsetCoralLight: '#F2A882',
        mauve: '#C9A0A0',
        offWhite: '#FAF7F2',
        white: '#FFFFFF',
        skyGradientTop: '#B8D4E3',
        skyGradientBottom: '#F0C87A',
        overlay: 'rgba(58, 37, 24, 0.6)',
        success: '#4A7C59',
        error: '#E8845C',
        muted: '#999999',
        mutedBrown: '#8B7355',
      };
      Object.entries(canonical).forEach(([key, value]) => {
        expect(colors[key as keyof typeof colors]).toBe(value);
      });
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
    it('defines duration and easing for each transition', () => {
      for (const key of ['fast', 'medium', 'slow', 'cardHover'] as const) {
        expect(transitions[key]).toHaveProperty('duration');
        expect(transitions[key]).toHaveProperty('easing');
        expect(typeof transitions[key].duration).toBe('number');
        expect(typeof transitions[key].easing).toBe('function');
      }
    });

    it('durations increase from fast to slow', () => {
      expect(transitions.fast.duration).toBeLessThan(transitions.medium.duration);
      expect(transitions.medium.duration).toBeLessThan(transitions.slow.duration);
    });

    it('cardHover uses Material standard curve', () => {
      expect(transitions.cardHover.duration).toBe(300);
      expect(transitions.cardHover.easing).toBe(easing.cardHover);
    });
  });

  describe('easing', () => {
    it('defines all easing functions', () => {
      expect(typeof easing.ease).toBe('function');
      expect(typeof easing.cardHover).toBe('function');
      expect(typeof easing.easeIn).toBe('function');
      expect(typeof easing.easeOut).toBe('function');
    });

    it('easing functions return values in [0,1] range', () => {
      // Easing.bezier returns a function that maps t ∈ [0,1] → value
      for (const fn of Object.values(easing)) {
        expect(fn(0)).toBeCloseTo(0, 1);
        expect(fn(1)).toBeCloseTo(1, 1);
        // Mid-point should be between 0 and 1
        const mid = fn(0.5);
        expect(mid).toBeGreaterThanOrEqual(0);
        expect(mid).toBeLessThanOrEqual(1);
      }
    });
  });
});
