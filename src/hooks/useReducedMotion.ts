/**
 * @module useReducedMotion
 *
 * Returns true when the user has enabled "Reduce Motion" in system
 * accessibility settings. Animation hooks should check this value and
 * skip or simplify animations accordingly.
 */
import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
