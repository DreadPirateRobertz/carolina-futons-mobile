import {
  trackTap,
  trackScrollDepth,
  getReport,
  getTrackedScreens,
  getTapBuffer,
  getScrollBuffer,
  getInteractionCounts,
  resetHeatmap,
  setHeatmapEnabled,
  isHeatmapEnabled,
} from '../heatmap';
import { clearEventBuffer } from '../analytics';

beforeEach(() => {
  resetHeatmap();
  clearEventBuffer();
  setHeatmapEnabled(true);
});

describe('heatmap', () => {
  describe('trackTap', () => {
    it('records tap events with coordinates', () => {
      trackTap('ProductDetail', 150, 320);
      const buffer = getTapBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toMatchObject({
        screen: 'ProductDetail',
        x: 150,
        y: 320,
      });
      expect(buffer[0].timestamp).toBeDefined();
    });

    it('records tap with element ID', () => {
      trackTap('ProductDetail', 100, 200, 'add-to-cart');
      const buffer = getTapBuffer();
      expect(buffer[0].elementId).toBe('add-to-cart');
    });

    it('increments interaction count for elements', () => {
      trackTap('Home', 10, 20, 'banner');
      trackTap('Home', 15, 25, 'banner');
      trackTap('Home', 10, 20, 'search');
      const counts = getInteractionCounts();
      expect(counts.get('Home::banner')?.count).toBe(2);
      expect(counts.get('Home::search')?.count).toBe(1);
    });

    it('does nothing when disabled', () => {
      setHeatmapEnabled(false);
      trackTap('Home', 10, 20);
      expect(getTapBuffer()).toHaveLength(0);
    });

    it('limits buffer size', () => {
      for (let i = 0; i < 210; i++) {
        trackTap('Screen', i, i);
      }
      expect(getTapBuffer().length).toBeLessThanOrEqual(200);
    });
  });

  describe('trackScrollDepth', () => {
    it('records scroll depth for a screen', () => {
      trackScrollDepth('ProductDetail', 0.5);
      const buffer = getScrollBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toMatchObject({ screen: 'ProductDetail', maxDepth: 0.5 });
    });

    it('keeps maximum depth for a screen', () => {
      trackScrollDepth('ProductDetail', 0.3);
      trackScrollDepth('ProductDetail', 0.8);
      trackScrollDepth('ProductDetail', 0.5); // lower, should not replace
      const buffer = getScrollBuffer();
      const pdEntry = buffer.find((e) => e.screen === 'ProductDetail');
      expect(pdEntry?.maxDepth).toBe(0.8);
    });

    it('clamps depth to 0–1', () => {
      trackScrollDepth('Home', 1.5);
      const buffer = getScrollBuffer();
      expect(buffer[0].maxDepth).toBe(1);

      resetHeatmap();
      trackScrollDepth('Home', -0.5);
      const buffer2 = getScrollBuffer();
      expect(buffer2[0].maxDepth).toBe(0);
    });

    it('does nothing when disabled', () => {
      setHeatmapEnabled(false);
      trackScrollDepth('Home', 0.5);
      expect(getScrollBuffer()).toHaveLength(0);
    });
  });

  describe('getReport', () => {
    it('returns a report for a screen', () => {
      trackTap('ProductDetail', 100, 200, 'buy-btn');
      trackTap('ProductDetail', 110, 210, 'buy-btn');
      trackTap('ProductDetail', 50, 100, 'fabric-picker');
      trackScrollDepth('ProductDetail', 0.75);

      const report = getReport('ProductDetail');
      expect(report.screen).toBe('ProductDetail');
      expect(report.tapCount).toBe(3);
      expect(report.maxScrollDepth).toBe(0.75);
      expect(report.avgScrollDepth).toBe(0.75);
      expect(report.topElements[0]).toMatchObject({ elementId: 'buy-btn', count: 2 });
      expect(report.topElements[1]).toMatchObject({ elementId: 'fabric-picker', count: 1 });
    });

    it('returns empty report for untracked screen', () => {
      const report = getReport('NonExistent');
      expect(report.tapCount).toBe(0);
      expect(report.maxScrollDepth).toBe(0);
      expect(report.topElements).toHaveLength(0);
    });
  });

  describe('getTrackedScreens', () => {
    it('returns all screens with activity', () => {
      trackTap('Home', 0, 0);
      trackScrollDepth('Shop', 0.5);
      trackTap('Cart', 10, 20);
      const screens = getTrackedScreens();
      expect(screens).toContain('Home');
      expect(screens).toContain('Shop');
      expect(screens).toContain('Cart');
    });
  });

  describe('setHeatmapEnabled', () => {
    it('tracks enabled state', () => {
      expect(isHeatmapEnabled()).toBe(true);
      setHeatmapEnabled(false);
      expect(isHeatmapEnabled()).toBe(false);
    });
  });

  describe('resetHeatmap', () => {
    it('clears all data', () => {
      trackTap('Home', 10, 20, 'btn');
      trackScrollDepth('Home', 0.5);
      resetHeatmap();
      expect(getTapBuffer()).toHaveLength(0);
      expect(getScrollBuffer()).toHaveLength(0);
      expect(getInteractionCounts().size).toBe(0);
    });
  });
});
