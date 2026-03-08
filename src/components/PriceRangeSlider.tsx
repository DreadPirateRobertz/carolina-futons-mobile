import React, { useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, PanResponder, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  onChangeRange: (low: number, high: number) => void;
  testID?: string;
}

export function PriceRangeSlider({ min, max, low, high, onChangeRange, testID }: Props) {
  const { colors, borderRadius } = useTheme();
  const trackWidth = useRef(0);

  // Keep current values in refs so PanResponder callbacks always read fresh values
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const onChangeRef = useRef(onChangeRange);
  lowRef.current = low;
  highRef.current = high;
  minRef.current = min;
  maxRef.current = max;
  onChangeRef.current = onChangeRange;

  const range = max - min || 1;
  const lowPct = ((low - min) / range) * 100;
  const highPct = ((high - min) / range) * 100;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const lowResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gs) => {
          const curMin = minRef.current;
          const curMax = maxRef.current;
          const curRange = curMax - curMin || 1;
          const curLow = lowRef.current;
          const curHigh = highRef.current;
          const lowFrac = (curLow - curMin) / curRange;
          const startPx = lowFrac * (trackWidth.current || 1);
          const rawVal = curMin + ((startPx + gs.dx) / (trackWidth.current || 1)) * curRange;
          const newVal = Math.max(curMin, Math.min(curMax, Math.round(rawVal)));
          if (newVal <= curHigh) onChangeRef.current(newVal, curHigh);
        },
      }),
    [],
  );

  const highResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gs) => {
          const curMin = minRef.current;
          const curMax = maxRef.current;
          const curRange = curMax - curMin || 1;
          const curLow = lowRef.current;
          const curHigh = highRef.current;
          const highFrac = (curHigh - curMin) / curRange;
          const startPx = highFrac * (trackWidth.current || 1);
          const rawVal = curMin + ((startPx + gs.dx) / (trackWidth.current || 1)) * curRange;
          const newVal = Math.max(curMin, Math.min(curMax, Math.round(rawVal)));
          if (newVal >= curLow) onChangeRef.current(curLow, newVal);
        },
      }),
    [],
  );

  return (
    <View testID={testID ?? 'price-range-slider'} style={styles.container}>
      <View style={styles.labels}>
        <Text
          style={[styles.labelText, { color: colors.espresso }]}
          testID="price-range-low-label"
        >
          ${low}
        </Text>
        <Text
          style={[styles.labelText, { color: colors.espresso }]}
          testID="price-range-high-label"
        >
          ${high}
        </Text>
      </View>

      <View style={styles.trackContainer} onLayout={onLayout}>
        {/* Background track */}
        <View
          style={[styles.track, { backgroundColor: colors.sandDark, borderRadius: borderRadius.sm }]}
        />

        {/* Active range */}
        <View
          style={[
            styles.activeTrack,
            {
              left: `${lowPct}%`,
              width: `${highPct - lowPct}%`,
              backgroundColor: colors.mountainBlue,
              borderRadius: borderRadius.sm,
            },
          ]}
        />

        {/* Low thumb */}
        <View
          {...lowResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: `${lowPct}%`,
              backgroundColor: colors.white,
              borderColor: colors.mountainBlue,
              shadowColor: colors.espresso,
            },
          ]}
          testID="price-range-low-thumb"
          accessibilityRole="adjustable"
          accessibilityLabel={`Minimum price $${low}`}
        />

        {/* High thumb */}
        <View
          {...highResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: `${highPct}%`,
              backgroundColor: colors.white,
              borderColor: colors.mountainBlue,
              shadowColor: colors.espresso,
            },
          ]}
          testID="price-range-high-thumb"
          accessibilityRole="adjustable"
          accessibilityLabel={`Maximum price $${high}`}
        />
      </View>
    </View>
  );
}

const THUMB_SIZE = 24;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    width: '100%',
    position: 'absolute',
  },
  activeTrack: {
    height: 4,
    position: 'absolute',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    position: 'absolute',
    marginLeft: -THUMB_SIZE / 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
