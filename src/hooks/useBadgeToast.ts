/**
 * @module useBadgeToast
 *
 * Manages the visible/badgeName state for the BadgeToast component.
 * Call showBadgeToast(name) to display the toast; it auto-hides after
 * DISPLAY_DURATION_MS. Consecutive calls reset the timer and update the name.
 *
 * Used by BadgeToastContext so that useTriggerMoments (Phase 5) can trigger
 * badge unlock toasts from anywhere in the app.
 *
 * hq-v0a2z
 */
import { useCallback, useRef, useState } from 'react';

/** How long the toast stays visible before auto-hiding (ms). */
const DISPLAY_DURATION_MS = 2500;

interface UseBadgeToastReturn {
  visible: boolean;
  badgeName: string | null;
  showBadgeToast: (badgeName: string) => void;
}

export function useBadgeToast(): UseBadgeToastReturn {
  const [visible, setVisible] = useState(false);
  const [badgeName, setBadgeName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBadgeToast = useCallback((name: string) => {
    if (!name.trim()) return;

    // Clear any existing auto-hide timer before starting a new one
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setBadgeName(name);
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      // badgeName is intentionally kept for the exit animation to finish gracefully
    }, DISPLAY_DURATION_MS);
  }, []);

  return { visible, badgeName, showBadgeToast };
}
