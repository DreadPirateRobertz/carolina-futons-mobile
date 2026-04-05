/**
 * @module OnboardingStyleModalBridge
 *
 * Null-render bridge that auto-shows the OnboardingStyleModal when:
 *  - Onboarding has been completed (hasSeenOnboarding = true)
 *  - Style preferences have NOT yet been captured (no AsyncStorage entry)
 *
 * Renders null — only manages modal visibility. — cm-qdm
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingStyleModal } from './OnboardingStyleModal';
import { ONBOARDING_STYLE_STORAGE_KEY } from '@/hooks/useOnboardingStyleQuiz';

export function OnboardingStyleModalBridge() {
  const { hasSeenOnboarding } = useOnboarding();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding) return;

    AsyncStorage.getItem(ONBOARDING_STYLE_STORAGE_KEY)
      .then((value) => {
        if (!value) {
          setShowModal(true);
        }
      })
      .catch(() => {
        // Storage error — don't show modal; non-blocking
      });
  }, [hasSeenOnboarding]);

  return (
    <OnboardingStyleModal
      visible={showModal}
      onDismiss={() => setShowModal(false)}
      onComplete={() => setShowModal(false)}
    />
  );
}
