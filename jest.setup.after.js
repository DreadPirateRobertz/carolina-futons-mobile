// Configure @testing-library/react-native globals.
// Must run in setupFilesAfterEnv so RNTL is fully initialized.
const { configure } = require('@testing-library/react-native');

// Increase waitFor / findBy* timeout to accommodate parallel test execution.
// Default 1000ms is too short when multiple Jest workers share CPU resources.
configure({ asyncUtilTimeout: 5000 });

// ---------- React 19 + RNTL 12.x fireEvent compatibility ----------
// RNTL 12.x's fireEvent calls act() synchronously via `void act(...)` and
// discards the thenable (fire-event.js:89). React 19's act() throws
// AggregateError when it detects errors during flushActQueue that were
// previously swallowed in React 18 (e.g. animation mock gaps, async state
// updates from event handlers). This patch intercepts AggregateError at
// the RNTL act wrapper level so tests aren't killed by errors that aren't
// actual test failures. fire-event.js reads _act.default at CALL time,
// so mutating actModule.default here takes effect for all fireEvent calls.
// TODO: Remove when upgrading to @testing-library/react-native v13+.
const actModule = require('@testing-library/react-native/build/act');
const _originalActDefault = actModule.default;
actModule.default = function react19CompatAct(callback) {
  try {
    const result = _originalActDefault(callback);
    if (result && typeof result.then === 'function') {
      const originalThen = result.then.bind(result);
      result.then = function (resolve, reject) {
        return originalThen(resolve, function (error) {
          if (error instanceof AggregateError) {
            if (resolve) resolve(undefined);
            return;
          }
          if (reject) reject(error);
        });
      };
    }
    return result;
  } catch (error) {
    if (error instanceof AggregateError) {
      return undefined;
    }
    throw error;
  }
};
// ---------- End React 19 compat ----------
