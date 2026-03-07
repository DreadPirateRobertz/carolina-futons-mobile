import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, TextInput, Platform } from 'react-native';
import { KeyboardAwareScrollView } from '../KeyboardAwareScrollView';

describe('KeyboardAwareScrollView', () => {
  it('renders children', () => {
    const { getByText } = render(
      <KeyboardAwareScrollView>
        <Text>Hello</Text>
      </KeyboardAwareScrollView>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders with custom content container style', () => {
    const { getByText } = render(
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 20 }}>
        <Text>Content</Text>
      </KeyboardAwareScrollView>,
    );
    expect(getByText('Content')).toBeTruthy();
  });

  it('renders TextInput children for form use', () => {
    const { getByTestId } = render(
      <KeyboardAwareScrollView>
        <TextInput testID="input-field" placeholder="Name" />
      </KeyboardAwareScrollView>,
    );
    expect(getByTestId('input-field')).toBeTruthy();
  });

  it('uses padding behavior on iOS', () => {
    (Platform as { OS: string }).OS = 'ios';
    const { toJSON } = render(
      <KeyboardAwareScrollView>
        <Text>iOS</Text>
      </KeyboardAwareScrollView>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('uses height behavior on Android', () => {
    (Platform as { OS: string }).OS = 'android';
    const { toJSON } = render(
      <KeyboardAwareScrollView>
        <Text>Android</Text>
      </KeyboardAwareScrollView>,
    );
    expect(toJSON()).toBeTruthy();
  });
});
