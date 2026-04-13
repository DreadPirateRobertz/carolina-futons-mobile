/**
 * Tests for the perfMark lightweight telemetry service.
 *
 * Covers:
 *   - markStart / markEnd in dev mode (calls performance.mark, logs)
 *   - markStart / markEnd in prod mode (pure no-ops)
 *   - graceful handling when global.performance is unavailable
 *   - markEnd without prior markStart (no throw)
 *   - elapsed ms calculation
 */

// --- performance mock setup --------------------------------------------------

// jest-expo / jsdom exposes a minimal performance object without mark/measure.
// We install a complete mock before any test runs.
const mockMark = jest.fn();
const mockMeasure = jest.fn();
const mockClearMarks = jest.fn();
const mockClearMeasures = jest.fn();

function installPerfMock() {
  (global as any).performance = {
    mark: mockMark,
    measure: mockMeasure,
    clearMarks: mockClearMarks,
    clearMeasures: mockClearMeasures,
    now: () => Date.now(),
  };
}

// --- helpers -----------------------------------------------------------------

const originalDev = (global as any).__DEV__;

function setDev(value: boolean) {
  (global as any).__DEV__ = value;
}

let logSpy: jest.SpyInstance;

beforeEach(() => {
  installPerfMock();
  mockMark.mockReset();
  mockMeasure.mockReset().mockReturnValue({
    duration: 0,
    name: '',
    entryType: 'measure',
    startTime: 0,
    toJSON: () => ({}),
  } as PerformanceMeasure);
  mockClearMarks.mockReset();
  mockClearMeasures.mockReset();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  setDev(true);
  jest.resetModules();
});

afterEach(() => {
  logSpy.mockRestore();
  setDev(originalDev);
});

// --- dev mode ----------------------------------------------------------------

describe('perfMark (dev mode)', () => {
  it('markStart calls performance.mark with start suffix', () => {
    setDev(true);
    const { markStart } = require('../perfMark');
    markStart('TestScreen.mount');
    expect(mockMark).toHaveBeenCalledWith('TestScreen.mount:start');
  });

  it('markEnd calls performance.mark with end suffix and performance.measure', () => {
    setDev(true);
    const { markStart, markEnd } = require('../perfMark');
    markStart('TestScreen.mount');
    mockMark.mockClear();
    markEnd('TestScreen.mount');
    expect(mockMark).toHaveBeenCalledWith('TestScreen.mount:end');
    expect(mockMeasure).toHaveBeenCalledWith(
      'TestScreen.mount',
      'TestScreen.mount:start',
      'TestScreen.mount:end',
    );
  });

  it('markEnd logs elapsed ms via console.log with [Perf] prefix', () => {
    setDev(true);
    mockMeasure.mockReturnValue({
      duration: 123.4,
      name: 'HomeScreen.mount',
      entryType: 'measure',
      startTime: 0,
      toJSON: () => ({}),
    } as PerformanceMeasure);
    const { markStart, markEnd } = require('../perfMark');
    markStart('HomeScreen.mount');
    markEnd('HomeScreen.mount');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Perf]'),
      expect.stringContaining('HomeScreen.mount'),
      expect.anything(),
    );
  });

  it('markEnd without prior markStart does not throw', () => {
    setDev(true);
    // Simulate measure throwing (no start mark)
    mockMeasure.mockImplementation(() => {
      throw new Error('start mark not found');
    });
    const { markEnd } = require('../perfMark');
    expect(() => markEnd('NoStart.missing')).not.toThrow();
  });

  it('gracefully handles missing global.performance', () => {
    setDev(true);
    const savedPerf = (global as any).performance;
    delete (global as any).performance;
    const { markStart, markEnd } = require('../perfMark');
    expect(() => markStart('X.mount')).not.toThrow();
    expect(() => markEnd('X.mount')).not.toThrow();
    (global as any).performance = savedPerf;
  });
});

// --- prod mode ---------------------------------------------------------------

describe('perfMark (prod mode — no-ops)', () => {
  it('markStart does NOT call performance.mark in prod', () => {
    setDev(false);
    const { markStart } = require('../perfMark');
    markStart('TestScreen.mount');
    expect(mockMark).not.toHaveBeenCalled();
  });

  it('markEnd does NOT call performance.measure in prod', () => {
    setDev(false);
    const { markStart, markEnd } = require('../perfMark');
    markStart('TestScreen.mount');
    markEnd('TestScreen.mount');
    expect(mockMeasure).not.toHaveBeenCalled();
  });

  it('markEnd does NOT log in prod', () => {
    setDev(false);
    const { markStart, markEnd } = require('../perfMark');
    markStart('TestScreen.mount');
    markEnd('TestScreen.mount');
    expect(logSpy).not.toHaveBeenCalled();
  });
});

// --- elapsed ms --------------------------------------------------------------

describe('perfMark elapsed ms', () => {
  it('logs the duration returned by performance.measure', () => {
    setDev(true);
    mockMeasure.mockReturnValue({
      duration: 75.5,
      name: 'HomeScreen.mount',
      entryType: 'measure',
      startTime: 0,
      toJSON: () => ({}),
    } as PerformanceMeasure);
    const { markStart, markEnd } = require('../perfMark');
    markStart('HomeScreen.mount');
    markEnd('HomeScreen.mount');
    const allArgs = logSpy.mock.calls[0].join(' ');
    expect(allArgs).toMatch(/75/);
  });
});
