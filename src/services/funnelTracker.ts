/**
 * Runtime funnel tracker — monitors user progression through conversion funnels.
 *
 * Listens to analytics events and maps them to funnel steps, tracking where users
 * drop off in each funnel. Provides real-time funnel reports per session.
 *
 * Usage:
 *   startFunnelTracking();  // Call once at app init
 *   getFunnelReport('purchase');  // Get current funnel state
 *   getAllFunnelReports();  // Get all funnel reports
 */
import { getEventBuffer, type AnalyticsEventName, type AnalyticsEvent } from './analytics';
import { allFunnels, type Funnel } from './funnels';

export interface FunnelStepReport {
  name: string;
  event: AnalyticsEventName;
  reached: boolean;
  count: number;
  firstReachedAt?: number;
}

export interface FunnelReport {
  id: string;
  name: string;
  steps: FunnelStepReport[];
  entries: number;
  completionRate: number;
  currentStep: number;
  dropOffStep?: number;
}

let _tracking = false;
let _lastProcessedIndex = 0;

// Per-funnel state: maps funnel ID to step completion counts
const _funnelState = new Map<
  string,
  {
    stepCounts: number[];
    stepFirstReached: (number | undefined)[];
    completions: number;
    entries: number;
  }
>();

/** Initialize funnel tracking state */
function initState(): void {
  _funnelState.clear();
  _lastProcessedIndex = 0;

  for (const funnel of allFunnels) {
    _funnelState.set(funnel.id, {
      stepCounts: new Array(funnel.steps.length).fill(0),
      stepFirstReached: new Array(funnel.steps.length).fill(undefined),
      completions: 0,
      entries: 0,
    });
  }
}

/** Process new events from the analytics buffer */
function processNewEvents(): void {
  const buffer = getEventBuffer();
  const newEvents = buffer.slice(_lastProcessedIndex);
  _lastProcessedIndex = buffer.length;

  for (const event of newEvents) {
    processEvent(event);
  }
}

/** Map a single event to funnel step progressions */
function processEvent(event: AnalyticsEvent): void {
  for (const funnel of allFunnels) {
    const state = _funnelState.get(funnel.id);
    if (!state) continue;

    for (let i = 0; i < funnel.steps.length; i++) {
      if (funnel.steps[i].event === event.name) {
        state.stepCounts[i] += 1;
        if (state.stepFirstReached[i] === undefined) {
          state.stepFirstReached[i] = event.timestamp;
        }

        // Track entries (first step) and completions (last step)
        if (i === 0) {
          state.entries += 1;
        }
        if (i === funnel.steps.length - 1) {
          state.completions += 1;
        }
      }
    }
  }
}

/** Start tracking funnel progressions. Call once at app init. */
export function startFunnelTracking(): void {
  if (_tracking) return;
  _tracking = true;
  initState();
}

/** Process events and get a report for a specific funnel */
export function getFunnelReport(funnelId: string): FunnelReport | null {
  processNewEvents();

  const funnel = allFunnels.find((f) => f.id === funnelId);
  const state = _funnelState.get(funnelId);
  if (!funnel || !state) return null;

  return buildReport(funnel, state);
}

/** Process events and get reports for all funnels */
export function getAllFunnelReports(): FunnelReport[] {
  processNewEvents();

  return allFunnels.map((funnel) => {
    const state = _funnelState.get(funnel.id)!;
    return buildReport(funnel, state);
  });
}

function buildReport(
  funnel: Funnel,
  state: { stepCounts: number[]; stepFirstReached: (number | undefined)[]; completions: number; entries: number },
): FunnelReport {
  const steps: FunnelStepReport[] = funnel.steps.map((step, i) => ({
    name: step.name,
    event: step.event,
    reached: state.stepCounts[i] > 0,
    count: state.stepCounts[i],
    firstReachedAt: state.stepFirstReached[i],
  }));

  // Find current step (last step that was reached)
  let currentStep = -1;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].reached) {
      currentStep = i;
      break;
    }
  }

  // Find drop-off step (first step not reached after a reached step)
  let dropOffStep: number | undefined;
  for (let i = 0; i < steps.length; i++) {
    if (!steps[i].reached && (i === 0 || steps[i - 1].reached)) {
      dropOffStep = i;
      break;
    }
  }

  const completionRate = state.entries > 0 ? state.completions / state.entries : 0;

  return {
    id: funnel.id,
    name: funnel.name,
    steps,
    entries: state.entries,
    completionRate,
    currentStep,
    dropOffStep,
  };
}

/** Check if tracking is active */
export function isTracking(): boolean {
  return _tracking;
}

/** Reset funnel tracking state */
export function resetFunnelTracking(): void {
  _tracking = false;
  _funnelState.clear();
  _lastProcessedIndex = 0;
}
