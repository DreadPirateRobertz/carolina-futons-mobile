/**
 * @file useLivingSky.test.ts
 * @description TDD tests for Phase 7 useLivingSky hook + computeSkyState pure function.
 * hq-u0aqm / hq-4wgr3
 *
 * Covers:
 *  - computeSkyState: returns correct LivingSkyState shape
 *  - computeSkyState: midnight — stars visible, sun hidden
 *  - computeSkyState: noon — sun visible, stars hidden
 *  - computeSkyState: golden hour — high rimOpacity
 *  - computeSkyState: season detection (summer, fall, winter, spring)
 *  - computeSkyState: moon phase at known date
 *  - computeSkyState: precipitation — snow in winter, mist in spring, none in summer
 *  - computeSkyState: all four ridgeColors present + tree color
 *  - useLivingSky: returns valid state on mount
 *  - useLivingSky: overrideMinutes param bypasses live clock
 *  - useLivingSky: updates on 30s interval
 *  - useLivingSky: clears interval on unmount
 */

import { renderHook, act } from '@testing-library/react-native';
import { computeSkyState, useLivingSky } from '../useLivingSky';

// ─── computeSkyState (pure function) ──────────────────────────────────────────

describe('computeSkyState', () => {
  it('returns all required LivingSkyState fields', () => {
    const state = computeSkyState(720); // noon
    expect(Array.isArray(state.skyColors)).toBe(true);
    expect(state.skyColors).toHaveLength(4);
    expect(Array.isArray(state.glowColors)).toBe(true);
    expect(state.glowColors).toHaveLength(2);
    expect(state.ridgeColors).toHaveProperty('r1');
    expect(state.ridgeColors).toHaveProperty('r2');
    expect(state.ridgeColors).toHaveProperty('r3');
    expect(state.ridgeColors).toHaveProperty('r4');
    expect(state.ridgeColors).toHaveProperty('tree');
    expect(state.sunPos).toHaveProperty('cx');
    expect(state.sunPos).toHaveProperty('cy');
    expect(state.sunPos).toHaveProperty('r');
    expect(state.sunPos).toHaveProperty('opacity');
    expect(state.moonPos).toHaveProperty('cx');
    expect(state.moonPos).toHaveProperty('cy');
    expect(state.moonPos).toHaveProperty('opacity');
    expect(state.moonPos).toHaveProperty('phase');
    expect(state.moonPos.shadowOffset).toHaveProperty('dx');
    expect(state.moonPos.shadowOffset).toHaveProperty('dy');
    expect(typeof state.starOpacity).toBe('number');
    expect(typeof state.cloudOpacity).toBe('number');
    expect(typeof state.birdOpacity).toBe('number');
    expect(typeof state.fireflyOpacity).toBe('number');
    expect(typeof state.owlOpacity).toBe('number');
    expect(typeof state.rimOpacity).toBe('number');
    expect(typeof state.rimColor).toBe('string');
    expect(typeof state.navBg).toBe('string');
    expect(typeof state.navText).toBe('string');
    expect(['spring', 'summer', 'fall', 'winter']).toContain(state.season);
    expect(typeof state.precipitationOpacity).toBe('number');
    expect(['snow', 'mist', 'none']).toContain(state.precipitationType);
  });

  it('midnight (0 min): sun is hidden, stars are visible', () => {
    const state = computeSkyState(0);
    expect(state.sunPos.opacity).toBe(0);
    expect(state.starOpacity).toBeGreaterThan(0);
  });

  it('noon (720 min): sun is visible, stars are hidden', () => {
    const state = computeSkyState(720);
    expect(state.sunPos.opacity).toBeGreaterThan(0);
    expect(state.starOpacity).toBe(0);
  });

  it('golden hour (1110 min = 18.5h): rimOpacity is high', () => {
    const state = computeSkyState(1110);
    expect(state.rimOpacity).toBeGreaterThan(0.5);
  });

  it('pre-dawn (4h = 240 min): stars still visible, sun still hidden', () => {
    const state = computeSkyState(240);
    expect(state.starOpacity).toBeGreaterThan(0);
    expect(state.sunPos.opacity).toBe(0);
  });

  it('detects summer season from a June date', () => {
    const juneDate = new Date('2026-06-15T12:00:00');
    const state = computeSkyState(720, juneDate);
    expect(state.season).toBe('summer');
  });

  it('detects fall season from an October date', () => {
    const octDate = new Date('2026-10-15T12:00:00');
    const state = computeSkyState(720, octDate);
    expect(state.season).toBe('fall');
  });

  it('detects winter season from a January date', () => {
    const janDate = new Date('2026-01-15T12:00:00');
    const state = computeSkyState(720, janDate);
    expect(state.season).toBe('winter');
  });

  it('detects spring season from an April date', () => {
    const aprDate = new Date('2026-04-15T12:00:00');
    const state = computeSkyState(720, aprDate);
    expect(state.season).toBe('spring');
  });

  it('winter season produces snow precipitation', () => {
    const janDate = new Date('2026-01-15T12:00:00');
    const state = computeSkyState(720, janDate);
    expect(state.precipitationType).toBe('snow');
    expect(state.precipitationOpacity).toBeGreaterThan(0);
  });

  it('summer season produces no precipitation', () => {
    const juneDate = new Date('2026-06-15T12:00:00');
    const state = computeSkyState(720, juneDate);
    expect(state.precipitationType).toBe('none');
    expect(state.precipitationOpacity).toBe(0);
  });

  it('spring season produces mist precipitation when cloudy', () => {
    // Dawn has cloudOp > 0, spring → mist
    const aprDate = new Date('2026-04-15T12:00:00');
    const state = computeSkyState(5 * 60, aprDate); // 5am — cloudy
    expect(state.precipitationType).toBe('mist');
  });

  it('moon phase is computed for a known date', () => {
    // Full moon is ~14.77 days into cycle from known new moon 2025-01-29
    // 2025-02-12 = 14 days after new moon → near full
    const nearFullDate = new Date('2025-02-12T12:00:00Z');
    const state = computeSkyState(0, nearFullDate); // midnight
    expect(state.moonPos.phase).toBeGreaterThan(12);
    expect(state.moonPos.phase).toBeLessThan(18);
  });

  it('moon is visible at midnight', () => {
    const state = computeSkyState(0);
    expect(state.moonPos.opacity).toBeGreaterThan(0);
  });

  it('moon cx is within viewBox width (0–1040)', () => {
    const state = computeSkyState(0); // midnight — moon should be visible
    expect(state.moonPos.cx).toBeGreaterThanOrEqual(0);
    expect(state.moonPos.cx).toBeLessThanOrEqual(1040);
  });

  it('sky colors are all strings (hex or rgb)', () => {
    const state = computeSkyState(720);
    state.skyColors.forEach((c) => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });

  it('ridge colors vary between day and night', () => {
    const day = computeSkyState(720);
    const night = computeSkyState(0);
    // Near ridge should be different between day and night
    expect(day.ridgeColors.r1).not.toBe(night.ridgeColors.r1);
  });
});

// ─── useLivingSky (hook) ──────────────────────────────────────────────────────

describe('useLivingSky', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a valid LivingSkyState on mount', () => {
    const { result } = renderHook(() => useLivingSky());
    expect(result.current.skyColors).toHaveLength(4);
    expect(['spring', 'summer', 'fall', 'winter']).toContain(result.current.season);
  });

  it('overrideMinutes bypasses live clock — noon returns sun visible', () => {
    const { result } = renderHook(() => useLivingSky(720));
    expect(result.current.sunPos.opacity).toBeGreaterThan(0);
    expect(result.current.starOpacity).toBe(0);
  });

  it('overrideMinutes bypasses live clock — midnight returns stars visible', () => {
    const { result } = renderHook(() => useLivingSky(0));
    expect(result.current.starOpacity).toBeGreaterThan(0);
    expect(result.current.sunPos.opacity).toBe(0);
  });

  it('updates state after 30 seconds', () => {
    // Use a real Date mock so the state actually changes with time
    const baseTime = new Date('2026-06-15T12:00:00').getTime();
    jest.setSystemTime(baseTime);

    const { result } = renderHook(() => useLivingSky());
    const initial = result.current.sunPos.cx;

    // Advance clock by 30 minutes so position changes measurably
    jest.setSystemTime(baseTime + 30 * 60 * 1000);
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Sun position at 12:30 should differ from 12:00
    expect(result.current.sunPos.cx).not.toBe(initial);
  });

  it('clears interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useLivingSky());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('overrideMinutes does NOT set up an interval (static mode)', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    renderHook(() => useLivingSky(720));
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('rimColor is a string (interpolated, not snapped)', () => {
    // Between keyframes (e.g. h=11, between h=10 rimCol=#FFFAE0 and h=12 rimCol=#FFFCE8)
    const { result } = renderHook(() => useLivingSky(660)); // 11h = 660 min
    expect(typeof result.current.rimColor).toBe('string');
    expect(result.current.rimColor.length).toBeGreaterThan(0);
  });
});
