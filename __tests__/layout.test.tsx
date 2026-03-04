import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { Section } from '../src/components/layout/Section';
import { ContentBlock } from '../src/components/layout/ContentBlock';
import { SplitRow } from '../src/components/layout/SplitRow';
import { HeroBanner } from '../src/components/layout/HeroBanner';
import { EditorialCard } from '../src/components/layout/EditorialCard';
import { PullQuote } from '../src/components/layout/PullQuote';
import { Divider } from '../src/components/layout/Divider';

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID={props.testID ?? 'expo-image'} />,
  };
});

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Section', () => {
  it('renders children', () => {
    const { getByText } = wrap(
      <Section testID="section">
        <Text>Section content</Text>
      </Section>,
    );
    expect(getByText('Section content')).toBeTruthy();
  });

  it('renders title and subtitle', () => {
    const { getByText } = wrap(
      <Section title="My Title" subtitle="My Subtitle">
        <Text>content</Text>
      </Section>,
    );
    expect(getByText('My Title')).toBeTruthy();
    expect(getByText('My Subtitle')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = wrap(
      <Section testID="test-section">
        <Text>content</Text>
      </Section>,
    );
    expect(getByTestId('test-section')).toBeTruthy();
  });
});

describe('ContentBlock', () => {
  it('renders children', () => {
    const { getByText } = wrap(
      <ContentBlock>
        <Text>Block content</Text>
      </ContentBlock>,
    );
    expect(getByText('Block content')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = wrap(
      <ContentBlock testID="content-block" card>
        <Text>content</Text>
      </ContentBlock>,
    );
    expect(getByTestId('content-block')).toBeTruthy();
  });
});

describe('SplitRow', () => {
  it('renders left and right columns', () => {
    const { getByText } = wrap(
      <SplitRow
        left={<Text>Left col</Text>}
        right={<Text>Right col</Text>}
        testID="split"
      />,
    );
    expect(getByText('Left col')).toBeTruthy();
    expect(getByText('Right col')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = wrap(
      <SplitRow
        left={<Text>L</Text>}
        right={<Text>R</Text>}
        testID="split-row"
      />,
    );
    expect(getByTestId('split-row')).toBeTruthy();
  });
});

describe('HeroBanner', () => {
  it('renders title and subtitle', () => {
    const { getByText } = wrap(
      <HeroBanner title="Hero Title" subtitle="Hero Subtitle" testID="hero" />,
    );
    expect(getByText('Hero Title')).toBeTruthy();
    expect(getByText('Hero Subtitle')).toBeTruthy();
  });

  it('renders children', () => {
    const { getByText } = wrap(
      <HeroBanner testID="hero">
        <Text>Hero content</Text>
      </HeroBanner>,
    );
    expect(getByText('Hero content')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = wrap(<HeroBanner testID="hero-banner" />);
    expect(getByTestId('hero-banner')).toBeTruthy();
  });
});

describe('EditorialCard', () => {
  it('renders title', () => {
    const { getByText } = wrap(
      <EditorialCard title="Card Title" testID="editorial" />,
    );
    expect(getByText('Card Title')).toBeTruthy();
  });

  it('renders description and label', () => {
    const { getByText } = wrap(
      <EditorialCard
        title="Card"
        description="Card description"
        label="Style Guide"
        testID="editorial"
      />,
    );
    expect(getByText('Card description')).toBeTruthy();
    expect(getByText('Style Guide')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = wrap(
      <EditorialCard title="Card" testID="editorial-card" />,
    );
    expect(getByTestId('editorial-card')).toBeTruthy();
  });
});

describe('PullQuote', () => {
  it('renders quote text with quotation marks', () => {
    const { getByText } = wrap(
      <PullQuote quote="A great quote" testID="quote" />,
    );
    expect(getByText('\u201CA great quote\u201D')).toBeTruthy();
  });

  it('renders attribution', () => {
    const { getByText } = wrap(
      <PullQuote quote="Quote" attribution="John Doe" testID="quote" />,
    );
    expect(getByText('— John Doe')).toBeTruthy();
  });
});

describe('Divider', () => {
  it('renders with testID', () => {
    const { getByTestId } = wrap(<Divider testID="divider" />);
    expect(getByTestId('divider')).toBeTruthy();
  });
});

describe('Dark mode integration', () => {
  it('layout components render in dark mode', () => {
    const { getByText, getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <Section title="Dark Section" testID="dark-section">
          <Text>Dark content</Text>
        </Section>
      </ThemeProvider>,
    );
    expect(getByTestId('dark-section')).toBeTruthy();
    expect(getByText('Dark Section')).toBeTruthy();
  });
});
