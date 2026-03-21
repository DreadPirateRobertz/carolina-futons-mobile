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
        └── SwatchRequestModal (modal)
              └── useSwatchRequest(productId, wixClient)
                    ├── validateFabrics + validateAddress
                    ├── wixClient.submitFabricSampleRequest(...)  ← NEW
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

## Data Flow

### submitRequest (updated)
1. Guard: `if (submittingRef.current) return false`
2. Validate fabrics (≥1 selected)
3. Validate address (all required fields, ZIP regex)
4. If validation fails → set errors, haptic error, return false
5. `setStatus('submitting')`
6. Call `await wixClient.submitFabricSampleRequest({customerName, shippingAddress, productName, fabricIds, fabricNames})`
   - `shippingAddress`: formatted as `"${line1}${line2 ? ', ' + line2 : ''}, ${city}, ${state} ${zip}"`
   - `fabricIds`: comma-joined IDs
   - `fabricNames`: comma-joined names
7. On Wix success → write rate-limit record to AsyncStorage, fire analytics, haptic success, `setStatus('submitted')`
8. On Wix failure → `setStatus('error')`, do NOT write AsyncStorage (allow retry), haptic error
9. If wixClient unavailable (null) → fall back to AsyncStorage-only path (offline / no Wix config)

### Error states
- `status === 'error'` with Wix failure → modal shows error message + Retry button
- Network offline (wixClient throws) → same `status === 'error'` path
- AsyncStorage write failure → log, don't block submission success (non-critical)

## Accessibility Requirements (burke specialty, §1.4)

- All `TextInput` fields: `accessibilityLabel` (already present in most, verify complete)
- Error field containers: `accessibilityLiveRegion="polite"` so screen readers announce validation errors
- All touchable buttons: minimum `minHeight: 44` and `minWidth: 44` (verify existing styles)
- Submit button: `accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}`
- Success state: `accessibilityLiveRegion="polite"` on confirmation message

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
- does NOT write AsyncStorage when Wix call fails
- sets status to 'error' when Wix throws
- falls back to AsyncStorage-only when wixClient is null
- formats shippingAddress correctly (with and without line2)
- formats fabricIds and fabricNames as comma-joined strings

### SwatchRequestModal additions
- shows error message when status is 'error'
- shows retry button when status is 'error'
- error fields have accessibilityLiveRegion="polite"
- submit button has accessibilityState.busy during submission
- all touch targets meet 44pt minimum

## Acceptance Criteria

- Submitting the modal actually writes a record to the Wix `FabricSampleRequests` collection
- Network error shows error state with retry button in modal
- No empty catch blocks anywhere in the flow
- All form fields have `accessibilityLabel`
- Error messages announced via `accessibilityLiveRegion="polite"`
- All buttons ≥ 44pt touch target
- `FabricSampleRequest` component deleted, no remaining references
- All tests pass
