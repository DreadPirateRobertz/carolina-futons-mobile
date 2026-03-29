// src/services/__tests__/livingSky.test.ts
import { computeLivingSky, getSeason } from '../livingSky';

// Snapshot a few known states to catch regressions in the keyframe tables
describe('computeLivingSky', () => {
  it('returns a valid state object for midnight (0 min)', () => {
    const state = computeLivingSky(0);
    expect(state.skyColors).toHaveLength(4);
    expect(state.ridgeColors).toHaveProperty('r1');
    expect(state.ridgeColors).toHaveProperty('r4');
    expect(state.sunPos.opacity).toBe(0);
    expect(state.starOpacity).toBeGreaterThan(0.5);
    expect(state.moonPos.opacity).toBeGreaterThan(0.5);
  });

  it('returns a valid state for noon (720 min)', () => {
    const state = computeLivingSky(720);
    expect(state.sunPos.opacity).toBeGreaterThan(0.9);
    expect(state.starOpacity).toBe(0);
    expect(state.moonPos.opacity).toBe(0);
    expect(state.birdOpacity).toBe(0);
  });

  it('golden hour sunset has birds and glow', () => {
    const state = computeLivingSky(18.5 * 60); // 18:30
    expect(state.birdOpacity).toBeGreaterThan(0.8);
    expect(state.glowColors[0]).not.toBe('transparent');
    expect(state.rimOpacity).toBeGreaterThan(0.5);
  });

  it('wraps 1440 min (midnight) back to 0', () => {
    const a = computeLivingSky(0);
    const b = computeLivingSky(1440);
    expect(a.skyColors).toEqual(b.skyColors);
  });

  it('wraps negative minutes correctly', () => {
    const state = computeLivingSky(-60); // -1h = 23:00
    expect(state.skyColors).toHaveLength(4);
    expect(state.starOpacity).toBeGreaterThan(0);
  });

  it('CF+ perk shifts golden hour 60 min earlier', () => {
    const regular = computeLivingSky(18.5 * 60, { isCFPlus: false });
    const cfplus = computeLivingSky(17.5 * 60, { isCFPlus: false });
    const cfplusEarly = computeLivingSky(18.5 * 60, { isCFPlus: true });
    // CF+ at 18:30 should match non-CF+ at 17:30
    expect(cfplusEarly.birdOpacity).toBeCloseTo(cfplus.birdOpacity, 2);
    expect(cfplusEarly.birdOpacity).not.toBeCloseTo(regular.birdOpacity, 2);
  });

  it('throws on non-finite input', () => {
    expect(() => computeLivingSky(NaN)).toThrow(TypeError);
    expect(() => computeLivingSky(Infinity)).toThrow(TypeError);
  });

  it('returns fireflies at night', () => {
    const night = computeLivingSky(1 * 60); // 01:00
    expect(night.fireflyOpacity).toBeGreaterThan(0.3);
  });

  it('animationHint is flicker at night (fireflies active)', () => {
    const night = computeLivingSky(1 * 60);
    expect(night.animationHint).toBe('flicker');
  });

  it('animationHint is slow-drift at golden hour', () => {
    const golden = computeLivingSky(17.5 * 60 + 30); // middle of golden hour
    expect(golden.animationHint).toBe('slow-drift');
  });

  it('weatherLabel is a non-empty string', () => {
    const state = computeLivingSky(720);
    expect(typeof state.weatherLabel).toBe('string');
    expect(state.weatherLabel.length).toBeGreaterThan(0);
  });

  it('interpolates smoothly between keyframes (no sudden jumps)', () => {
    // Check that adjacent minutes have close sky colors (not jumps)
    const a = computeLivingSky(719);
    const b = computeLivingSky(721);
    // Top sky color should be nearly identical around noon
    expect(a.skyColors[0]).toBe(b.skyColors[0]); // same keyframe range
  });

  it('navBg and navText are valid color strings', () => {
    for (const mins of [0, 360, 720, 1080]) {
      const state = computeLivingSky(mins);
      expect(state.navBg).toMatch(/^#[0-9a-fA-F]{6}$|^rgba?\(/);
      expect(state.navText).toMatch(/^#[0-9a-fA-F]{6}$|^rgba?\(/);
    }
  });
});

describe('getSeason', () => {
  it('returns spring for March', () => {
    expect(getSeason(new Date('2026-03-15'))).toBe('spring');
  });
  it('returns summer for July', () => {
    expect(getSeason(new Date('2026-07-01'))).toBe('summer');
  });
  it('returns fall for October', () => {
    expect(getSeason(new Date('2026-10-01'))).toBe('fall');
  });
  it('returns winter for December', () => {
    expect(getSeason(new Date('2026-12-25'))).toBe('winter');
  });
  it('returns winter for January', () => {
    expect(getSeason(new Date('2026-01-10'))).toBe('winter');
  });
  it('defaults to current date', () => {
    const result = getSeason();
    expect(['spring', 'summer', 'fall', 'winter']).toContain(result);
  });
});
