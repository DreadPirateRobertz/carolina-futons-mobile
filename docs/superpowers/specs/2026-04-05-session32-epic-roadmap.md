# CFM Session 32 — Epic Roadmap

**Date:** 2026-04-05  
**Author:** Dallas (cfutons_mobile PM)  
**Status:** Approved — implementation planning next  
**Supersedes:** 2026-04-04-cross-platform-feature-plan.md (partially — shipped items archived there)

---

## Current State (as of Session 32)

**Shipped this session:**
- Q&A Phase 2 — answer threading + upvotes (PR #448 merged)
- Review prompt flow — post-purchase push + in-app nudge (PR #446 merged)
- Consultation booking Phase 2 — calendar, confirmation email, cancellation (PR #449 merged)
- Security hardening — cert pinning, session token, async storage audit (PR #452 in CI)

**In CI / pending merge:**
- Style quiz — onboarding preference capture (PR #451)
- Loyalty points display on PDP — earn estimate (PR #450)

**In progress (no PR yet):**
- Account profile screen — ripley (cm-am6)
- Price drop alerts — nux (cm-efi)

---

## Epic Structure

Five epics, each owned by one primary crew member. Work flows sequentially within each epic and in parallel across epics.

---

### Epic 1 — Commerce (hicks)

Goal: Complete the purchase funnel with web parity on promotions and pricing.

| Bead | Feature | Status | Web parity |
|------|---------|--------|-----------|
| cm-2qq | Loyalty earn display on PDP — "Earn 120 pts" badge | In progress | Yes |
| cm-efi | Price drop alerts — subscribe on PDP, push on drop | In progress (nux) | Yes |
| new | Bundle deal improvements — related-products suggestions on cart | Backlog | Yes |
| new | Financing deep-link — tap Affirm estimate → full calculator | Backlog | Partial |

**Wix collections:** `LoyaltyPoints`, `PriceAlerts`, `BundleDeals`  
**Key constraint:** Price drop alerts require background fetch + Expo Notifications scheduling.

---

### Epic 2 — Account & Profile (ripley)

Goal: Full authenticated user profile with web-parity preferences and history.

| Bead | Feature | Status | Web parity |
|------|---------|--------|-----------|
| cm-am6 | Account profile screen — name, email, address, Wix member sync | In progress | Yes |
| new | Saved addresses — add/edit/delete delivery addresses | Backlog | Yes |
| new | Order history improvements — filter by status, reorder CTA | Backlog | Yes |
| new | Purchase history export — email receipt list | Backlog | Partial |

**Wix collections:** `Members`, `MemberAddresses`, `Orders`  
**Key constraint:** Wix Members API requires auth token. Ripley must wire `useAuth` properly.

---

### Epic 3 — Social & UGC (bishop, after cm-keo)

Goal: Build community content layer — video reviews, NPS feedback, room gallery improvements.

| Bead | Feature | Status | Web parity |
|------|---------|--------|-----------|
| cm-keo | Security hardening — cert pinning, session audit | In CI (PR #452) | Yes |
| new | Video reviews on PDP — play Wix video URLs, 60s max | Backlog | Yes (web has it) |
| new | NPS survey — post-purchase, 0–10 scale, Wix NPSResponses | Backlog | Yes |
| new | Room gallery filters — by style tag, by product | Backlog | Partial |
| new | UGC featured badge — highlight "featured" approved photos | Backlog | Yes |

**Wix collections:** `ProductVideoReviews`, `NPSResponses`, `UGCPhotos`  
**Key constraint:** Video reviews use expo-video. NPS must not re-prompt within 90 days.

---

### Epic 4 — Discovery (burke)

Goal: Help users find the right product faster — style matching, search improvements, AR.

| Bead | Feature | Status | Web parity |
|------|---------|--------|-----------|
| cm-qdm | Style quiz — onboarding preference capture | In CI (PR #451) | No (mobile-unique) |
| new | Visual search improvements — better crop UI, confidence threshold | Backlog | Partial |
| new | "Complete the look" recommendations — complementary products on PDP | Backlog | Yes |
| new | AR session save — capture AR screenshot, share via share sheet | Backlog | No (mobile-unique) |
| new | Search autocomplete — Wix catalog prefix search | Backlog | Yes |

**Wix collections:** `MemberStylePreferences`, `ProductRecommendations`  
**Key constraint:** Style quiz results should influence home screen and search ranking.

---

### Epic 5 — Platform & Security (bishop, then cross-cutting)

Goal: Baseline security, performance, and reliability to support all other epics.

| Bead | Feature | Status | Priority |
|------|---------|--------|---------|
| cm-keo | Security hardening (cert pinning, session audit, secure storage) | In CI | P1 |
| new | Deep link coverage audit — ensure all screens have `carolinafutons://` routes | Backlog | P2 |
| new | JS bundle size budget — set 500KB limit, enforce in CI | Backlog | P2 |
| new | Offline resilience — queue mutations for replay on reconnect | Backlog | P2 |
| new | Error boundary audit — ensure all screens have boundaries | Backlog | P2 |

**Key constraint:** Security bead must merge before any Epic 3/4 work that uses new Wix API calls.

---

## Crew → Epic Assignments

| Crew | Primary Epic | Current Bead |
|------|-------------|--------------|
| hicks | Commerce (E1) | cm-2qq |
| ripley | Account & Profile (E2) | cm-am6 |
| bishop | Security (E5) → Social (E3) | cm-keo |
| burke | Discovery (E4) | cm-qdm |
| nux | Commerce (E1, shared) | cm-efi |

---

## Web Homogeneity Gaps (mobile missing, web has)

High priority:
1. **Video reviews** — web plays Wix video reviews on PDP, mobile shows nothing
2. **NPS survey** — web collects post-purchase NPS, mobile doesn't
3. **Price drop alerts** — web has email alerts, mobile needs push equivalent
4. **Complete the look** — web shows complementary products, mobile doesn't

Lower priority:
- Purchase history export
- Advanced order filtering
- Financing calculator deep-link

---

## Phasing

**Now (Session 32, in flight):** cm-keo, cm-qdm, cm-2qq, cm-am6, cm-efi  
**Next (Session 33):** Video reviews, NPS survey, Complete the look, Saved addresses  
**Later (Session 34+):** AR session save, Bundle deal improvements, Deep link audit, Bundle size budget

---

## Coordination with Web (Melania)

Shared Wix collections requiring schema alignment before mobile implementation:
- `ProductVideoReviews` — confirm field names with melania before video review bead starts
- `NPSResponses` — web already writes here; mobile needs read/write parity
- `PriceAlerts` — new collection, propose schema to melania for approval

Melania must approve any new Wix collection schema before crew implements.
