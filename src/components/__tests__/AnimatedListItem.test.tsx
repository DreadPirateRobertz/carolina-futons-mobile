import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    FadeInDown: {
      delay: () => ({
        duration: () => ({
          springify: () => undefined,
        }),
      }),
    },
  };
});

import { AnimatedListItem } from '../AnimatedListItem';

describe('AnimatedListItem', () => {
  it('renders children with index-based delay', () => {
    const { getByText } = render(
      <AnimatedListItem index={0}>
        <Text>Item</Text>
      </AnimatedListItem>,
    );
    expect(getByText('Item')).toBeTruthy();
  });

  it('renders at different indices', () => {
    const { getByText } = render(
      <AnimatedListItem index={5}>
        <Text>Fifth Item</Text>
      </AnimatedListItem>,
    );
    expect(getByText('Fifth Item')).toBeTruthy();
  });

  it('accepts custom delay and style', () => {
    const { getByText } = render(
      <AnimatedListItem index={2} delay={100} style={{ padding: 8 }}>
        <Text>Styled Item</Text>
      </AnimatedListItem>,
    );
    expect(getByText('Styled Item')).toBeTruthy();
  });
});
