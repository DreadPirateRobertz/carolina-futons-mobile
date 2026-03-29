/**
 * @module ScreenDataState tests — cm-1r1
 *
 * Covers:
 * - Shows skeleton when loading (isLoading=true, no error)
 * - Shows NetworkErrorState when error + not loading
 * - Shows children when not loading and no error
 * - Shows children when loading but already has data (reload scenario)
 * - Error includes retry callback wired to onRetry
 * - Shows nothing (null) when loading with no skeleton provided
 * - testID forwarded to container
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { ScreenDataState } from '../ScreenDataState';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sunsetCoral: '#E8845C',
      espresso: '#3A2518',
      espressoLight: '#7B5E4E',
      sandLight: '#FAF7F2',
      mountainBlue: '#5B8FA8',
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    borderRadius: { button: 8 },
  }),
}));

const Skeleton = () => <Text testID="skeleton">Loading skeleton</Text>;
const Content = () => <Text testID="content">My content</Text>;

describe('ScreenDataState', () => {
  it('shows skeleton when loading with no data', () => {
    const { getByTestId, queryByTestId } = render(
      <ScreenDataState isLoading error={null} onRetry={jest.fn()} skeleton={<Skeleton />}>
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('skeleton')).toBeTruthy();
    expect(queryByTestId('content')).toBeNull();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('shows children (not skeleton) when loading but hasData', () => {
    const { getByTestId, queryByTestId } = render(
      <ScreenDataState isLoading hasData error={null} onRetry={jest.fn()} skeleton={<Skeleton />}>
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('content')).toBeTruthy();
    expect(queryByTestId('skeleton')).toBeNull();
  });

  it('shows error state when error and not loading', () => {
    const { getByTestId, queryByTestId } = render(
      <ScreenDataState
        isLoading={false}
        error="Network request failed"
        onRetry={jest.fn()}
        skeleton={<Skeleton />}
      >
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('network-error-state')).toBeTruthy();
    expect(queryByTestId('content')).toBeNull();
    expect(queryByTestId('skeleton')).toBeNull();
  });

  it('calls onRetry when retry button pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(
      <ScreenDataState isLoading={false} error="Oops" onRetry={onRetry} skeleton={<Skeleton />}>
        <Content />
      </ScreenDataState>,
    );
    fireEvent.press(getByTestId('network-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows custom error message', () => {
    const { getByText } = render(
      <ScreenDataState
        isLoading={false}
        error="Could not load challenges"
        onRetry={jest.fn()}
        skeleton={<Skeleton />}
      >
        <Content />
      </ScreenDataState>,
    );
    expect(getByText('Could not load challenges')).toBeTruthy();
  });

  it('shows children when not loading and no error', () => {
    const { getByTestId, queryByTestId } = render(
      <ScreenDataState isLoading={false} error={null} onRetry={jest.fn()} skeleton={<Skeleton />}>
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('content')).toBeTruthy();
    expect(queryByTestId('skeleton')).toBeNull();
    expect(queryByTestId('network-error-state')).toBeNull();
  });

  it('shows nothing when loading with no skeleton', () => {
    const { queryByTestId } = render(
      <ScreenDataState isLoading error={null} onRetry={jest.fn()}>
        <Content />
      </ScreenDataState>,
    );
    expect(queryByTestId('skeleton')).toBeNull();
    expect(queryByTestId('content')).toBeNull();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <ScreenDataState isLoading={false} error={null} onRetry={jest.fn()} testID="my-data-state">
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('my-data-state')).toBeTruthy();
  });

  it('prioritizes loading over error (skeleton wins when both isLoading + error)', () => {
    const { getByTestId, queryByTestId } = render(
      <ScreenDataState isLoading error="Some error" onRetry={jest.fn()} skeleton={<Skeleton />}>
        <Content />
      </ScreenDataState>,
    );
    expect(getByTestId('skeleton')).toBeTruthy();
    expect(queryByTestId('network-error-state')).toBeNull();
  });
});
