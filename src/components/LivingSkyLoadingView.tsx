/**
 * @module LivingSkyLoadingView
 *
 * Splash/loading screen shown while fonts load on app startup.
 * Renders the Living Sky at golden hour (totalMinutes=1170, h=19.5)
 * — the most dramatic Blue Ridge scene.
 *
 * hq-oq1gk
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LivingSkyMountainSkyline } from '@/components/LivingSkyMountainSkyline';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { useLivingSky } from '@/hooks/useLivingSky';

/** Golden hour: h=19.5 in skyTable — deep purple-blue sky, near-black ridges, warm rim light */
const GOLDEN_HOUR_MINUTES = 1170;

export function LivingSkyLoadingView() {
  const skyState = useLivingSky(GOLDEN_HOUR_MINUTES);

  return (
    <View testID="living-sky-loading-view" style={styles.root}>
      <LivingSkyMountainSkyline
        state={skyState}
        style={styles.skyline}
        testID="living-sky-loading-skyline"
      />
      <View style={styles.spinnerContainer}>
        <BrandedSpinner size="large" color="#E8845C" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#100E1E', // deep dusk — matches golden-hour navBg
    justifyContent: 'flex-end',
  },
  skyline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
