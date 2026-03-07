import { Platform } from 'react-native';

/**
 * Returns a shared transition tag for cross-screen element transitions.
 * Returns undefined on web (no native stack transitions) so the prop is omitted.
 * Easily mockable in tests where reanimated's native layer is unavailable.
 */
export function sharedTransitionTag(id: string): string | undefined {
  return Platform.OS === 'web' ? undefined : id;
}
