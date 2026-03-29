import { useState, useEffect } from 'react';
import { computeLivingSky, type LivingSkyState } from '../services/livingSky';

interface UseLivingSkyStateOptions {
  isCFPlus?: boolean;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useLivingSkyState(options: UseLivingSkyStateOptions = {}): LivingSkyState {
  const { isCFPlus = false } = options;

  const [state, setState] = useState<LivingSkyState>(() =>
    computeLivingSky(getCurrentMinutes(), { isCFPlus }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setState(computeLivingSky(getCurrentMinutes(), { isCFPlus }));
    }, 60_000);

    return () => clearInterval(interval);
  }, [isCFPlus]);

  return state;
}
