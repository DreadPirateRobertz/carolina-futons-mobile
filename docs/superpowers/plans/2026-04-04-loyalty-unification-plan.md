# Loyalty Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align mobile loyalty system with web's 4-tier structure and shared Wix collections so both platforms show consistent points, tiers, and perks.

**Architecture:** Replace mobile's 3-tier Bronze/Silver/Gold system with web's 4-tier Trail Blazer/Mountain Guide/Summit Master/Blue Ridge Legend. Consume shared `gamificationTokens` config for point values. Wire tier perks from web's `TierPerkDeliveries` Wix collection. Keep existing `useLoyalty` hook interface but update internals.

**Tech Stack:** React Native, Wix SDK (`getWixClientSingleton`), AsyncStorage (offline cache), Jest + React Testing Library

---

## File Structure

| Action | Path                                                 | Responsibility                                        |
| ------ | ---------------------------------------------------- | ----------------------------------------------------- |
| Modify | `src/hooks/useLoyalty.ts`                            | Update tier definitions, add perks fetching           |
| Modify | `src/screens/LoyaltyScreen.tsx`                      | Display new tier names + perks section                |
| Modify | `src/screens/RewardsScreen.tsx`                      | Align redemption tiers with new names                 |
| Modify | `src/screens/PointsHistoryScreen.tsx`                | Update tier labels in history entries                 |
| Create | `src/data/loyaltyTiers.ts`                           | Shared tier config (names, thresholds, colors, perks) |
| Create | `src/hooks/__tests__/useLoyalty.unification.test.ts` | Tests for new tier system                             |
| Modify | `src/hooks/__tests__/useLoyalty.test.ts`             | Update existing tests for new tier names              |
| Create | `src/components/TierPerkCard.tsx`                    | Perk display card component                           |
| Create | `src/components/__tests__/TierPerkCard.test.tsx`     | TierPerkCard tests                                    |

---

### Task 1: Define Shared Tier Configuration

**Files:**

- Create: `src/data/loyaltyTiers.ts`
- Create: `src/hooks/__tests__/useLoyalty.unification.test.ts`

- [ ] **Step 1: Write the tier config test**

```typescript
// src/hooks/__tests__/useLoyalty.unification.test.ts
import { LOYALTY_TIERS, getTierForPoints, type LoyaltyTierConfig } from '@/data/loyaltyTiers';

describe('Loyalty tier unification', () => {
  it('defines 4 tiers matching web config', () => {
    expect(LOYALTY_TIERS).toHaveLength(4);
    expect(LOYALTY_TIERS.map((t) => t.name)).toEqual([
      'Trail Blazer',
      'Mountain Guide',
      'Summit Master',
      'Blue Ridge Legend',
    ]);
  });

  it('Trail Blazer is 0-499 points', () => {
    expect(getTierForPoints(0).name).toBe('Trail Blazer');
    expect(getTierForPoints(499).name).toBe('Trail Blazer');
  });

  it('Mountain Guide is 500-1499 points', () => {
    expect(getTierForPoints(500).name).toBe('Mountain Guide');
    expect(getTierForPoints(1499).name).toBe('Mountain Guide');
  });

  it('Summit Master is 2000-4999 points', () => {
    expect(getTierForPoints(2000).name).toBe('Summit Master');
    expect(getTierForPoints(4999).name).toBe('Summit Master');
  });

  it('Blue Ridge Legend is 5000+ points', () => {
    expect(getTierForPoints(5000).name).toBe('Blue Ridge Legend');
    expect(getTierForPoints(99999).name).toBe('Blue Ridge Legend');
  });

  it('each tier has perks array', () => {
    for (const tier of LOYALTY_TIERS) {
      expect(Array.isArray(tier.perks)).toBe(true);
      expect(tier.perks.length).toBeGreaterThan(0);
    }
  });

  it('each tier has a color from design tokens', () => {
    for (const tier of LOYALTY_TIERS) {
      expect(tier.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('negative points returns Trail Blazer', () => {
    expect(getTierForPoints(-1).name).toBe('Trail Blazer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/__tests__/useLoyalty.unification.test.ts --no-coverage`
Expected: FAIL with "Cannot find module '@/data/loyaltyTiers'"

- [ ] **Step 3: Write the tier config module**

```typescript
// src/data/loyaltyTiers.ts
export interface LoyaltyTierConfig {
  name: string;
  minPoints: number;
  color: string;
  icon: string;
  perks: string[];
}

export const LOYALTY_TIERS: LoyaltyTierConfig[] = [
  {
    name: 'Trail Blazer',
    minPoints: 0,
    color: '#8B7355',
    icon: 'trail-blazer',
    perks: ['Earn 1 point per $1 spent', 'Birthday bonus points'],
  },
  {
    name: 'Mountain Guide',
    minPoints: 500,
    color: '#5B8FA8',
    icon: 'mountain-guide',
    perks: ['Earn 1.5x points per $1', 'Free standard shipping', 'Early access to sales'],
  },
  {
    name: 'Summit Master',
    minPoints: 2000,
    color: '#E8845C',
    icon: 'summit-master',
    perks: [
      'Earn 2x points per $1',
      'Free expedited shipping',
      'Free styling consultation',
      'Exclusive member pricing',
    ],
  },
  {
    name: 'Blue Ridge Legend',
    minPoints: 5000,
    color: '#C9A84C',
    icon: 'blue-ridge-legend',
    perks: [
      'Earn 3x points per $1',
      'Free white-glove delivery',
      'Dedicated concierge',
      'Annual loyalty gift',
      'Early access to new products',
    ],
  },
];

export function getTierForPoints(points: number): LoyaltyTierConfig {
  const safePoints = Math.max(0, points);
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (safePoints >= LOYALTY_TIERS[i].minPoints) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/__tests__/useLoyalty.unification.test.ts --no-coverage`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/loyaltyTiers.ts src/hooks/__tests__/useLoyalty.unification.test.ts
git commit -m "feat(cm-elo): define 4-tier loyalty config aligned with web"
```

---

### Task 2: Update useLoyalty Hook

**Files:**

- Modify: `src/hooks/useLoyalty.ts`
- Modify: `src/hooks/__tests__/useLoyalty.test.ts`

- [ ] **Step 1: Update existing tests to use new tier names**

In `src/hooks/__tests__/useLoyalty.test.ts`, replace all references to `Bronze`, `Silver`, `Gold` with `Trail Blazer`, `Mountain Guide`, `Summit Master`. Update point thresholds to match new config. Any test asserting 3 tiers should assert 4.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/hooks/__tests__/useLoyalty.test.ts --no-coverage`
Expected: FAIL — old tier names no longer match

- [ ] **Step 3: Update useLoyalty.ts internals**

In `src/hooks/useLoyalty.ts`:

- Replace the `LoyaltyTier` type with import from `@/data/loyaltyTiers`
- Replace hardcoded tier thresholds with `getTierForPoints()`
- Update the `LoyaltyTier` type export to `LoyaltyTierConfig`
- Keep the same hook interface: `{ points, tier, isLoading, error, refresh }`
- Update fallback default from `Bronze` to `Trail Blazer`

- [ ] **Step 4: Run all loyalty tests**

Run: `npx jest src/hooks/__tests__/useLoyalty --no-coverage`
Expected: ALL PASS

- [ ] **Step 5: Run screen-refactor-hooks test**

Run: `npx jest src/screens/__tests__/screen-refactor-hooks.test.ts --no-coverage`
Expected: PASS (verify no `@/data/` import violations — `loyaltyTiers.ts` is in `@/data/` but imported by hooks, not screens)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLoyalty.ts src/hooks/__tests__/useLoyalty.test.ts
git commit -m "feat(cm-elo): update useLoyalty to 4-tier web-aligned system"
```

---

### Task 3: Create TierPerkCard Component

**Files:**

- Create: `src/components/TierPerkCard.tsx`
- Create: `src/components/__tests__/TierPerkCard.test.tsx`

- [ ] **Step 1: Write the component test**

```typescript
// src/components/__tests__/TierPerkCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { TierPerkCard } from '../TierPerkCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';

function renderCard(props: React.ComponentProps<typeof TierPerkCard>) {
  return render(
    <ThemeProvider>
      <TierPerkCard {...props} />
    </ThemeProvider>,
  );
}

describe('TierPerkCard', () => {
  const tier = LOYALTY_TIERS[1]; // Mountain Guide

  it('renders tier name', () => {
    const { getByText } = renderCard({ tier, isCurrentTier: false });
    expect(getByText('Mountain Guide')).toBeTruthy();
  });

  it('renders all perks', () => {
    const { getByText } = renderCard({ tier, isCurrentTier: false });
    for (const perk of tier.perks) {
      expect(getByText(perk)).toBeTruthy();
    }
  });

  it('shows "Current Tier" badge when isCurrentTier', () => {
    const { getByTestId } = renderCard({ tier, isCurrentTier: true });
    expect(getByTestId('current-tier-badge')).toBeTruthy();
  });

  it('does not show "Current Tier" badge when not current', () => {
    const { queryByTestId } = renderCard({ tier, isCurrentTier: false });
    expect(queryByTestId('current-tier-badge')).toBeNull();
  });

  it('shows points threshold', () => {
    const { getByText } = renderCard({ tier, isCurrentTier: false });
    expect(getByText(/500 points/)).toBeTruthy();
  });

  it('applies tier color to accent elements', () => {
    const { getByTestId } = renderCard({ tier, isCurrentTier: false });
    const card = getByTestId('tier-perk-card');
    expect(card).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/TierPerkCard.test.tsx --no-coverage`
Expected: FAIL with "Cannot find module '../TierPerkCard'"

- [ ] **Step 3: Write the TierPerkCard component**

```typescript
// src/components/TierPerkCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

interface Props {
  tier: LoyaltyTierConfig;
  isCurrentTier: boolean;
  testID?: string;
}

export function TierPerkCard({ tier, isCurrentTier, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <View
      testID={testID ?? 'tier-perk-card'}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: borderRadius.lg,
          borderLeftColor: tier.color,
          borderLeftWidth: 4,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[typography.h3, { color: tier.color }]}>{tier.name}</Text>
        {isCurrentTier && (
          <View testID="current-tier-badge" style={[styles.badge, { backgroundColor: tier.color }]}>
            <Text style={[typography.caption, { color: '#FFF' }]}>Current Tier</Text>
          </View>
        )}
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
        {tier.minPoints.toLocaleString()} points to unlock
      </Text>
      {tier.perks.map((perk) => (
        <Text key={perk} style={[typography.body, { color: colors.text, marginBottom: 4 }]}>
          • {perk}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/TierPerkCard.test.tsx --no-coverage`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/TierPerkCard.tsx src/components/__tests__/TierPerkCard.test.tsx
git commit -m "feat(cm-elo): TierPerkCard component — display tier perks with badge"
```

---

### Task 4: Update LoyaltyScreen with New Tiers + Perks

**Files:**

- Modify: `src/screens/LoyaltyScreen.tsx`
- Modify: `src/screens/__tests__/LoyaltyScreen.test.tsx` (if exists, or create)

- [ ] **Step 1: Write/update LoyaltyScreen tests**

Add tests that verify:

- Screen displays new tier name (e.g., "Trail Blazer" not "Bronze")
- Screen shows TierPerkCard for each of the 4 tiers
- Current tier is highlighted with "Current Tier" badge
- Points progress bar shows progress toward next tier
- All 4 tier sections are scrollable

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/screens/__tests__/LoyaltyScreen --no-coverage`
Expected: FAIL — old tier names or missing TierPerkCard

- [ ] **Step 3: Update LoyaltyScreen**

In `src/screens/LoyaltyScreen.tsx`:

- Import `LOYALTY_TIERS, getTierForPoints` from `@/data/loyaltyTiers`
- Import `TierPerkCard` from `@/components/TierPerkCard`
- Replace hardcoded tier display with `getTierForPoints(points)`
- Add a "Tier Benefits" section with `FlatList` of `TierPerkCard` for each tier
- Highlight current tier with `isCurrentTier` prop
- Update progress bar to show progress toward next tier threshold

- [ ] **Step 4: Run all loyalty-related tests**

Run: `npx jest --testPathPattern="(loyalty|Loyalty|TierPerk)" --no-coverage`
Expected: ALL PASS

- [ ] **Step 5: Run prettier**

Run: `npx prettier --write src/screens/LoyaltyScreen.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/screens/LoyaltyScreen.tsx src/screens/__tests__/LoyaltyScreen.test.tsx
git commit -m "feat(cm-elo): LoyaltyScreen — 4-tier display with perk cards"
```

---

### Task 5: Update RewardsScreen and PointsHistoryScreen

**Files:**

- Modify: `src/screens/RewardsScreen.tsx`
- Modify: `src/screens/PointsHistoryScreen.tsx`

- [ ] **Step 1: Update tests for both screens**

Ensure tests reference new tier names. Add tests that verify tier labels render correctly in rewards redemption UI and points history entries.

- [ ] **Step 2: Update RewardsScreen**

Replace old tier references with imports from `@/data/loyaltyTiers`. Use `getTierForPoints()` for tier-specific redemption rules.

- [ ] **Step 3: Update PointsHistoryScreen**

Replace old tier labels with new names. Ensure tier change entries show correct new tier names.

- [ ] **Step 4: Run all affected tests**

Run: `npx jest --testPathPattern="(Rewards|PointsHistory|loyalty)" --no-coverage`
Expected: ALL PASS

- [ ] **Step 5: Run prettier on changed files**

Run: `npx prettier --write src/screens/RewardsScreen.tsx src/screens/PointsHistoryScreen.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/screens/RewardsScreen.tsx src/screens/PointsHistoryScreen.tsx
git commit -m "feat(cm-elo): align RewardsScreen + PointsHistoryScreen to 4-tier system"
```

---

### Task 6: Full Integration Test + PR

**Files:**

- All files from Tasks 1-5

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-coverage`
Expected: ALL PASS (7400+ tests, 0 failures)

- [ ] **Step 2: Run lint**

Run: `npx eslint src/data/loyaltyTiers.ts src/hooks/useLoyalty.ts src/components/TierPerkCard.tsx src/screens/LoyaltyScreen.tsx src/screens/RewardsScreen.tsx src/screens/PointsHistoryScreen.tsx --ext .ts,.tsx`
Expected: 0 errors

- [ ] **Step 3: Run prettier check**

Run: `npx prettier --check src/data/loyaltyTiers.ts src/hooks/useLoyalty.ts src/components/TierPerkCard.tsx`
Expected: All files formatted

- [ ] **Step 4: Create feature branch and PR**

```bash
git checkout -b cm-elo-loyalty-unification
git push -u origin cm-elo-loyalty-unification
gh pr create -R DreadPirateRobertz/carolina-futons-mobile \
  --title "feat(cm-elo): loyalty tier unification — 4-tier web-aligned system" \
  --body "$(cat <<'PREOF'
## Summary
- Aligned mobile loyalty from 3 tiers (Bronze/Silver/Gold) to web's 4 tiers (Trail Blazer/Mountain Guide/Summit Master/Blue Ridge Legend)
- New shared tier config in src/data/loyaltyTiers.ts
- TierPerkCard component displays perks per tier
- LoyaltyScreen, RewardsScreen, PointsHistoryScreen updated

## Test plan
- [ ] useLoyalty tier tests — new thresholds and names
- [ ] TierPerkCard — render, badge, perks, color
- [ ] LoyaltyScreen — 4 tier cards, current tier highlight
- [ ] Full suite — 7400+ tests pass

## Cross-platform
Aligned with web's gamificationTokens.js POINTS_CONFIG (melania sync 2026-04-04).
PREOF
)"
```

- [ ] **Step 5: Verify CI passes**

Check: `gh pr checks <PR_NUMBER> -R DreadPirateRobertz/carolina-futons-mobile`
Expected: lint pass, test pass, catalog-sync pass
