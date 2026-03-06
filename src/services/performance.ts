/**
 * Performance profiling service for startup time, scroll jank, and memory monitoring.
 *
 * Captures timing marks for app startup phases, monitors frame drops during
 * scrolling, and samples memory usage. Reports metrics via the analytics service.
 *
 * Usage:
 *   import { perf } from '@/services/performance';
 *   perf.markStartup('js_init');
 *   perf.markStartup('fonts_loaded');
 *   perf.markStartup('first_render');
 *   perf.markStartup('interactive');
 *   perf.reportStartup(); // sends timing to analytics
 */

import { InteractionManager, Platform } from 'react-native';
import { trackEvent, type AnalyticsEventName } from './analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StartupPhase =
  | 'js_init'
  | 'analytics_init'
  | 'fonts_loaded'
  | 'first_render'
  | 'nav_ready'
  | 'interactive';

export interface StartupMetrics {
  /** Absolute timestamps (ms since epoch) for each phase */
  marks: Partial<Record<StartupPhase, number>>;
  /** Durations between phases (ms) */
  durations: Record<string, number>;
  /** Total cold-start time: js_init → interactive */
  totalMs: number | null;
}

export interface FrameSample {
  timestamp: number;
  /** Frame duration in ms (16.67ms = 60fps target) */
  frameDurationMs: number;
  /** Whether this frame exceeded the jank threshold */
  janky: boolean;
}

export interface ScrollSession {
  id: string;
  screenName: string;
  startTime: number;
  endTime: number | null;
  totalFrames: number;
  droppedFrames: number;
  /** Worst single frame duration */
  worstFrameMs: number;
  /** Rolling average FPS */
  avgFps: number;
  samples: FrameSample[];
}

export interface MemorySample {
  timestamp: number;
  /** JS heap used in bytes (Hermes only) */
  jsHeapUsed: number | null;
  /** JS heap total in bytes (Hermes only) */
  jsHeapTotal: number | null;
  /** Native memory (iOS only, via Performance API if available) */
  nativeMemory: number | null;
}

export interface PerformanceReport {
  startup: StartupMetrics;
  scrollSessions: ScrollSession[];
  memorySamples: MemorySample[];
  /** Render timing entries: componentName → array of render durations (ms) */
  renderTimings: Record<string, number[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Frame duration target for 60fps (ms) */
const FRAME_TARGET_MS = 16.67;
/** Frames taking longer than this are "janky" */
const JANK_THRESHOLD_MS = 33.34; // 2x frame budget = dropped frame
/** Max scroll sessions to retain in memory */
const MAX_SCROLL_SESSIONS = 20;
/** Max frame samples per scroll session */
const MAX_SAMPLES_PER_SESSION = 300;
/** Memory sampling interval (ms) */
const MEMORY_SAMPLE_INTERVAL_MS = 5000;
/** Max memory samples to retain */
const MAX_MEMORY_SAMPLES = 120;
/** Max render entries per component */
const MAX_RENDER_ENTRIES = 50;

// Extend AnalyticsEventName for perf events via trackEvent's string union
const PERF_STARTUP = 'perf_startup' as AnalyticsEventName;
const PERF_SCROLL_JANK = 'perf_scroll_jank' as AnalyticsEventName;
const PERF_MEMORY = 'perf_memory' as AnalyticsEventName;
const PERF_SLOW_RENDER = 'perf_slow_render' as AnalyticsEventName;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const startupMarks: Partial<Record<StartupPhase, number>> = {};
let startupReported = false;

const scrollSessions: ScrollSession[] = [];
const memorySamples: MemorySample[] = [];
const renderTimings: Record<string, number[]> = {};

let memoryTimerId: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Startup Profiling
// ---------------------------------------------------------------------------

function markStartup(phase: StartupPhase): void {
  if (startupMarks[phase] != null) return; // don't overwrite
  startupMarks[phase] = Date.now();

  if (__DEV__) {
    const elapsed =
      startupMarks.js_init != null ? Date.now() - startupMarks.js_init : 0;
    // eslint-disable-next-line no-console
    console.log(`[Perf] startup:${phase} +${elapsed}ms`);
  }
}

function getStartupMetrics(): StartupMetrics {
  const phases: StartupPhase[] = [
    'js_init',
    'analytics_init',
    'fonts_loaded',
    'first_render',
    'nav_ready',
    'interactive',
  ];

  const durations: Record<string, number> = {};
  for (let i = 1; i < phases.length; i++) {
    const prev = startupMarks[phases[i - 1]];
    const curr = startupMarks[phases[i]];
    if (prev != null && curr != null) {
      durations[`${phases[i - 1]}_to_${phases[i]}`] = curr - prev;
    }
  }

  const jsInit = startupMarks.js_init;
  const interactive = startupMarks.interactive;
  const totalMs = jsInit != null && interactive != null ? interactive - jsInit : null;

  return { marks: { ...startupMarks }, durations, totalMs };
}

function reportStartup(): void {
  if (startupReported) return;

  // Wait for interactions to settle before reporting
  InteractionManager.runAfterInteractions(() => {
    const metrics = getStartupMetrics();
    if (metrics.totalMs == null) return;

    startupReported = true;

    const props: Record<string, string | number | boolean> = {
      total_ms: metrics.totalMs,
      platform: Platform.OS,
    };

    // Add individual phase durations
    for (const [key, val] of Object.entries(metrics.durations)) {
      props[key] = val;
    }

    trackEvent(PERF_STARTUP, props);

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Perf] Startup report:', JSON.stringify(props, null, 2));
    }
  });
}

// ---------------------------------------------------------------------------
// Scroll Jank Detection
// ---------------------------------------------------------------------------

let scrollSessionCounter = 0;

function startScrollSession(screenName: string): ScrollSession {
  const session: ScrollSession = {
    id: `scroll_${++scrollSessionCounter}`,
    screenName,
    startTime: Date.now(),
    endTime: null,
    totalFrames: 0,
    droppedFrames: 0,
    worstFrameMs: 0,
    avgFps: 60,
    samples: [],
  };

  scrollSessions.push(session);
  if (scrollSessions.length > MAX_SCROLL_SESSIONS) {
    scrollSessions.shift();
  }

  return session;
}

function recordFrame(session: ScrollSession, frameDurationMs: number): void {
  session.totalFrames++;
  const janky = frameDurationMs > JANK_THRESHOLD_MS;

  if (janky) {
    session.droppedFrames++;
  }

  if (frameDurationMs > session.worstFrameMs) {
    session.worstFrameMs = frameDurationMs;
  }

  // Update rolling average FPS
  if (session.totalFrames > 0) {
    const elapsed = Date.now() - session.startTime;
    session.avgFps =
      elapsed > 0 ? Math.round((session.totalFrames / elapsed) * 1000) : 60;
  }

  if (session.samples.length < MAX_SAMPLES_PER_SESSION) {
    session.samples.push({
      timestamp: Date.now(),
      frameDurationMs,
      janky,
    });
  }
}

function endScrollSession(session: ScrollSession): void {
  session.endTime = Date.now();

  // Report if there was significant jank
  const jankRatio =
    session.totalFrames > 0 ? session.droppedFrames / session.totalFrames : 0;

  if (session.droppedFrames > 0) {
    const props: Record<string, string | number | boolean> = {
      screen: session.screenName,
      total_frames: session.totalFrames,
      dropped_frames: session.droppedFrames,
      jank_ratio: Math.round(jankRatio * 1000) / 1000,
      worst_frame_ms: Math.round(session.worstFrameMs * 100) / 100,
      avg_fps: session.avgFps,
      duration_ms: session.endTime - session.startTime,
      platform: Platform.OS,
    };

    trackEvent(PERF_SCROLL_JANK, props);

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[Perf] Scroll jank on ${session.screenName}: ${session.droppedFrames}/${session.totalFrames} frames dropped (worst: ${session.worstFrameMs.toFixed(1)}ms)`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Memory Monitoring
// ---------------------------------------------------------------------------

function sampleMemory(): MemorySample {
  let jsHeapUsed: number | null = null;
  let jsHeapTotal: number | null = null;
  let nativeMemory: number | null = null;

  // Hermes exposes HermesInternal for memory info
  const g = globalThis as Record<string, unknown>;
  if (typeof g.HermesInternal === 'object' && g.HermesInternal != null) {
    const hermes = g.HermesInternal as {
      getRuntimeProperties?: () => Record<string, string>;
    };
    if (typeof hermes.getRuntimeProperties === 'function') {
      const props = hermes.getRuntimeProperties();
      const heapSize = Number(props['Heap Size']);
      const heapAllocated = Number(props['Heap Allocated']);
      if (!isNaN(heapSize)) jsHeapTotal = heapSize;
      if (!isNaN(heapAllocated)) jsHeapUsed = heapAllocated;
    }
  }

  // Fallback: standard Performance API (V8 / JSC with experimental support)
  if (jsHeapUsed == null && typeof performance !== 'undefined') {
    const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } })
      .memory;
    if (perfMemory) {
      jsHeapUsed = perfMemory.usedJSHeapSize;
      jsHeapTotal = perfMemory.totalJSHeapSize;
    }
  }

  const sample: MemorySample = {
    timestamp: Date.now(),
    jsHeapUsed,
    jsHeapTotal,
    nativeMemory,
  };

  memorySamples.push(sample);
  if (memorySamples.length > MAX_MEMORY_SAMPLES) {
    memorySamples.shift();
  }

  return sample;
}

function startMemoryMonitoring(): void {
  if (memoryTimerId != null) return;

  // Take an initial sample
  sampleMemory();

  memoryTimerId = setInterval(() => {
    const sample = sampleMemory();

    // Report if heap usage is high (> 150MB)
    if (sample.jsHeapUsed != null && sample.jsHeapUsed > 150 * 1024 * 1024) {
      trackEvent(PERF_MEMORY, {
        js_heap_used_mb: Math.round(sample.jsHeapUsed / (1024 * 1024)),
        js_heap_total_mb: sample.jsHeapTotal
          ? Math.round(sample.jsHeapTotal / (1024 * 1024))
          : 0,
        platform: Platform.OS,
        warning: 'high_memory',
      });

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Perf] High memory: ${Math.round(sample.jsHeapUsed / (1024 * 1024))}MB JS heap`,
        );
      }
    }
  }, MEMORY_SAMPLE_INTERVAL_MS);
}

function stopMemoryMonitoring(): void {
  if (memoryTimerId != null) {
    clearInterval(memoryTimerId);
    memoryTimerId = null;
  }
}

function reportMemorySnapshot(): void {
  const sample = sampleMemory();
  const props: Record<string, string | number | boolean> = {
    platform: Platform.OS,
  };
  if (sample.jsHeapUsed != null) {
    props.js_heap_used_mb = Math.round(sample.jsHeapUsed / (1024 * 1024));
  }
  if (sample.jsHeapTotal != null) {
    props.js_heap_total_mb = Math.round(sample.jsHeapTotal / (1024 * 1024));
  }
  trackEvent(PERF_MEMORY, props);
}

// ---------------------------------------------------------------------------
// Render Tracking
// ---------------------------------------------------------------------------

function recordRender(componentName: string, durationMs: number): void {
  if (!renderTimings[componentName]) {
    renderTimings[componentName] = [];
  }
  const entries = renderTimings[componentName];
  entries.push(durationMs);
  if (entries.length > MAX_RENDER_ENTRIES) {
    entries.shift();
  }

  // Report slow renders (> 16ms = dropped frame during render)
  if (durationMs > FRAME_TARGET_MS) {
    trackEvent(PERF_SLOW_RENDER, {
      component: componentName,
      duration_ms: Math.round(durationMs * 100) / 100,
      platform: Platform.OS,
    });

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Perf] Slow render: ${componentName} took ${durationMs.toFixed(1)}ms`,
      );
    }
  }
}

function getRenderStats(
  componentName: string,
): { count: number; avgMs: number; maxMs: number; p95Ms: number } | null {
  const entries = renderTimings[componentName];
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const p95Index = Math.floor(sorted.length * 0.95);

  return {
    count: sorted.length,
    avgMs: Math.round((sum / sorted.length) * 100) / 100,
    maxMs: sorted[sorted.length - 1],
    p95Ms: sorted[p95Index],
  };
}

// ---------------------------------------------------------------------------
// Full Report
// ---------------------------------------------------------------------------

function getReport(): PerformanceReport {
  return {
    startup: getStartupMetrics(),
    scrollSessions: [...scrollSessions],
    memorySamples: [...memorySamples],
    renderTimings: { ...renderTimings },
  };
}

function printReport(): void {
  if (!__DEV__) return;

  const report = getReport();
  // eslint-disable-next-line no-console
  console.log('\n========== PERFORMANCE REPORT ==========');

  // Startup
  // eslint-disable-next-line no-console
  console.log('\n--- Startup ---');
  if (report.startup.totalMs != null) {
    // eslint-disable-next-line no-console
    console.log(`  Total: ${report.startup.totalMs}ms`);
  }
  for (const [key, val] of Object.entries(report.startup.durations)) {
    // eslint-disable-next-line no-console
    console.log(`  ${key}: ${val}ms`);
  }

  // Scroll sessions
  if (report.scrollSessions.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n--- Scroll Sessions ---');
    for (const s of report.scrollSessions) {
      const jankPct =
        s.totalFrames > 0
          ? ((s.droppedFrames / s.totalFrames) * 100).toFixed(1)
          : '0';
      // eslint-disable-next-line no-console
      console.log(
        `  ${s.screenName}: ${s.droppedFrames}/${s.totalFrames} dropped (${jankPct}%) worst=${s.worstFrameMs.toFixed(1)}ms avg=${s.avgFps}fps`,
      );
    }
  }

  // Memory
  if (report.memorySamples.length > 0) {
    const latest = report.memorySamples[report.memorySamples.length - 1];
    // eslint-disable-next-line no-console
    console.log('\n--- Memory (latest) ---');
    if (latest.jsHeapUsed != null) {
      // eslint-disable-next-line no-console
      console.log(
        `  JS Heap: ${Math.round(latest.jsHeapUsed / (1024 * 1024))}MB / ${latest.jsHeapTotal ? Math.round(latest.jsHeapTotal / (1024 * 1024)) : '?'}MB`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log('  JS Heap: not available (requires Hermes)');
    }
  }

  // Render timings
  const renderedComponents = Object.keys(report.renderTimings);
  if (renderedComponents.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n--- Render Timings ---');
    for (const name of renderedComponents) {
      const stats = getRenderStats(name);
      if (stats) {
        // eslint-disable-next-line no-console
        console.log(
          `  ${name}: ${stats.count} renders, avg=${stats.avgMs}ms, p95=${stats.p95Ms.toFixed(1)}ms, max=${stats.maxMs.toFixed(1)}ms`,
        );
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n=========================================\n');
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

function resetForTesting(): void {
  Object.keys(startupMarks).forEach(
    (k) => delete startupMarks[k as StartupPhase],
  );
  startupReported = false;
  scrollSessions.length = 0;
  memorySamples.length = 0;
  Object.keys(renderTimings).forEach((k) => delete renderTimings[k]);
  stopMemoryMonitoring();
  scrollSessionCounter = 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Unified performance API surface. All profiling methods are accessed via
 * `perf.*` to keep the import footprint small and the namespace clear.
 */
export const perf = {
  // Startup
  markStartup,
  getStartupMetrics,
  reportStartup,

  // Scroll
  startScrollSession,
  recordFrame,
  endScrollSession,

  // Memory
  sampleMemory,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  reportMemorySnapshot,

  // Render
  recordRender,
  getRenderStats,

  // Report
  getReport,
  printReport,

  // Testing
  resetForTesting,

  // Constants (exported for tests)
  FRAME_TARGET_MS,
  JANK_THRESHOLD_MS,
} as const;
