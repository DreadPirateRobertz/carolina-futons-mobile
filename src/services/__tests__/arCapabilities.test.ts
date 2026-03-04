/**
 * Tests for AR capabilities — getARCapabilities, getARCapabilitiesSync,
 * supportsSurfaceDetection. Supplements arSupport.test.ts.
 */
import { Platform } from 'react-native';

import {
  getARCapabilities,
  getARCapabilitiesSync,
  supportsSurfaceDetection,
  resetCache,
  type ARCapabilities,
} from '../arSupport';

const originalPlatform = Platform.OS;

beforeEach(() => {
  resetCache();
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalPlatform });
});

describe('getARCapabilities', () => {
  it('returns full capabilities on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const caps = await getARCapabilities();
    expect(caps.isSupported).toBe(true);
    expect(caps.framework).toBe('ARKit');
    expect(caps.planeDetection).toBe('both');
    expect(caps.supportsLightingEstimation).toBe(true);
    expect(caps.tier).toBe('premium');
    expect(caps.hasLiDAR).toBe(true); // premium tier
    expect(caps.supportsOcclusion).toBe(true);
  });

  it('returns ARCore capabilities on Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const caps = await getARCapabilities();
    expect(caps.isSupported).toBe(true);
    expect(caps.framework).toBe('ARCore');
    expect(caps.planeDetection).toBe('both');
    expect(caps.supportsLightingEstimation).toBe(true);
    expect(caps.tier).toBe('standard');
    expect(caps.hasLiDAR).toBe(false);
    expect(caps.supportsOcclusion).toBe(false);
  });

  it('returns fallback capabilities on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const caps = await getARCapabilities();
    expect(caps.isSupported).toBe(false);
    expect(caps.framework).toBe('none');
    expect(caps.planeDetection).toBe('none');
    expect(caps.tier).toBe('fallback');
    expect(caps.hasLiDAR).toBe(false);
    expect(caps.supportsLightingEstimation).toBe(false);
    expect(caps.supportsOcclusion).toBe(false);
  });

  it('caches result after first call', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const caps1 = await getARCapabilities();
    const caps2 = await getARCapabilities();
    expect(caps1).toBe(caps2); // Same object reference
  });
});

describe('getARCapabilitiesSync', () => {
  it('returns fallback before async call', () => {
    const caps = getARCapabilitiesSync();
    expect(caps.isSupported).toBe(false);
    expect(caps.framework).toBe('none');
    expect(caps.planeDetection).toBe('none');
  });

  it('returns cached value after getARCapabilities', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    await getARCapabilities();
    const caps = getARCapabilitiesSync();
    expect(caps.isSupported).toBe(true);
    expect(caps.framework).toBe('ARKit');
  });
});

describe('supportsSurfaceDetection', () => {
  it('returns false before capabilities loaded', () => {
    expect(supportsSurfaceDetection()).toBe(false);
  });

  it('returns true after iOS capabilities loaded', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    await getARCapabilities();
    expect(supportsSurfaceDetection()).toBe(true);
  });

  it('returns true after Android capabilities loaded', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    await getARCapabilities();
    expect(supportsSurfaceDetection()).toBe(true);
  });

  it('returns false on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    await getARCapabilities();
    expect(supportsSurfaceDetection()).toBe(false);
  });
});
