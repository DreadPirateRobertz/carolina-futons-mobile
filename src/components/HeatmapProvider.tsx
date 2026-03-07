/**
 * HeatmapProvider — wraps the app to capture touch events for heatmap analytics.
 *
 * Captures all touch-start events in the app and logs them to the heatmap service
 * with screen-relative coordinates. Uses the current navigation route as the screen name.
 *
 * Usage:
 *   <HeatmapProvider screenName="Home">
 *     <App />
 *   </HeatmapProvider>
 */
import React, { useCallback, useRef, type PropsWithChildren } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { trackTap } from '@/services/heatmap';

interface Props {
  screenName?: string;
  enabled?: boolean;
}

const TAP_THROTTLE_MS = 100;

export function HeatmapProvider({
  children,
  screenName = 'unknown',
  enabled = true,
}: PropsWithChildren<Props>) {
  const lastTapRef = useRef(0);

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (!enabled) return;

      const now = Date.now();
      if (now - lastTapRef.current < TAP_THROTTLE_MS) return;
      lastTapRef.current = now;

      const { locationX, locationY } = event.nativeEvent;
      // Try to find the testID of the touched element for element identification
      const target = event.target as any;
      const elementId = target?._nativeTag ? undefined : undefined;

      trackTap(screenName, locationX, locationY, elementId);
    },
    [screenName, enabled],
  );

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => false}
      onTouchStart={handleTouchStart}
    >
      {children}
    </View>
  );
}
