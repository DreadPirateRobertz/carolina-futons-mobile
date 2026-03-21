/**
 * Tests for referral deep link routing — cm-z0x.
 *
 * carolinafutons://referral/{code} must resolve to the ReferralLanding screen
 * with the code param.
 */
import { linkingConfig } from '../linking';
import { getStateFromPath } from '@react-navigation/native';

function getScreen(path: string): string {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return 'NO_MATCH';
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.name;
}

function getParams(path: string): Record<string, any> | undefined {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return undefined;
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.params as Record<string, any> | undefined;
}

describe('referral deep link', () => {
  it('routes carolinafutons://referral/{code} to ReferralLanding', () => {
    expect(getScreen('referral/FUTON-XK7P')).toBe('ReferralLanding');
  });

  it('passes code param to ReferralLanding', () => {
    const params = getParams('referral/FUTON-XK7P');
    expect(params?.code).toBe('FUTON-XK7P');
  });

  it('handles alphanumeric codes with hyphens', () => {
    const params = getParams('referral/ABC-123-XYZ');
    expect(params?.code).toBe('ABC-123-XYZ');
  });

  it('returns NO_MATCH for referral without code', () => {
    // bare /referral without a code segment should not match
    expect(getScreen('referral/')).not.toBe('ReferralLanding');
  });
});
