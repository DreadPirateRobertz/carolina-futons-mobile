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

**Local scoring** (applied to `PRODUCTS` array):
| Match | Points |
|-------|--------|
| Exact category slug match | +3 |
| Color family match (product tags) | +2 |
| Each keyword found in product name/description | +1 |
| Style keyword match in product tags | +1 |

**Result set:** top 6 products with score ≥ 1.
**Fallback:** if score = 0 for all products, return top 3 by `rating` (same-category preferred) and set `matchType: 'fallback'`.

---

## UI Entry Points

### A. SearchScreen — camera icon in SearchBar
- Camera icon button added to right side of `SearchBar` component
- Tap → `expo-image-picker` launches (photo library or camera)
- On selection → results injected into the existing `SearchScreen` product grid
- Visual search state is local to `SearchScreen`; clears when user types in the text field
- Reuses existing `ProductCard` grid — no new screen required

### B. ProductDetailScreen — "Find Similar" button
- Secondary CTA below the primary "Add to Cart" button
- Tap → picker → on results navigate to `VisualSearchResultsScreen`
- Route params: `{ query: VisualSearchQuery; results: Product[] }`
- Results shown with match-reason chip under each card (e.g. "Similar style · Neutral tones")

### Fallback / empty state
Both paths: if 0 results returned (including fallback scoring), show `SearchEmptyState` (existing component) with copy:
> "No similar products found — try a clearer photo showing the furniture."

CTA: "Browse All" → navigates to ShopScreen.

---

## New Files

### Mobile (`cfutons_mobile`)

| File | Purpose |
|------|---------|
| `src/hooks/useVisualSearch.ts` | State machine: `idle → loading → success \| error`. Handles image picker, Wix backend call, local scoring. Returns `{ results, query, status, error, trigger }` |
| `src/screens/VisualSearchResultsScreen.tsx` | "Find Similar" result display with match-reason labels |
| `src/hooks/__tests__/useVisualSearch.test.ts` | Unit tests (see Testing section) |
| `src/screens/__tests__/VisualSearchResultsScreen.test.tsx` | Screen tests (see Testing section) |

### Modified existing files

| File | Change |
|------|--------|
| `src/components/SearchBar.tsx` | Add camera icon button, `onCameraPress` prop |
| `src/screens/SearchScreen.tsx` | Wire `useVisualSearch`, inject results into grid, show visual search badge when active |
| `src/screens/ProductDetailScreen.tsx` | Add "Find Similar" CTA button |
| `src/navigation/AppNavigator.tsx` | Add `VisualSearchResults` route to `RootStackParamList` |

### Wix backend (`cfutons` repo)

| File | Purpose |
|------|---------|
| `src/public/visualSearch.js` | `POST /_functions/visualSearch` handler with SSRF guard + OpenAI call |
| `tests/visualSearch.test.js` | SSRF unit tests + API error handling |

---

## Security

### User upload path (zhora)

1. **EXIF strip:** `expo-image-picker` called with `exif: false`. No EXIF metadata leaves the device.
2. **No photo logging:** The Wix backend function must not write image data to any database, blob storage, or log stream. Image is held in-memory for the duration of the OpenAI API call only.
3. **No photo retention:** Image data is not persisted anywhere after the response is returned.

### Backend egress path (dutch — SECURITY GATE)

All three controls are required in the Wix backend function before implementation ships:

1. **Domain allowlist:** Only requests to `api.openai.com` are permitted. Any other hostname in the constructed URL must return a 400 error.
2. **No redirect-following:** If the AI service returns a 3xx response, the function must reject it (not follow the redirect). This prevents redirect-based SSRF.
3. **Block RFC-1918 / link-local ranges:** Resolve the target hostname and reject requests if the resolved IP falls in: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1/128`, `fc00::/7`.

**Dutch pre-implementation review is a hard gate.** Tag `predator/dutch` with the spec before writing any backend code.

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
  trigger: () => Promise<void>;   // launches image picker
  reset: () => void;
}
```

---

## Testing (TDD — tests written before implementation)

### `useVisualSearch.test.ts`

| Test | Assertion |
|------|-----------|
| idle state on mount | `status === 'idle'`, `results === []` |
| picker cancelled → stays idle | `status === 'idle'` after picker cancellation |
| loading state while awaiting backend | `status === 'loading'` during in-flight request |
| success: results returned | `status === 'success'`, `results.length >= 1` |
| success: fallback when no scored match | `query.matchType === 'fallback'` |
| error: backend 500 | `status === 'error'`, `error` contains message |
| error: network timeout | `status === 'error'` |
| error: wixClient null | `status === 'error'` with guard message |
| reset() clears results | `status === 'idle'`, `results === []` |
| EXIF flag: picker called with exif:false | `ImagePicker.launchImageLibraryAsync` called with `exif: false` |

### `VisualSearchResultsScreen.test.tsx`

| Test | Assertion |
|------|-----------|
| renders loading state | loading indicator visible |
| renders result list | product cards rendered for each result |
| shows match-reason chip | chip text visible under each card |
| empty state shown when results=[] | `SearchEmptyState` rendered |
| "Browse All" CTA navigates to Shop | `navigation.navigate('Shop')` called |
| retry button on error | visible + calls `trigger()` |

### `visualSearch.test.js` (Wix backend — cfutons repo)

| Test | Assertion |
|------|-----------|
| allowlist: non-openai host rejected | returns 400 |
| allowlist: `api.openai.com` permitted | passes through |
| 3xx from OpenAI rejected | returns 502, no redirect followed |
| RFC-1918 target blocked (10.x.x.x) | returns 400 |
| link-local blocked (169.254.x.x) | returns 400 |
| malformed image body → 400 | validation error returned |
| OpenAI returns structured JSON | 200 with `{ category, style, colorFamily, keywords }` |
| OpenAI API error → 502 | error propagated with safe message |

---

## Out of Scope (this bead)

- Visual search history / recently searched images (IDOR risk if added without session-side memberId — defer to future bead)
- Product image embedding / vector similarity (CLIP or similar) — evaluate after measuring accuracy of attribute-matching approach
- Android-specific camera permission flow differences — handled by existing `useCameraPermission` hook
