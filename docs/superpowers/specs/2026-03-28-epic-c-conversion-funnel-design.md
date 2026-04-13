# Epic C — Conversion Funnel

**Date:** 2026-03-28
**Leads:** burke (checkout a11y/forms), ripley (UI/skeletons)
**Dependencies:** Shared analytics event taxonomy (pre-epic task, bishop). Guest checkout gated on Stilgar Wix setting (cf-2zr3) — cart recovery + promo codes start immediately.
**Bead prefix:** `cm-epicC-*`
**Quality gate:** screen-reference.html updated after epic closes
**Revenue impact:** Highest direct $ per session of the 4 epics

---

## 1. Goal

Remove the top three conversion drop-off points: cart abandonment (no recovery sequence), checkout friction (keyboard/form UX), and missing promo code entry. Guest checkout is specced here but gated on a Stilgar Wix configuration change — the rest of the epic proceeds without it.

Success criteria:

- Cart abandonment recovery push + email fires within 30 min of cart being abandoned (via existing `useCartAbandonmentRecovery` hook)
- Promo code entry visible and functional on CheckoutScreen
- CheckoutScreen shows skeleton form during Stripe/Klarna init (not generic spinner)
- Payment confirmation polling has a 30-second timeout with clear error state
- Checkout form keyboard chain (returnKeyType + KeyboardAvoidingView) works on both iOS and Android
- All form error states announced via `accessibilityLiveRegion="assertive"`
- Guest checkout: spec complete, implementation starts when Stilgar unblocks cf-2zr3

---

## 2. Architecture

```
Cart state (useCart)
    │
    ├── Abandonment detection (useCartAbandonmentRecovery — exists, needs bridge to push)
    │       └── crossRigEventBus.emitCartAbandoned() → Wix → push + email sequence
    │
    └── CheckoutScreen
            ├── PromoCodeInput (new)
            ├── CheckoutFormSkeleton (new — replaces generic spinner)
            ├── StripePaymentSheet / KlarnaPaymentSheet
            │       └── PaymentPoller (new — 30s timeout, retry logic)
            └── GuestCheckoutFlow (new — gated on cf-2zr3)
```

**Analytics event taxonomy (pre-epic — bishop):**
Before Sprint 1 starts, define `analyticsEvents.ts` with typed event constants:

```ts
export const ANALYTICS = {
  CHECKOUT_STARTED: 'checkout_started',
  PROMO_CODE_APPLIED: 'promo_code_applied',
  PROMO_CODE_REJECTED: 'promo_code_rejected',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  CART_ABANDONED: 'cart_abandoned',
  GUEST_CHECKOUT_STARTED: 'guest_checkout_started',
} as const;
```

All Epic C instrumentation uses these constants. No ad-hoc string events.

---

## 3. Components

### 3.1 PromoCodeInput (`src/components/PromoCodeInput.tsx`) — NEW

Inline expandable row at the bottom of the order summary:

- Collapsed: "Add promo code" tappable row with chevron
- Expanded: text input + "Apply" button
- States: idle, loading (applying), success (code + discount shown), error (message shown)
- A11y: `accessibilityLiveRegion="assertive"` on error/success message
- Validation: trim whitespace, uppercase on submit, reject empty

API: `callFunction('/_functions/validatePromoCode', 'POST', { code, cartTotal })`
→ `{ valid: boolean, discount: number, type: 'percent' | 'fixed', error?: string }`

Error cases: expired code, minimum order not met, already used, invalid format.

### 3.2 CheckoutFormSkeleton (`src/components/CheckoutFormSkeleton.tsx`) — NEW

Shown during Stripe/Klarna SDK initialization (~2-3s). Matches the final form layout:

- Name field skeleton
- Card number skeleton
- Expiry + CVV row skeleton
- "Pay now" button skeleton (disabled state)

Replaces the current generic `ActivityIndicator` in `CheckoutScreen`.

### 3.3 PaymentPoller (`src/services/paymentPoller.ts`) — NEW

Wraps Stripe/Klarna confirmation polling with a hard timeout:

```ts
pollPaymentConfirmation(
  paymentIntentId: string,
  options: { timeoutMs: number; intervalMs: number }
): Promise<'success' | 'failed' | 'timeout'>
```

- Default: `timeoutMs: 30000`, `intervalMs: 2000` (15 polls max)
- On timeout: returns `'timeout'`, shows "Payment is taking longer than expected. Check your email for confirmation." — does NOT show failure (payment may still process async)
- On failure: returns `'failed'`, shows Stripe error message
- Sentry alert on timeout (non-fatal, informational)

### 3.4 CheckoutScreen keyboard chain (existing file — rework)

Changes to `CheckoutScreen.tsx`:

- Wrap scroll content in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- `ScrollView` with `keyboardShouldPersistTaps="handled"`
- All TextInput fields: explicit `ref` chain, `returnKeyType="next"` advancing focus, last field `returnKeyType="done"` dismisses keyboard
- Form error messages: `accessibilityLiveRegion="assertive"` so VoiceOver announces immediately
- Progress steps (1/2/3): `accessibilityRole="progressbar"` with `accessibilityValue={{ min: 1, max: 3, now: currentStep }}`

### 3.5 Cart Abandonment Bridge (existing hook — extend)

`useCartAbandonmentRecovery` already exists. Add push notification trigger:

- When cart abandoned flag fires → call `crossRigEventBus.emitCartAbandoned()` (new emitter)
- Wix handles the 30-min delay and sends push + email
- Recovery push deep-links to CartScreen with cart pre-populated

### 3.6 GuestCheckoutFlow (`src/screens/GuestCheckoutScreen.tsx`) — GATED

Spec complete, implementation blocked on Stilgar enabling guest checkout in Wix eCommerce settings (cf-2zr3). When unblocked:

- Pre-checkout modal: "Continue as guest or sign in"
- Guest path: email only, no account created
- Post-purchase: "Save your details" upsell to create account
- Analytics: `GUEST_CHECKOUT_STARTED`, `GUEST_CHECKOUT_COMPLETED`

---

## 4. Error Handling

| Scenario                    | Handling                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Promo code invalid          | Show specific error message from API, keep input visible                             |
| Promo code API unreachable  | "Unable to verify code — try again", do not block checkout                           |
| Stripe SDK init timeout     | Show skeleton for max 5s, then show "Payment unavailable" with retry                 |
| Payment timeout (30s)       | "Taking longer than expected — check your email", do not mark as failed              |
| Cart abandonment emit fails | Queue in AsyncStorage (crossRigEventBus pattern), replay on next session             |
| Keyboard covering fields    | KeyboardAvoidingView handles on iOS; Android uses `adjustResize` windowSoftInputMode |

---

## 5. Testing

- **Unit:** PromoCodeInput (all validation states), PaymentPoller (timeout, success, failure), analyticsEvents constants
- **Integration:** Cart abandonment → crossRigEventBus emit, promo code application → cart total update
- **A11y:** Keyboard chain focus order (both platforms), error announcements, progress bar values
- **Edge cases:** Promo code with leading/trailing spaces, network drop mid-checkout, payment poller exactly at timeout boundary, guest checkout with existing email

---

## 6. Beads

| Bead       | Description                                               | Lead   |
| ---------- | --------------------------------------------------------- | ------ |
| cm-epicC-0 | Shared analytics event taxonomy (pre-epic, unblocks all)  | bishop |
| cm-epicC-1 | PromoCodeInput component + Wix validatePromoCode API      | ripley |
| cm-epicC-2 | CheckoutFormSkeleton (replaces generic spinner)           | ripley |
| cm-epicC-3 | PaymentPoller with 30s timeout                            | hicks  |
| cm-epicC-4 | CheckoutScreen keyboard chain + a11y rework               | burke  |
| cm-epicC-5 | Cart abandonment push bridge                              | hicks  |
| cm-epicC-6 | GuestCheckoutFlow (GATED — starts when cf-2zr3 unblocked) | burke  |
