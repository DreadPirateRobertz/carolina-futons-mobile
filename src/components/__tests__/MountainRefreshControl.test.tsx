import React from 'react';
import { RefreshControl } from 'react-native';
import { render } from '@testing-library/react-native';
import { MountainRefreshControl, MountainRefreshIndicator } from '../MountainRefreshControl';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('Svg', props),
    Svg: (props: any) => React.createElement('Svg', props),
    Path: (props: any) => React.createElement('Path', props),
  };
});

describe('MountainRefreshControl', () => {
  const onRefresh = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders a RefreshControl', () => {
    const { UNSAFE_getByType } = render(
      <MountainRefreshControl refreshing={false} onRefresh={onRefresh} />,
    );
    expect(UNSAFE_getByType(RefreshControl)).toBeTruthy();
  });

  it('passes refreshing and onRefresh to RefreshControl', () => {
    const { UNSAFE_getByType } = render(
      <MountainRefreshControl refreshing={true} onRefresh={onRefresh} />,
    );
    const control = UNSAFE_getByType(RefreshControl);
    expect(control.props.refreshing).toBe(true);
    expect(control.props.onRefresh).toBe(onRefresh);
  });

  it('forwards additional props to RefreshControl', () => {
    const { UNSAFE_getByType } = render(
      <MountainRefreshControl
        refreshing={false}
        onRefresh={onRefresh}
        testID="custom-refresh"
      />,
    );
    const control = UNSAFE_getByType(RefreshControl);
    expect(control.props.testID).toBe('custom-refresh');
  });
});

describe('MountainRefreshIndicator', () => {
  it('renders mountain icon when refreshing', () => {
    const { getByTestId } = render(
      <MountainRefreshIndicator refreshing={true} />,
    );
    expect(getByTestId('mountain-refresh-indicator')).toBeTruthy();
  });

  it('renders nothing when not refreshing', () => {
    const { queryByTestId } = render(
      <MountainRefreshIndicator refreshing={false} />,
    );
    expect(queryByTestId('mountain-refresh-indicator')).toBeNull();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(
      <MountainRefreshIndicator refreshing={true} testID="custom-indicator" />,
    );
    expect(getByTestId('custom-indicator')).toBeTruthy();
  });
});
