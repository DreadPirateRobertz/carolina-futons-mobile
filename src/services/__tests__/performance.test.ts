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
});
