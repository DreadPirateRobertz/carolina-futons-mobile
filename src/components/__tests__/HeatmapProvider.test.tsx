import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { HeatmapProvider } from '../HeatmapProvider';
import { trackTap } from '@/services/heatmap';

jest.mock('@/services/heatmap', () => ({
  trackTap: jest.fn(),
}));

const mockTrackTap = trackTap as jest.MockedFunction<typeof trackTap>;

function makeTouchEvent(x: number, y: number) {
  return {
    nativeEvent: { locationX: x, locationY: y },
    target: {},
  };
}

beforeEach(() => {
  mockTrackTap.mockClear();
  jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('HeatmapProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <HeatmapProvider>
        <Text>Hello</Text>
      </HeatmapProvider>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('records touch events and calls trackTap with coordinates', () => {
    const { getByText } = render(
      <HeatmapProvider screenName="Shop">
        <Text>Content</Text>
      </HeatmapProvider>,
    );

    fireEvent(getByText('Content').parent!, 'touchStart', makeTouchEvent(100, 200));

    expect(mockTrackTap).toHaveBeenCalledWith('Shop', 100, 200, undefined);
  });

  it('uses "unknown" as default screen name', () => {
    const { getByText } = render(
      <HeatmapProvider>
        <Text>Content</Text>
      </HeatmapProvider>,
    );

    fireEvent(getByText('Content').parent!, 'touchStart', makeTouchEvent(50, 75));

    expect(mockTrackTap).toHaveBeenCalledWith('unknown', 50, 75, undefined);
  });

  it('does not track taps when disabled', () => {
    const { getByText } = render(
      <HeatmapProvider screenName="Shop" enabled={false}>
        <Text>Content</Text>
      </HeatmapProvider>,
    );

    fireEvent(getByText('Content').parent!, 'touchStart', makeTouchEvent(10, 20));

    expect(mockTrackTap).not.toHaveBeenCalled();
  });

  it('throttles rapid taps within TAP_THROTTLE_MS', () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1000);

    const { getByText } = render(
      <HeatmapProvider screenName="Home">
        <Text>Content</Text>
      </HeatmapProvider>,
    );

    const parent = getByText('Content').parent!;

    // First tap at t=1000
    fireEvent(parent, 'touchStart', makeTouchEvent(10, 10));
    expect(mockTrackTap).toHaveBeenCalledTimes(1);

    // Second tap at t=1050 (within 100ms throttle) — should be ignored
    now.mockReturnValue(1050);
    fireEvent(parent, 'touchStart', makeTouchEvent(20, 20));
    expect(mockTrackTap).toHaveBeenCalledTimes(1);

    // Third tap at t=1200 (past throttle) — should be recorded
    now.mockReturnValue(1200);
    fireEvent(parent, 'touchStart', makeTouchEvent(30, 30));
    expect(mockTrackTap).toHaveBeenCalledTimes(2);
    expect(mockTrackTap).toHaveBeenLastCalledWith('Home', 30, 30, undefined);
  });

  it('records multiple taps to different coordinates', () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1000);

    const { getByText } = render(
      <HeatmapProvider screenName="Gallery">
        <Text>Content</Text>
      </HeatmapProvider>,
    );

    const parent = getByText('Content').parent!;

    fireEvent(parent, 'touchStart', makeTouchEvent(10, 20));
    now.mockReturnValue(1200);
    fireEvent(parent, 'touchStart', makeTouchEvent(150, 300));

    expect(mockTrackTap).toHaveBeenCalledTimes(2);
    expect(mockTrackTap).toHaveBeenNthCalledWith(1, 'Gallery', 10, 20, undefined);
    expect(mockTrackTap).toHaveBeenNthCalledWith(2, 'Gallery', 150, 300, undefined);
  });
});
