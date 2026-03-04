/**
 * Heatmap tracking service for capturing touch interactions and scroll depth.
 *
 * Captures tap coordinates, scroll positions, and element interaction frequency
 * for UX analysis. Data is buffered and can be flushed to an analytics provider
 * or custom backend.
 *
 * Usage:
 *   heatmap.trackTap('ProductDetail', 150, 320, 'add-to-cart');
 *   heatmap.trackScrollDepth('ProductDetail', 0.75);
 *   heatmap.getReport('ProductDetail');
 */
import { trackEvent, type AnalyticsEventName } from './analytics';

export interface TapEvent {
  screen: string;
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

export interface ScrollDepthEvent {
  screen: string;
  maxDepth: number;
  timestamp: number;
}

export interface InteractionCount {
  elementId: string;
  screen: string;
  count: number;
}

export interface HeatmapReport {
  screen: string;
  tapCount: number;
  avgScrollDepth: number;
  maxScrollDepth: number;
  topElements: InteractionCount[];
  taps: readonly TapEvent[];
}

const MAX_TAP_BUFFER = 200;
const MAX_SCROLL_BUFFER = 100;

let _enabled = true;
const _tapBuffer: TapEvent[] = [];
const _scrollBuffer: ScrollDepthEvent[] = [];
const _interactionCounts = new Map<string, InteractionCount>();

export function setHeatmapEnabled(enabled: boolean): void {
  _enabled = enabled;
}

export function isHeatmapEnabled(): boolean {
  return _enabled;
}

/** Track a tap/touch event with screen-relative coordinates */
export function trackTap(screen: string, x: number, y: number, elementId?: string): void {
  if (!_enabled) return;

  const event: TapEvent = { screen, x, y, elementId, timestamp: Date.now() };
  _tapBuffer.push(event);
  if (_tapBuffer.length > MAX_TAP_BUFFER) {
    _tapBuffer.shift();
  }

  // Increment element interaction count
  if (elementId) {
    const key = `${screen}::${elementId}`;
    const existing = _interactionCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      _interactionCounts.set(key, { elementId, screen, count: 1 });
    }
  }

  trackEvent('heatmap_tap' as AnalyticsEventName, {
    screen,
    x: Math.round(x),
    y: Math.round(y),
    ...(elementId ? { element_id: elementId } : {}),
  });
}

/** Track scroll depth as a fraction (0.0 to 1.0) */
export function trackScrollDepth(screen: string, depth: number): void {
  if (!_enabled) return;

  const clamped = Math.max(0, Math.min(1, depth));
  const event: ScrollDepthEvent = { screen, maxDepth: clamped, timestamp: Date.now() };

  // Update or add scroll depth entry for this screen
  const existingIdx = _scrollBuffer.findIndex((e) => e.screen === screen);
  if (existingIdx >= 0) {
    // Keep the maximum depth reached
    if (clamped > _scrollBuffer[existingIdx].maxDepth) {
      _scrollBuffer[existingIdx] = event;
    }
  } else {
    _scrollBuffer.push(event);
    if (_scrollBuffer.length > MAX_SCROLL_BUFFER) {
      _scrollBuffer.shift();
    }
  }

  trackEvent('scroll_depth' as AnalyticsEventName, {
    screen,
    depth: Math.round(clamped * 100),
  });
}

/** Get a heatmap report for a specific screen */
export function getReport(screen: string): HeatmapReport {
  const taps = _tapBuffer.filter((t) => t.screen === screen);
  const scrollEvents = _scrollBuffer.filter((s) => s.screen === screen);
  const depths = scrollEvents.map((s) => s.maxDepth);

  const allInteractions = Array.from(_interactionCounts.values())
    .filter((i) => i.screen === screen)
    .sort((a, b) => b.count - a.count);

  return {
    screen,
    tapCount: taps.length,
    avgScrollDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
    maxScrollDepth: depths.length > 0 ? Math.max(...depths) : 0,
    topElements: allInteractions.slice(0, 10),
    taps,
  };
}

/** Get all tracked screens */
export function getTrackedScreens(): string[] {
  const screens = new Set<string>();
  _tapBuffer.forEach((t) => screens.add(t.screen));
  _scrollBuffer.forEach((s) => screens.add(s.screen));
  return Array.from(screens);
}

/** Get tap buffer (for testing/debugging) */
export function getTapBuffer(): readonly TapEvent[] {
  return _tapBuffer;
}

/** Get scroll buffer (for testing/debugging) */
export function getScrollBuffer(): readonly ScrollDepthEvent[] {
  return _scrollBuffer;
}

/** Get interaction counts (for testing/debugging) */
export function getInteractionCounts(): ReadonlyMap<string, InteractionCount> {
  return _interactionCounts;
}

/** Reset all heatmap data */
export function resetHeatmap(): void {
  _tapBuffer.length = 0;
  _scrollBuffer.length = 0;
  _interactionCounts.clear();
}
