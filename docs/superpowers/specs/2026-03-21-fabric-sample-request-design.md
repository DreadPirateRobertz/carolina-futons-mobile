# Fabric Sample Request (cm-6a5) Design

## Problem

Physical swatch requests never reach anyone. `useSwatchRequest.submitRequest()` stores to AsyncStorage only — it never calls the Wix API. Two redundant UI components (`FabricSampleRequest` inline form, `SwatchRequestModal`) exist in `ProductDetailScreen` simultaneously. `FabricSampleRequest` has zero tests and inferior UX (single-line address field, unvalidated). `SwatchRequestModal` has good UX and partial tests but its hook is disconnected from the backend.

## Goal

Wire `useSwatchRequest` to `wixClient.submitFabricSampleRequest()`, remove the redundant `FabricSampleRequest` component, and ensure full test coverage including Wix API success/failure paths and accessibility requirements.

## Architecture

Single flow: `SwatchRequestModal` → `useSwatchRequest` hook → Wix data collection (`FabricSampleRequests`).

```
ProductDetailScreen
  └── "Request Free Swatches" button (testID: request-swatches-button)
        └── SwatchRequestModal (modal, has productName + productId props)
              └── useSwatchRequest(productId, productName, wixClient?)
                    ├── validateFabrics + validateAddress
                    ├── wixClient.submitFabricSampleRequest(...)  ← NEW (skipped if null)
                    ├── AsyncStorage.setItem(rate-limit record)
                    └── analytics.requestSwatches(...)
```

## Files

| File | Change |
|------|--------|
| `src/hooks/useSwatchRequest.ts` | **Modify** — accept `wixClient` param, call Wix API in `submitRequest`, handle Wix failure |
| `src/hooks/__tests__/useSwatchRequest.test.ts` | **Modify** — add Wix API call tests, network error tests, offline tests |
| `src/components/FabricSampleRequest.tsx` | **Delete** — redundant, untested, inferior UX |
| `src/screens/ProductDetailScreen.tsx` | **Modify** — remove `FabricSampleRequest` import/render |
| `src/components/SwatchRequestModal.tsx` | **Modify** — pass `wixClient` to hook, verify a11y: 44pt targets + accessibilityLiveRegion on errors |
| `src/components/__tests__/SwatchRequestModal.test.tsx` | **Modify** — verify Wix error display, a11y attributes |

## Hook Signature Change

```ts
// Before
export function useSwatchRequest(productId: string): SwatchRequestState

// After (wixClient and productName are optional for backward-compat; existing callers without Wix work as before)
export function useSwatchRequest(
  productId: string,
  productName?: string,
  wixClient?: WixClient | null,
): SwatchRequestState
```

All existing tests that call `useSwatchRequest('prod-id')` without additional args continue to pass — they exercise the null/no-Wix path, which writes to AsyncStorage only (same as current behavior).

## Data Flow

### submitRequest (updated)
1. Guard: `if (submittingRef.current) return false`
2. Validate fabrics (≥1 selected)
3. Validate address (all required fields, ZIP regex)
4. If validation fails → set errors, haptic error, return false
5. `setStatus('submitting')`
6. **If `wixClient` is non-null:**
   - Call `await wixClient.submitFabricSampleRequest({customerName, shippingAddress, productName, fabricIds, fabricNames})`
     - `shippingAddress`: `"${line1}${line2 ? ', ' + line2 : ''}, ${city}, ${state} ${zip}"`
     - `fabricIds`: comma-joined fabric IDs
     - `fabricNames`: comma-joined fabric names
     - `productName`: passed-in param (defaults to `''` if omitted)
   - On Wix failure → `setStatus('error')`, do NOT write AsyncStorage (user can retry without being rate-limited), haptic error, `return false`
7. **Write rate-limit record to AsyncStorage** (both Wix success path and null-wixClient path)
8. Fire `analytics.requestSwatches(...)`
9. Haptic success, `setStatus('submitted')`, `setHasRecentRequest(true)`, `return true`

### Null wixClient fallback (offline / no Wix config)
- Skip step 6 entirely
- Continue to steps 7-9: write AsyncStorage, fire analytics, show success
- Behavior is identical to current implementation — no regression for environments without Wix

### Error states
- `status === 'error'` with Wix failure → modal shows error message (`testID="swatch-error-message"`) + Retry button (`testID="swatch-retry-button"`)
- Network offline (wixClient throws network error) → same `status === 'error'` path
- AsyncStorage write failure after Wix success → catch, call `captureException`, do NOT block success state (non-critical)

## Accessibility Requirements (burke specialty, §1.4)

- All `TextInput` fields: `accessibilityLabel` (already present in most, verify all 6 address fields are covered)
- Error `<Text>` elements (e.g. `testID="swatch-error-name"`): add `accessibilityLiveRegion="polite"` directly on the `<Text>` node (not a wrapper View) — screen readers announce when error text appears
- All touchable buttons: minimum `minHeight: 44` and `minWidth: 44` in styles (verify Submit, Cancel, fabric toggles, Retry)
- Submit button: `accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}`
- Success/error state messages: `accessibilityLiveRegion="polite"` on the container `<Text>`

## Wix API Contract

`wixClient.submitFabricSampleRequest(data)` → writes to `FabricSampleRequests` data collection:

```ts
{
  customerName: string;       // address.fullName
  shippingAddress: string;    // formatted single-line
  productName: string;        // from props
  fabricIds: string;          // comma-joined fabric IDs
  fabricNames: string;        // comma-joined fabric names
  status: 'pending';          // set by WixClient
  requestedAt: string;        // ISO timestamp, set by WixClient
}
```

## Error Handling

- Empty catch blocks: NONE. All async operations log or set error state.
- Wix API error: caught in `submitRequest`, sets `status('error')`, message shown in modal.
- AsyncStorage read error (rate-limit check): silently allow request (graceful degradation, already in hook).
- AsyncStorage write error after successful Wix call: log via `captureException`, don't block success state.

## Tests (TDD — write tests first)

### useSwatchRequest additions
- calls `wixClient.submitFabricSampleRequest` with correct payload on valid submission
- does NOT write AsyncStorage when Wix call fails (allows retry)
- sets status to 'error' when Wix throws
- falls back to AsyncStorage-only path when wixClient is null (existing tests cover this)
- formats `shippingAddress` correctly with line2 present
- formats `shippingAddress` correctly without line2 (no trailing comma)
- formats `fabricIds` as comma-joined ID string
- formats `fabricNames` as comma-joined name string
- passes `productName` to Wix payload

### SwatchRequestModal additions
- shows error message (`testID="swatch-error-message"`) when status is 'error'
- shows retry button (`testID="swatch-retry-button"`) when status is 'error'
- pressing retry re-triggers submission and succeeds on second attempt
- error `<Text>` nodes have `accessibilityLiveRegion="polite"`
- submit button has `accessibilityState.busy === true` while submitting
- all touch targets (Submit, Cancel, fabric toggles, Retry) have minHeight/minWidth ≥ 44

## Acceptance Criteria

- Submitting the modal actually writes a record to the Wix `FabricSampleRequests` collection
- Network error shows error state with retry button in modal
- No empty catch blocks anywhere in the flow
- All form fields have `accessibilityLabel`
- Error messages announced via `accessibilityLiveRegion="polite"`
- All buttons ≥ 44pt touch target
- `FabricSampleRequest` component deleted, no remaining references
- All tests pass
