import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { EmptyState } from '../EmptyState';

function MockIllustration(props: { testID?: string }) {
  return <View testID={props.testID ?? 'mock-illustration'} />;
}

describe('EmptyState — illustration prop', () => {
  it('renders illustration component when provided', () => {
    const { getByTestId } = render(
      <EmptyState
        title="Empty"
        message="Nothing here"
        illustration={<MockIllustration testID="my-illustration" />}
        testID="empty-state"
      />,
    );
    expect(getByTestId('my-illustration')).toBeTruthy();
  });

  it('renders illustration instead of icon when both provided', () => {
    const { getByTestId, queryByTestId } = render(
      <EmptyState
        title="Empty"
        message="Nothing here"
        icon="cart"
        illustration={<MockIllustration testID="my-illustration" />}
        testID="empty-state"
      />,
    );
    expect(getByTestId('my-illustration')).toBeTruthy();
    expect(queryByTestId('empty-state-icon')).toBeNull();
  });

  it('still renders icon when no illustration provided', () => {
    const { getByTestId } = render(
      <EmptyState
        title="Empty"
        message="Nothing here"
        icon="cart"
        testID="empty-state"
      />,
    );
    expect(getByTestId('empty-state-icon')).toBeTruthy();
  });
});
