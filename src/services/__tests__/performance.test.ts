import { perf } from '../performance';

// Mock analytics
jest.mock('../analytics', () => ({
  trackEvent: jest.fn(),
}));

// Mock InteractionManager to run callback immediately
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      cb();
      return { then: () => {}, cancel: () => {} };
    },
  },
  Platform: { OS: 'ios' },
}));

const { trackEvent } = require('../analytics') as { trackEvent: jest.Mock };

beforeEach(() => {
  perf.resetForTesting();
  trackEvent.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Startup profiling', () => {
  it('records marks and computes durations', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(1200);
    perf.markStartup('analytics_init');
    jest.setSystemTime(1500);
    perf.markStartup('fonts_loaded');
    jest.setSystemTime(1700);
    perf.markStartup('first_render');
    jest.setSystemTime(1800);
    perf.markStartup('nav_ready');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    const metrics = perf.getStartupMetrics();
    expect(metrics.marks.js_init).toBe(1000);
    expect(metrics.marks.interactive).toBe(2000);
    expect(metrics.totalMs).toBe(1000);
    expect(metrics.durations.js_init_to_analytics_init).toBe(200);
    expect(metrics.durations.analytics_init_to_fonts_loaded).toBe(300);
    expect(metrics.durations.fonts_loaded_to_first_render).toBe(200);
    expect(metrics.durations.nav_ready_to_interactive).toBe(200);
  });

  it('does not overwrite existing marks', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('js_init');

    expect(perf.getStartupMetrics().marks.js_init).toBe(1000);
  });

  it('reports startup metrics via analytics', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');
    // Need intermediate marks for durations
    perf.markStartup('analytics_init');
    perf.markStartup('fonts_loaded');
    perf.markStartup('first_render');
    perf.markStartup('nav_ready');

    perf.reportStartup();

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_startup',
      expect.objectContaining({
        total_ms: 1000,
        platform: 'ios',
      }),
    );
  });

  it('reports startup only once', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    perf.reportStartup();
    perf.reportStartup();

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});

describe('Scroll jank detection', () => {
  it('starts and ends a scroll session', () => {
    const session = perf.startScrollSession('ShopScreen');
    expect(session.screenName).toBe('ShopScreen');
    expect(session.totalFrames).toBe(0);
    expect(session.droppedFrames).toBe(0);

    // Simulate good frames
    perf.recordFrame(session, 16);
    perf.recordFrame(session, 15);
    expect(session.totalFrames).toBe(2);
    expect(session.droppedFrames).toBe(0);

    // Simulate a janky frame (>33.34ms)
    perf.recordFrame(session, 50);
    expect(session.totalFrames).toBe(3);
    expect(session.droppedFrames).toBe(1);
    expect(session.worstFrameMs).toBe(50);

    perf.endScrollSession(session);
    expect(session.endTime).not.toBeNull();
  });

  it('reports jank to analytics when session has dropped frames', () => {
    jest.setSystemTime(1000);
    const session = perf.startScrollSession('HomeScreen');
    perf.recordFrame(session, 16);
    perf.recordFrame(session, 50); // janky
    jest.setSystemTime(2000);
    perf.endScrollSession(session);

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_scroll_jank',
      expect.objectContaining({
        screen: 'HomeScreen',
        dropped_frames: 1,
        total_frames: 2,
      }),
    );
  });

  it('does not report if no frames were dropped', () => {
    const session = perf.startScrollSession('CartScreen');
    perf.recordFrame(session, 16);
    perf.recordFrame(session, 14);
    perf.endScrollSession(session);

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('limits scroll sessions in memory', () => {
    for (let i = 0; i < 25; i++) {
      const s = perf.startScrollSession(`Screen${i}`);
      perf.endScrollSession(s);
    }
    const report = perf.getReport();
    expect(report.scrollSessions.length).toBeLessThanOrEqual(20);
  });
});

describe('Memory monitoring', () => {
  it('samples memory and stores samples', () => {
    const sample = perf.sampleMemory();
    expect(sample.timestamp).toBeGreaterThan(0);
    // In test env, Hermes/performance.memory may not be available
    // so values may be null — that's fine
    expect(sample).toHaveProperty('jsHeapUsed');
    expect(sample).toHaveProperty('jsHeapTotal');
  });

  it('starts and stops memory monitoring', () => {
    perf.startMemoryMonitoring();
    const report1 = perf.getReport();
    expect(report1.memorySamples.length).toBe(1); // initial sample

    jest.advanceTimersByTime(5000);
    const report2 = perf.getReport();
    expect(report2.memorySamples.length).toBe(2);

    perf.stopMemoryMonitoring();
    jest.advanceTimersByTime(10000);
    const report3 = perf.getReport();
    expect(report3.memorySamples.length).toBe(2); // no new samples
  });
});

describe('Render tracking', () => {
  it('records render durations', () => {
    perf.recordRender('ProductCard', 5);
    perf.recordRender('ProductCard', 8);
    perf.recordRender('ProductCard', 12);

    const stats = perf.getRenderStats('ProductCard');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(3);
    expect(stats!.avgMs).toBeCloseTo(8.33, 1);
    expect(stats!.maxMs).toBe(12);
  });

  it('reports slow renders to analytics', () => {
    perf.recordRender('HeavyComponent', 25); // >16.67ms threshold

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_slow_render',
      expect.objectContaining({
        component: 'HeavyComponent',
        duration_ms: 25,
        platform: 'ios',
      }),
    );
  });

  it('does not report normal renders', () => {
    perf.recordRender('LightComponent', 10);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('returns null for unknown component', () => {
    expect(perf.getRenderStats('Unknown')).toBeNull();
  });
});

describe('Startup profiling — edge cases', () => {
  it('returns totalMs null when js_init is missing', () => {
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    const metrics = perf.getStartupMetrics();
    expect(metrics.totalMs).toBeNull();
  });

  it('returns totalMs null when interactive is missing', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');

    const metrics = perf.getStartupMetrics();
    expect(metrics.totalMs).toBeNull();
  });

  it('skips durations when adjacent phases are missing', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    // skip analytics_init, fonts_loaded
    jest.setSystemTime(1700);
    perf.markStartup('first_render');
    jest.setSystemTime(1800);
    perf.markStartup('nav_ready');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    const metrics = perf.getStartupMetrics();
    expect(metrics.durations).not.toHaveProperty('js_init_to_analytics_init');
    expect(metrics.durations).not.toHaveProperty('analytics_init_to_fonts_loaded');
    expect(metrics.durations).not.toHaveProperty('fonts_loaded_to_first_render');
    expect(metrics.durations.first_render_to_nav_ready).toBe(100);
    expect(metrics.durations.nav_ready_to_interactive).toBe(200);
  });

  it('does not report startup when totalMs is null', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');

    perf.reportStartup();

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('logs to console in __DEV__ mode when marking startup', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.setSystemTime(1000);
    perf.markStartup('js_init');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Perf] startup:js_init'));
    consoleSpy.mockRestore();
  });

  it('logs elapsed time relative to js_init', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(1500);
    perf.markStartup('fonts_loaded');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('+500ms'));
    consoleSpy.mockRestore();
  });

  it('logs elapsed 0ms when marking a phase without js_init', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.setSystemTime(5000);
    perf.markStartup('fonts_loaded');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('+0ms'));
    consoleSpy.mockRestore();
  });

  it('logs startup report in __DEV__ mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    perf.reportStartup();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Perf] Startup report:',
      expect.stringContaining('total_ms'),
    );
    consoleSpy.mockRestore();
  });

  it('returns empty durations when no phases are marked', () => {
    const metrics = perf.getStartupMetrics();
    expect(Object.keys(metrics.durations)).toHaveLength(0);
    expect(metrics.totalMs).toBeNull();
  });
});

describe('Scroll jank detection — edge cases', () => {
  it('ends session with zero frames (jankRatio stays 0)', () => {
    const session = perf.startScrollSession('EmptyScreen');
    perf.endScrollSession(session);

    expect(trackEvent).not.toHaveBeenCalled();
    expect(session.endTime).not.toBeNull();
  });

  it('tracks frame at exact jank threshold as non-janky', () => {
    const session = perf.startScrollSession('ThresholdScreen');
    perf.recordFrame(session, 33.34);
    expect(session.droppedFrames).toBe(0);
    perf.endScrollSession(session);
  });

  it('tracks frame just above jank threshold as janky', () => {
    const session = perf.startScrollSession('ThresholdScreen');
    perf.recordFrame(session, 33.35);
    expect(session.droppedFrames).toBe(1);
    perf.endScrollSession(session);
  });

  it('updates worstFrameMs only when frame is worse', () => {
    const session = perf.startScrollSession('TestScreen');
    perf.recordFrame(session, 50);
    expect(session.worstFrameMs).toBe(50);
    perf.recordFrame(session, 30);
    expect(session.worstFrameMs).toBe(50);
    perf.recordFrame(session, 60);
    expect(session.worstFrameMs).toBe(60);
    perf.endScrollSession(session);
  });

  it('caps samples at MAX_SAMPLES_PER_SESSION (300)', () => {
    const session = perf.startScrollSession('ManyFrames');
    for (let i = 0; i < 310; i++) {
      perf.recordFrame(session, 16);
    }
    expect(session.samples.length).toBe(300);
    expect(session.totalFrames).toBe(310);
    perf.endScrollSession(session);
  });

  it('computes avgFps based on elapsed time', () => {
    jest.setSystemTime(1000);
    const session = perf.startScrollSession('FpsScreen');
    jest.setSystemTime(2000);
    perf.recordFrame(session, 16);
    jest.setSystemTime(2016);
    perf.recordFrame(session, 16);
    expect(session.avgFps).toBe(2);
    perf.endScrollSession(session);
  });

  it('sets avgFps to 60 when elapsed is 0', () => {
    jest.setSystemTime(1000);
    const session = perf.startScrollSession('InstantScreen');
    perf.recordFrame(session, 16);
    expect(session.avgFps).toBe(60);
    perf.endScrollSession(session);
  });

  it('logs jank to console in __DEV__ mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.setSystemTime(1000);
    const session = perf.startScrollSession('JankScreen');
    perf.recordFrame(session, 50);
    jest.setSystemTime(2000);
    perf.endScrollSession(session);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Perf] Scroll jank on JankScreen'),
    );
    consoleSpy.mockRestore();
  });

  it('includes jank_ratio and duration_ms in analytics report', () => {
    jest.setSystemTime(1000);
    const session = perf.startScrollSession('DetailScreen');
    perf.recordFrame(session, 16);
    perf.recordFrame(session, 50);
    perf.recordFrame(session, 16);
    jest.setSystemTime(3000);
    perf.endScrollSession(session);

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_scroll_jank',
      expect.objectContaining({
        jank_ratio: expect.any(Number),
        worst_frame_ms: expect.any(Number),
        avg_fps: expect.any(Number),
        duration_ms: 2000,
        platform: 'ios',
      }),
    );
  });

  it('assigns sequential scroll session ids', () => {
    const s1 = perf.startScrollSession('A');
    const s2 = perf.startScrollSession('B');
    expect(s1.id).toBe('scroll_1');
    expect(s2.id).toBe('scroll_2');
    perf.endScrollSession(s1);
    perf.endScrollSession(s2);
  });
});

describe('Memory monitoring — edge cases', () => {
  it('reads from HermesInternal when available', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': '104857600',
        'Heap Allocated': '52428800',
      }),
    };

    const sample = perf.sampleMemory();
    expect(sample.jsHeapTotal).toBe(104857600);
    expect(sample.jsHeapUsed).toBe(52428800);

    delete g.HermesInternal;
  });

  it('handles NaN values from HermesInternal properties', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': 'not-a-number',
        'Heap Allocated': 'also-nan',
      }),
    };

    const sample = perf.sampleMemory();
    expect(sample.jsHeapTotal).toBeNull();
    expect(sample.jsHeapUsed).toBeNull();

    delete g.HermesInternal;
  });

  it('skips HermesInternal when getRuntimeProperties is not a function', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = { getRuntimeProperties: 'not-a-function' };

    const sample = perf.sampleMemory();
    expect(sample).toHaveProperty('jsHeapUsed');

    delete g.HermesInternal;
  });

  it('skips HermesInternal when it is null', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = null;

    const sample = perf.sampleMemory();
    expect(sample).toHaveProperty('jsHeapUsed');

    delete g.HermesInternal;
  });

  it('falls back to performance.memory API when Hermes is absent', () => {
    const origPerf = (globalThis as Record<string, unknown>).performance;
    (globalThis as Record<string, unknown>).performance = {
      memory: {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
      },
    };

    const sample = perf.sampleMemory();
    expect(sample.jsHeapUsed).toBe(50000000);
    expect(sample.jsHeapTotal).toBe(100000000);

    (globalThis as Record<string, unknown>).performance = origPerf;
  });

  it('skips performance.memory fallback when Hermes provides data', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': '200000000',
        'Heap Allocated': '100000000',
      }),
    };
    const origPerf = g.performance;
    g.performance = {
      memory: {
        usedJSHeapSize: 1,
        totalJSHeapSize: 2,
      },
    };

    const sample = perf.sampleMemory();
    expect(sample.jsHeapUsed).toBe(100000000);
    expect(sample.jsHeapTotal).toBe(200000000);

    delete g.HermesInternal;
    g.performance = origPerf;
  });

  it('skips performance.memory fallback when performance.memory is undefined', () => {
    const origPerf = (globalThis as Record<string, unknown>).performance;
    (globalThis as Record<string, unknown>).performance = {};

    const sample = perf.sampleMemory();
    expect(sample.jsHeapUsed).toBeNull();
    expect(sample.jsHeapTotal).toBeNull();

    (globalThis as Record<string, unknown>).performance = origPerf;
  });

  it('caps memory samples at MAX_MEMORY_SAMPLES (120)', () => {
    for (let i = 0; i < 125; i++) {
      perf.sampleMemory();
    }
    const report = perf.getReport();
    expect(report.memorySamples.length).toBe(120);
  });

  it('does not start a second timer if already monitoring', () => {
    perf.startMemoryMonitoring();
    const report1 = perf.getReport();
    expect(report1.memorySamples.length).toBe(1);

    perf.startMemoryMonitoring();
    const report2 = perf.getReport();
    expect(report2.memorySamples.length).toBe(1);

    perf.stopMemoryMonitoring();
  });

  it('stopMemoryMonitoring is safe to call when not monitoring', () => {
    perf.stopMemoryMonitoring();
    perf.stopMemoryMonitoring();
  });

  it('reports high memory warning when heap exceeds 150MB', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': String(200 * 1024 * 1024),
        'Heap Allocated': String(160 * 1024 * 1024),
      }),
    };

    perf.startMemoryMonitoring();
    jest.advanceTimersByTime(5000);

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_memory',
      expect.objectContaining({
        js_heap_used_mb: 160,
        warning: 'high_memory',
        platform: 'ios',
      }),
    );

    perf.stopMemoryMonitoring();
    delete g.HermesInternal;
  });

  it('logs console.warn for high memory in __DEV__', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': String(200 * 1024 * 1024),
        'Heap Allocated': String(160 * 1024 * 1024),
      }),
    };

    perf.startMemoryMonitoring();
    jest.advanceTimersByTime(5000);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Perf] High memory: 160MB'));

    perf.stopMemoryMonitoring();
    delete g.HermesInternal;
    warnSpy.mockRestore();
  });

  it('does not report high memory when heap is under 150MB', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': String(100 * 1024 * 1024),
        'Heap Allocated': String(50 * 1024 * 1024),
      }),
    };

    perf.startMemoryMonitoring();
    jest.advanceTimersByTime(5000);

    expect(trackEvent).not.toHaveBeenCalledWith(
      'perf_memory',
      expect.objectContaining({ warning: 'high_memory' }),
    );

    perf.stopMemoryMonitoring();
    delete g.HermesInternal;
  });

  it('reports high memory with jsHeapTotal 0 when total is null', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': 'not-a-number',
        'Heap Allocated': String(160 * 1024 * 1024),
      }),
    };

    perf.startMemoryMonitoring();
    jest.advanceTimersByTime(5000);

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_memory',
      expect.objectContaining({
        js_heap_used_mb: 160,
        js_heap_total_mb: 0,
        warning: 'high_memory',
      }),
    );

    perf.stopMemoryMonitoring();
    delete g.HermesInternal;
  });
});

describe('reportMemorySnapshot', () => {
  it('reports snapshot with heap data', () => {
    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': String(100 * 1024 * 1024),
        'Heap Allocated': String(50 * 1024 * 1024),
      }),
    };

    perf.reportMemorySnapshot();

    expect(trackEvent).toHaveBeenCalledWith(
      'perf_memory',
      expect.objectContaining({
        js_heap_used_mb: 50,
        js_heap_total_mb: 100,
        platform: 'ios',
      }),
    );

    delete g.HermesInternal;
  });

  it('reports snapshot without heap data (null values)', () => {
    const g = globalThis as Record<string, unknown>;
    delete g.HermesInternal;
    const origPerf = g.performance;
    g.performance = undefined;

    perf.reportMemorySnapshot();

    expect(trackEvent).toHaveBeenCalledWith('perf_memory', { platform: 'ios' });

    g.performance = origPerf;
  });

  it('reports snapshot with jsHeapUsed but no jsHeapTotal', () => {
    const origPerf = (globalThis as Record<string, unknown>).performance;
    (globalThis as Record<string, unknown>).performance = {
      memory: {
        usedJSHeapSize: 75 * 1024 * 1024,
        totalJSHeapSize: 0,
      },
    };

    perf.reportMemorySnapshot();

    const call = trackEvent.mock.calls.find((c: unknown[]) => c[0] === 'perf_memory');
    expect(call).toBeDefined();
    expect(call![1]).toHaveProperty('js_heap_used_mb', 75);

    (globalThis as Record<string, unknown>).performance = origPerf;
  });
});

describe('Render tracking — edge cases', () => {
  it('caps render entries at MAX_RENDER_ENTRIES (50)', () => {
    for (let i = 0; i < 55; i++) {
      perf.recordRender('CappedComp', 5);
    }
    const stats = perf.getRenderStats('CappedComp');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(50);
  });

  it('logs console.warn for slow render in __DEV__', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    perf.recordRender('SlowComp', 25);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Perf] Slow render: SlowComp'));
    warnSpy.mockRestore();
  });

  it('does not warn for fast render in __DEV__', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    perf.recordRender('FastComp', 10);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('computes p95 correctly with many entries', () => {
    for (let i = 1; i <= 20; i++) {
      perf.recordRender('P95Comp', i);
    }
    const stats = perf.getRenderStats('P95Comp');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(20);
    expect(stats!.maxMs).toBe(20);
    expect(stats!.p95Ms).toBe(20);
  });

  it('computes p95 with a single entry', () => {
    perf.recordRender('SingleComp', 42);
    const stats = perf.getRenderStats('SingleComp');
    expect(stats).not.toBeNull();
    expect(stats!.p95Ms).toBe(42);
    expect(stats!.avgMs).toBe(42);
    expect(stats!.maxMs).toBe(42);
  });

  it('handles render at exactly FRAME_TARGET_MS as non-slow', () => {
    perf.recordRender('ExactComp', perf.FRAME_TARGET_MS);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('handles render just above FRAME_TARGET_MS as slow', () => {
    perf.recordRender('SlightlySlowComp', perf.FRAME_TARGET_MS + 0.01);
    expect(trackEvent).toHaveBeenCalledWith(
      'perf_slow_render',
      expect.objectContaining({ component: 'SlightlySlowComp' }),
    );
  });
});

describe('printReport', () => {
  it('prints full report with all sections in __DEV__', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');

    const session = perf.startScrollSession('PrintScreen');
    perf.recordFrame(session, 50);
    jest.setSystemTime(3000);
    perf.endScrollSession(session);

    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': String(100 * 1024 * 1024),
        'Heap Allocated': String(50 * 1024 * 1024),
      }),
    };
    perf.sampleMemory();

    perf.recordRender('PrintComp', 10);

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('PERFORMANCE REPORT');
    expect(allOutput).toContain('Startup');
    expect(allOutput).toContain('Total: 1000ms');
    expect(allOutput).toContain('Scroll Sessions');
    expect(allOutput).toContain('PrintScreen');
    expect(allOutput).toContain('Memory (latest)');
    expect(allOutput).toContain('JS Heap:');
    expect(allOutput).toContain('Render Timings');
    expect(allOutput).toContain('PrintComp');

    consoleSpy.mockRestore();
    delete g.HermesInternal;
  });

  it('prints report without startup totalMs', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('PERFORMANCE REPORT');
    expect(allOutput).toContain('Startup');
    expect(allOutput).not.toContain('Total:');

    consoleSpy.mockRestore();
  });

  it('prints "not available" when jsHeapUsed is null', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const g = globalThis as Record<string, unknown>;
    delete g.HermesInternal;
    const origPerf = g.performance;
    g.performance = undefined;

    perf.sampleMemory();
    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('not available');

    consoleSpy.mockRestore();
    g.performance = origPerf;
  });

  it('prints scroll session with 0 totalFrames as 0% jank', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const session = perf.startScrollSession('EmptyScrollScreen');
    perf.endScrollSession(session);

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('EmptyScrollScreen');
    expect(allOutput).toContain('0/0 dropped');

    consoleSpy.mockRestore();
  });

  it('prints memory with jsHeapTotal showing "?" when total is null but used is present', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const g = globalThis as Record<string, unknown>;
    g.HermesInternal = {
      getRuntimeProperties: () => ({
        'Heap Size': 'not-a-number',
        'Heap Allocated': String(50 * 1024 * 1024),
      }),
    };

    perf.sampleMemory();
    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('?');

    consoleSpy.mockRestore();
    delete g.HermesInternal;
  });

  it('omits scroll sessions section when there are none', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).not.toContain('Scroll Sessions');

    consoleSpy.mockRestore();
  });

  it('omits memory section when there are no samples', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).not.toContain('Memory (latest)');

    consoleSpy.mockRestore();
  });

  it('omits render timings section when there are no renders', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    perf.printReport();

    const allOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).not.toContain('Render Timings');

    consoleSpy.mockRestore();
  });
});

describe('Full report', () => {
  it('returns complete performance report', () => {
    perf.markStartup('js_init');
    perf.markStartup('interactive');
    perf.sampleMemory();
    perf.recordRender('TestComp', 5);

    const report = perf.getReport();
    expect(report.startup.marks).toHaveProperty('js_init');
    expect(report.memorySamples.length).toBe(1);
    expect(report.renderTimings).toHaveProperty('TestComp');
  });

  it('returns copies of arrays (not references)', () => {
    perf.sampleMemory();
    const s = perf.startScrollSession('CopyScreen');
    perf.endScrollSession(s);
    perf.recordRender('CopyComp', 5);

    const report = perf.getReport();
    report.memorySamples.length = 0;
    report.scrollSessions.length = 0;

    const report2 = perf.getReport();
    expect(report2.memorySamples.length).toBe(1);
    expect(report2.scrollSessions.length).toBe(1);
  });
});

describe('Reset', () => {
  it('clears all state', () => {
    perf.markStartup('js_init');
    perf.sampleMemory();
    perf.recordRender('Comp', 5);
    const s = perf.startScrollSession('Screen');
    perf.endScrollSession(s);

    perf.resetForTesting();

    const report = perf.getReport();
    expect(report.startup.totalMs).toBeNull();
    expect(report.memorySamples.length).toBe(0);
    expect(report.scrollSessions.length).toBe(0);
    expect(Object.keys(report.renderTimings).length).toBe(0);
  });

  it('resets scroll session counter', () => {
    perf.startScrollSession('A');
    perf.resetForTesting();
    const session = perf.startScrollSession('B');
    expect(session.id).toBe('scroll_1');
  });

  it('stops memory monitoring timer', () => {
    perf.startMemoryMonitoring();
    perf.resetForTesting();
    jest.advanceTimersByTime(10000);
    expect(perf.getReport().memorySamples.length).toBe(0);
  });

  it('allows reporting startup again after reset', () => {
    jest.setSystemTime(1000);
    perf.markStartup('js_init');
    jest.setSystemTime(2000);
    perf.markStartup('interactive');
    perf.reportStartup();
    expect(trackEvent).toHaveBeenCalledTimes(1);

    perf.resetForTesting();
    trackEvent.mockClear();

    jest.setSystemTime(3000);
    perf.markStartup('js_init');
    jest.setSystemTime(4000);
    perf.markStartup('interactive');
    perf.reportStartup();
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});
