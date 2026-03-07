import React from 'react';
import { render } from '@testing-library/react-native';
import { ARMeasurementOverlay } from '../ARMeasurementOverlay';

describe('ARMeasurementOverlay', () => {
  it('renders nothing when idle', () => {
    const { queryByTestId } = render(
      <ARMeasurementOverlay points={[]} state="idle" distanceDisplay="" />,
    );
    expect(queryByTestId('measurement-overlay')).toBeNull();
  });

  it('renders instruction when placing first point', () => {
    const { getByText } = render(
      <ARMeasurementOverlay points={[]} state="placing-first" distanceDisplay="" />,
    );
    expect(getByText('Tap first endpoint')).toBeTruthy();
  });

  it('renders endpoint marker after first tap', () => {
    const { getByTestId, getByText } = render(
      <ARMeasurementOverlay
        points={[{ x: 100, y: 200, z: 0 }]}
        state="placing-second"
        distanceDisplay=""
      />,
    );
    expect(getByTestId('measurement-point-0')).toBeTruthy();
    expect(getByText('Tap second endpoint')).toBeTruthy();
  });

  it('renders distance label after measurement', () => {
    const { getByText } = render(
      <ARMeasurementOverlay
        points={[
          { x: 50, y: 200, z: 0 },
          { x: 300, y: 200, z: 0 },
        ]}
        state="measured"
        distanceDisplay={'6\' 2"'}
      />,
    );
    expect(getByText("6' 2\"")).toBeTruthy();
  });

  it('renders Fits! indicator when fits is true', () => {
    const { getByText } = render(
      <ARMeasurementOverlay
        points={[
          { x: 50, y: 200, z: 0 },
          { x: 300, y: 200, z: 0 },
        ]}
        state="measured"
        distanceDisplay={'6\' 2"'}
        fits={true}
      />,
    );
    expect(getByText('Fits!')).toBeTruthy();
  });

  it('renders Too large indicator when fits is false', () => {
    const { getByText } = render(
      <ARMeasurementOverlay
        points={[
          { x: 50, y: 200, z: 0 },
          { x: 300, y: 200, z: 0 },
        ]}
        state="measured"
        distanceDisplay={'3\' 3"'}
        fits={false}
      />,
    );
    expect(getByText('Too large')).toBeTruthy();
  });

  it('does not render fit indicator when fits is null', () => {
    const { queryByText } = render(
      <ARMeasurementOverlay
        points={[
          { x: 50, y: 200, z: 0 },
          { x: 300, y: 200, z: 0 },
        ]}
        state="measured"
        distanceDisplay={'6\' 2"'}
        fits={null}
      />,
    );
    expect(queryByText('Fits!')).toBeNull();
    expect(queryByText('Too large')).toBeNull();
  });
});
