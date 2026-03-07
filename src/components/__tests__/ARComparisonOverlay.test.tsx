import React from 'react';
import { render } from '@testing-library/react-native';
import { ARComparisonOverlay } from '../ARComparisonOverlay';

const modelA = {
  id: 'queen',
  name: 'Queen',
  dimensions: { width: 62, depth: 82, height: 14 },
};

const modelB = {
  id: 'full',
  name: 'Full',
  dimensions: { width: 54, depth: 75, height: 14 },
};

describe('ARComparisonOverlay', () => {
  it('renders both model names', () => {
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    expect(getByText('Queen')).toBeTruthy();
    expect(getByText('Full')).toBeTruthy();
  });

  it('renders both model test IDs', () => {
    const { getByTestId } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    expect(getByTestId('comparison-model-a')).toBeTruthy();
    expect(getByTestId('comparison-model-b')).toBeTruthy();
  });

  it('shows width difference', () => {
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    // Queen is 8" wider than Full
    expect(getByText('+8" wider')).toBeTruthy();
  });

  it('shows depth difference', () => {
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    // Queen is 7" deeper than Full
    expect(getByText('+7" deeper')).toBeTruthy();
  });

  it('shows same height when equal', () => {
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={modelB} />,
    );
    expect(getByText('Same height')).toBeTruthy();
  });

  it('shows shorter when B is taller', () => {
    const tallerB = { ...modelB, dimensions: { ...modelB.dimensions, height: 20 } };
    const { getByText } = render(
      <ARComparisonOverlay modelA={modelA} modelB={tallerB} />,
    );
    expect(getByText('-6" shorter')).toBeTruthy();
  });

  it('renders nothing when no models provided', () => {
    const { queryByTestId } = render(
      <ARComparisonOverlay modelA={null} modelB={null} />,
    );
    expect(queryByTestId('comparison-overlay')).toBeNull();
  });
});
