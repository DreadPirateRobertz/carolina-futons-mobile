/**
 * ScreenErrorBoundary — Sentry breadcrumb integration tests (cm-ad2)
 *
 * Verifies that when ScreenErrorBoundary catches a render crash,
 * Sentry.addBreadcrumb is called with the screen name and error message.
 *
 * Mock @sentry/react-native inline (no external variable references in factory)
 * to avoid jest-hoist TDZ issues. Access mock fns via require() in beforeEach.
 */

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) =>
    cb({ setLevel: jest.fn(), setExtras: jest.fn(), setTag: jest.fn() }),
  ),
  wrap: jest.fn((c: unknown) => c),
  reactNavigationIntegration: jest.fn(() => ({})),
  mobileReplayIntegration: jest.fn(() => ({})),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';
import * as crashReporting from '@/services/crashReporting';
import { SentryCrashReportingProvider } from '@/services/providers/sentryCrashReporting';

function BrokenChild(): React.ReactElement {
  throw new Error('render crash');
}

// Resolved after module load — safe to reference the mock fns here
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MockSentry = require('@sentry/react-native') as {
  addBreadcrumb: jest.Mock;
  captureException: jest.Mock;
};

let consoleError: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  crashReporting.resetForTesting();
  crashReporting.registerProvider(
    new SentryCrashReportingProvider({ dsn: 'https://test@sentry.io/123' }),
  );
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('ScreenErrorBoundary — Sentry.addBreadcrumb integration', () => {
  it('calls Sentry.addBreadcrumb when screen boundary catches a crash', () => {
    render(
      <ScreenErrorBoundary screenName="ProductDetail">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it('breadcrumb message includes the screen name', () => {
    render(
      <ScreenErrorBoundary screenName="ProductDetail">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ProductDetail'),
      }),
    );
  });

  it('breadcrumb data includes the error message', () => {
    render(
      <ScreenErrorBoundary screenName="Cart">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ message: 'render crash' }),
      }),
    );
  });

  it('breadcrumb category is error', () => {
    render(
      <ScreenErrorBoundary screenName="Checkout">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'error' }),
    );
  });

  it('breadcrumb is sent exactly once per crash event', () => {
    render(
      <ScreenErrorBoundary screenName="Home">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it('breadcrumb message includes the correct screen name for different screens', () => {
    render(
      <ScreenErrorBoundary screenName="OrderHistory">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('OrderHistory'),
      }),
    );
  });

  it('Sentry.captureException is also called for the same crash', () => {
    render(
      <ScreenErrorBoundary screenName="Login">
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(MockSentry.captureException).toHaveBeenCalledTimes(1);
  });
});
