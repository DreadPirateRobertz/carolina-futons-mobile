# Visual Search — Design Spec

**Bead:** cm-21k
**Date:** 2026-03-21
**Status:** Draft — pending dutch security review
**Security gate:** Tag `predator/dutch` before any implementation begins.

---

## Overview

User snaps or uploads a photo of furniture they like → the app returns visually similar products from the Carolina Futons catalog. Two entry points: camera icon in the SearchScreen search bar, and "Find Similar" button on ProductDetailScreen.

---

## Architecture

```
Mobile App
  └─ expo-image-picker (EXIF stripped)
       └─ useVisualSearch hook
            └─ POST /_functions/visualSearch (Wix backend)
                 ├─ SSRF guard (see Security)
                 └─ OpenAI gpt-4o-mini vision API
                      └─ { category, style, colorFamily, keywords[] }
            └─ local product scoring (PRODUCTS array, in-memory, no network)
            └─ top-N results sorted by score
```

The Wix backend function is the only egress point to external AI services. The API key never appears client-side. This follows the existing `createPaymentIntent` pattern.

---

## AI Matching

**OpenAI prompt:** structured JSON extraction asking for:

```json
{
  "category": "futons | murphy-beds | covers | mattresses | accessories | unknown",
  "style": "modern | rustic | traditional | mid-century | industrial | unknown",
  "colorFamily": "neutral | warm | cool | dark | light | unknown",
  "keywords": ["string", ...]
}
```

**Product schema additions required** (modify `src/data/products.ts` and `Product` interface):

```typescript
// Add to Product interface:
tags?: string[];           // style keywords: "modern", "rustic", "mid-century", etc.
colorFamily?: string;      // "neutral" | "warm" | "cool" | "dark" | "light"
```

Populate `tags` and `colorFamily` on all existing PRODUCTS mock entries before implementing scoring.

**Local scoring** (applied to `PRODUCTS` array, computed client-side after backend returns attributes):
| Match | Points |
|-------|--------|
| Exact category slug match | +3 |
| `colorFamily` field matches OpenAI `colorFamily` | +2 |
| Each OpenAI keyword found in `product.name` or `product.description` | +1 |
| Style keyword found in `product.tags` | +1 |

**`matchType` is computed client-side** by `useVisualSearch` after local scoring — it is NOT returned by the backend. Value is `'scored'` when any product reaches score ≥ 1, `'fallback'` when all products score 0.

**Result set:** top 6 products with score ≥ 1.
**Fallback:** if score = 0 for all products, return top 3 by `rating` (same-category preferred) and set `matchType: 'fallback'`.

---

## UI Entry Points

### A. SearchScreen — camera icon in SearchBar

- Camera icon button added to right side of `SearchBar` component
- Tap → `expo-image-picker` launches (photo library or camera)
- On selection → `SearchScreen` replaces the `useProducts()` grid with visual search results. The `SearchScreen` holds a `visualSearchResults: Product[] | null` state variable; when non-null it renders that array instead of the text-search results from `useProducts()`. A "Visual Search" badge appears above the grid.
- Visual search state clears when the user types in the text field (typing implies switching to text search intent)
- Reuses existing `ProductCard` grid — no new screen required

### B. ProductDetailScreen — "Find Similar" button

- Secondary CTA below the primary "Add to Cart" button
- Tap → picker → on results navigate to `VisualSearchResultsScreen`
- Route params: `{ query: VisualSearchQuery; results: Product[] }`
- Results shown with match-reason chip under each card (e.g. "Similar style · Neutral tones")

### Fallback / empty state

Both paths: if 0 results returned (after fallback scoring), show a `VisualSearchEmptyState` component (new, not the existing `SearchEmptyState` — that component requires `query: string` and category chips which don't apply here) with copy:

> "No similar products found — try a clearer photo showing the furniture."

Single CTA: "Browse All" → `navigation.navigate('Shop')`. No category chips, no trending searches.

---

## New Files

### Mobile (`cfutons_mobile`)

| File                                                       | Purpose                                                                                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useVisualSearch.ts`                             | State machine: `idle → loading → success \| error`. Handles image picker, Wix backend call, local scoring. Returns `{ results, query, status, error, trigger }` |
| `src/screens/VisualSearchResultsScreen.tsx`                | "Find Similar" result display with match-reason labels                                                                                                          |
| `src/components/VisualSearchEmptyState.tsx`                | Empty state for 0-result visual searches (not the text SearchEmptyState — different props)                                                                      |
| `src/hooks/__tests__/useVisualSearch.test.ts`              | Unit tests (see Testing section)                                                                                                                                |
| `src/screens/__tests__/VisualSearchResultsScreen.test.tsx` | Screen tests (see Testing section)                                                                                                                              |
| `src/components/__tests__/VisualSearchEmptyState.test.tsx` | Empty state renders, "Browse All" navigates to Shop                                                                                                             |

### Modified existing files

| File                                  | Change                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/SearchBar.tsx`        | Add camera icon button, `onCameraPress` prop                                           |
| `src/screens/SearchScreen.tsx`        | Wire `useVisualSearch`, inject results into grid, show visual search badge when active |
| `src/screens/ProductDetailScreen.tsx` | Add "Find Similar" CTA button                                                          |
| `src/navigation/AppNavigator.tsx`     | Add `VisualSearchResults` route to `RootStackParamList`                                |

### Wix backend (`cfutons` repo)

| File                         | Purpose                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `src/public/visualSearch.js` | `POST /_functions/visualSearch` handler with SSRF guard + OpenAI call |
| `tests/visualSearch.test.js` | SSRF unit tests + API error handling                                  |

---

## Security

### User upload path (zhora)

1. **EXIF strip:** Both `launchImageLibraryAsync` and `launchCameraAsync` called with `exif: false`. Applies to both picker entry points — neither library picker nor camera launch may transmit EXIF data. No EXIF metadata leaves the device.
2. **No photo logging:** The Wix backend function must not write image data to any database, blob storage, or log stream. Image is held in-memory for the duration of the OpenAI API call only.
3. **No photo retention:** Image data is not persisted anywhere after the response is returned.

### Backend egress path (dutch — SECURITY GATE)

All five controls are required in the Wix backend function before implementation ships:

1. **Domain allowlist:** Only requests to `api.openai.com` are permitted. Any other hostname must return a 400 error.
2. **HTTPS + port 443 only:** Enforce `scheme === 'https'` AND `port === 443` (or absent). Reject anything else with 400 — this prevents `https://api.openai.com:22/` and similar bypass attempts.
3. **No redirect-following:** If the AI service returns a 3xx response, the function must reject it immediately and return 502 — the HTTP client must be configured with `maxRedirects: 0`. This prevents both direct and chained redirect-based SSRF.
4. **Block RFC-1918 / link-local ranges:** After hostname resolves, reject if the resolved IP falls in: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1/128`, `fc00::/7`.
5. **DNS rebinding protection:** Resolve the hostname **exactly once** before making the HTTP request. Use the resolved IP as the TCP connection target (not the hostname — this prevents re-resolution). Keep TLS SNI and the `Host` header set to `api.openai.com` so TLS certificate validation and server-side routing still work. Never allow the HTTP client to re-resolve the hostname after the block check passes — otherwise an attacker can flip DNS (TTL=0) between check and request to bypass the RFC-1918 block.

**Dutch full sign-off received 2026-03-21 (hq-eehh). Implementation is go.**

### Server-side trust (D38 + D16 — mayor directive)

Any cfutons backend function involved in visual search (including `/_functions/visualSearch`) **must NOT accept `role`, `membership`, `is_admin`, or any similar privilege field from the caller.** These fields must be verified exclusively server-side from session context. Never trust client-asserted identity or permission claims, even if they pass schema validation.

### Future personalization / IDOR note

If visual search history or personalization is added (e.g., "recently searched images"), any endpoint touching user-specific state must extract `memberId` from server-side session context — never from client-supplied props, params, or request body. See CF-zamz pattern.

---

## `useVisualSearch` Hook Interface

```typescript
export type VisualSearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface VisualSearchQuery {
  category: string;
  style: string;
  colorFamily: string;
  keywords: string[];
  matchType: 'scored' | 'fallback';
}

export interface UseVisualSearchReturn {
  status: VisualSearchStatus;
  results: Product[];
  query: VisualSearchQuery | null;
  error: string | null;
  trigger: () => Promise<void>; // launches image picker
  reset: () => void;
}
```

---

## Testing (TDD — tests written before implementation)

### `useVisualSearch.test.ts`

| Test                                             | Assertion                                                       |
| ------------------------------------------------ | --------------------------------------------------------------- |
| idle state on mount                              | `status === 'idle'`, `results === []`                           |
| picker cancelled → stays idle                    | `status === 'idle'` after picker cancellation                   |
| loading state while awaiting backend             | `status === 'loading'` during in-flight request                 |
| success: results returned                        | `status === 'success'`, `results.length >= 1`                   |
| success: fallback when no scored match           | `query.matchType === 'fallback'`                                |
| error: backend 500                               | `status === 'error'`, `error` contains message                  |
| error: network timeout                           | `status === 'error'`                                            |
| error: wixClient null                            | `status === 'error'` with guard message                         |
| reset() clears results                           | `status === 'idle'`, `results === []`                           |
| EXIF flag: library picker called with exif:false | `ImagePicker.launchImageLibraryAsync` called with `exif: false` |
| EXIF flag: camera picker called with exif:false  | `ImagePicker.launchCameraAsync` called with `exif: false`       |
| SearchBar receives onCameraPress prop            | prop wired and called when camera icon tapped                   |

### `VisualSearchResultsScreen.test.tsx`

| Test                               | Assertion                              |
| ---------------------------------- | -------------------------------------- |
| renders loading state              | loading indicator visible              |
| renders result list                | product cards rendered for each result |
| shows match-reason chip            | chip text visible under each card      |
| empty state shown when results=[]  | `SearchEmptyState` rendered            |
| "Browse All" CTA navigates to Shop | `navigation.navigate('Shop')` called   |
| retry button on error              | visible + calls `trigger()`            |

### `visualSearch.test.js` (Wix backend — cfutons repo)

| Test                                                                            | Assertion                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| allowlist: non-openai host rejected                                             | returns 400                                                       |
| allowlist: `api.openai.com` permitted                                           | passes through                                                    |
| non-https scheme rejected (`http://api.openai.com`)                             | returns 400                                                       |
| non-443 port rejected (`https://api.openai.com:22`)                             | returns 400                                                       |
| 3xx from OpenAI rejected                                                        | returns 502, no redirect followed                                 |
| RFC-1918 target blocked (10.x.x.x)                                              | returns 400                                                       |
| link-local blocked (169.254.x.x)                                                | returns 400                                                       |
| DNS rebinding: resolved IP used in request, Host header set to `api.openai.com` | single DNS resolution, no re-resolve                              |
| malformed image body → 400                                                      | validation error returned                                         |
| OpenAI returns structured JSON                                                  | 200 with `{ category, style, colorFamily, keywords }`             |
| OpenAI returns malformed JSON                                                   | 502 with safe error message                                       |
| image body exceeds 10MB                                                         | 413 Payload Too Large before forwarding to OpenAI                 |
| OpenAI request timeout (>30s)                                                   | 504 Gateway Timeout returned to client                            |
| OpenAI API error (4xx/5xx)                                                      | 502 error propagated with safe message (no raw API error exposed) |

---

## Out of Scope (this bead)

- Visual search history / recently searched images (IDOR risk if added without session-side memberId — defer to future bead)
- Product image embedding / vector similarity (CLIP or similar) — evaluate after measuring accuracy of attribute-matching approach
- Android-specific camera permission flow differences — handled by existing `useCameraPermission` hook
