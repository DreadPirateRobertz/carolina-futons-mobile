# Carolina Futons Mobile — Master Hookup Checklist

> Everything the overseer needs to configure and test the app end-to-end.
> Updated 2026-03-07 — Sprint 2 (Beta Launch) progress.

---

## 1. Environment Variables

Create `.env` at project root (git-ignored, never commit):

```bash
EXPO_PUBLIC_WIX_API_KEY=your-api-key
EXPO_PUBLIC_WIX_SITE_ID=your-site-id
EXPO_PUBLIC_WIX_CLIENT_ID=your-oauth-client-id
EXPO_PUBLIC_WIX_BASE_URL=https://www.wixapis.com   # optional, this is the default
```

**Where to get these** → Section 2 below.

---

## 2. Wix Setup (Product Catalog + Auth)

Wix powers: product listings, collections, inventory, user auth (login/register/OAuth), orders.

| Step | Where | Result |
|------|-------|--------|
| Create/select Wix site | wix.com → My Sites | You have a site |
| Generate API key | Dashboard → Settings → API Keys | `EXPO_PUBLIC_WIX_API_KEY` |
| Copy Site ID | Dashboard → Settings → Advanced → Site ID | `EXPO_PUBLIC_WIX_SITE_ID` |
| Create OAuth app | Dashboard → Settings → OAuth Apps → New | `EXPO_PUBLIC_WIX_CLIENT_ID` |
| Set OAuth redirect URI | Same OAuth app settings | `carolinafutons://oauth/wix/callback` |
| Enable Stores API | Dashboard → Settings → APIs & Extensions | Products/collections endpoints work |
| Enable Members API | Same location | Login/register/OAuth works |

**Verify**: With env vars set, `npx expo start` should show products from your Wix store.

---

## 3. 3D Models & AR

AR uses GLB (Android) and USDZ (iOS) files hosted on a CDN.

| Step | Details |
|------|---------|
| Set up CDN | CloudFront, Cloudflare R2, or any HTTPS host |
| Upload models | `/glb/{productId}-{hash}.glb` and `/usdz/{productId}-{hash}.usdz` |
| Update catalog | Edit `shared/catalog-3d.json` → set `cdnBase` to your CDN URL |
| Regenerate | Run `npm run catalog:sync` (writes `src/data/models3d.ts`) |

**Current state**: Catalog has 11 products defined with PoC model (KhronosGroup SheenChair). Replace with real product models when ready.

**Cache**: App caches models locally (200 MB LRU in `${cacheDir}/models3d/`).

---

## 4. Deep Linking & Universal Links

**Custom scheme** (works now, no server config needed):
- `carolinafutons://product/{slug}`, `carolinafutons://cart`, etc.

**Universal links** (HTTPS — needs server config for production):

| Platform | File to host | Location |
|----------|-------------|----------|
| iOS | `apple-app-site-association` | `https://carolinafutons.com/.well-known/apple-app-site-association` |
| Android | `assetlinks.json` | `https://carolinafutons.com/.well-known/assetlinks.json` |

**Routes supported**: home, shop, category/{slug}, product/{slug}, cart, checkout, orders, orders/{id}, account, login, signup, wishlist, ar, notifications, stores, stores/{id}, reset-password, collections, collections/{slug}, forgot-password

**OAuth callback**: `carolinafutons://oauth/wix/callback` (must match Wix OAuth app config)

---

## 5. Push Notifications

Uses Expo Push Notifications (routes through APNs/FCM automatically).

| Step | Details |
|------|---------|
| Backend integration | Send pushes via `https://exp.host/--/api/v2/push/send` |
| Token registration | App registers push token on login; backend stores it |
| No extra service needed | Expo handles APNs/FCM routing |

**Notification types**: order_update, promotion, back_in_stock, cart_reminder — each deep-links to the relevant screen.

**Direct payload routing** (cm-pdg): Notifications can also use direct payload keys instead of type-based routing:
- `product_id` → ProductDetailScreen
- `order_id` → OrderDetailScreen
- `collection_slug` → CollectionDetailScreen
- `promo` → HomeScreen with promo param

---

## 6. Analytics

Firebase + Mixpanel analytics providers are wired and active. 48+ event types instrumented (screen views, commerce, AR, deep links).

To configure: set `EXPO_PUBLIC_MIXPANEL_TOKEN` in `.env`. Firebase is enabled by default via `@react-native-firebase/analytics`.

---

## 7. Build & Deploy (EAS)

| Step | Command / Action |
|------|-----------------|
| Create Expo account | https://expo.dev |
| Login | `npx eas login` |
| Dev build (Android APK) | `npx eas build --profile development --platform android` |
| Dev build (iOS) | `npx eas build --profile development --platform ios` |
| Production build | `npx eas build --profile production --platform all` |
| Submit to stores | `npx eas submit --platform ios` / `--platform android` |

**Signing**:
- iOS: Provisioning profiles + certificates (EAS can manage these)
- Android: Keystore file (EAS generates or you provide)

**CI secrets** (GitHub Actions): Store `EXPO_PUBLIC_WIX_*` vars and `EXPO_TOKEN` in repo secrets.

---

## APK Testing Artifacts (for overseer testing)

Latest preview builds — install directly on Android device or emulator:

| Build | Date | Artifact URL | Notes |
|-------|------|-------------|-------|
| Android Preview (v0.2.x, post-session-16) | 2026-03-16 | https://expo.dev/artifacts/eas/dF3a4xX84P9Z8wwrFRSHda.apk | Last stable pre-Klarna/saved-addresses |

**Rebuild protocol** — trigger after each sprint/epic close:
```bash
npx eas build --profile preview --platform android
```
Then update the table above with the new artifact URL from `expo.dev/accounts/carolinafutons/projects/carolina-futons/builds`.

**Pending rebuild** (session 22, 2026-03-22 — wait for EAS quota reset 2026-04-01):
Next APK will contain all of the above plus:
- CollectionsScreen error state + skeleton loader (cm-thv)
- RoomGalleryScreen expo-image + blurhash (cm-x6f)
- StyleQuizScreen Wix product thumbnails (cm-49p)
- OrderDetailScreen useRef guard + tracking URL null-check (cm-tsh)
- Gamification: streak badges + PointsToast animation on OrderConfirmation (cm-ihz)
- Loyalty tier badge in CheckoutScreen (cm-ds5)
- SearchScreen 300ms debounce + CMS trending chips (cm-c00 + hq-jc723)
- PDP freight delivery banner + liftgate badge (cm-z9n)
- Shipping estimate on PDP (cm-9yn — in progress)
- WWEX checkout shipping integration (cm-o4i — queued)

**EAS build blocker**: Free plan Android build quota exhausted. Resets 2026-04-01. To build before then, upgrade plan at https://expo.dev/accounts/halworker85/settings/billing or wait for reset.

**Install on Android**:
```bash
adb install <downloaded-apk-file>
```
Or open the artifact URL in the device browser to install directly.

---

## 8. App Identity

Already configured in `app.json`:

| Field | Value |
|-------|-------|
| Name | Carolina Futons |
| Slug | carolina-futons-mobile |
| Version | 1.0.0-beta.1 |
| iOS Bundle ID | com.carolinafutons.mobile |
| Android Package | com.carolinafutons.mobile |
| Scheme | carolinafutons |
| Splash BG | #E8D5B7 (sandBase) |

**Fonts**: Playfair Display (headings), Source Sans 3 (body) — loaded via `@expo-google-fonts`.

---

## 9. CI/CD (GitHub Actions)

Already configured in `.github/workflows/ci.yml`:
- **test**: Node 18 + 20, TypeScript check, Jest with coverage
- **lint**: ESLint on `src/`
- **catalog-sync**: Verifies 3D catalog is in sync

Runs on pushes to `main` and PRs targeting `main`. No deployment step yet.

---

## 10. Development Quick Start

```bash
# 1. Clone & install
git clone <repo-url>
cd carolina-futons-mobile
npm install

# 2. Create .env (see Section 1)
cp .env.example .env   # if example exists, or create manually

# 3. Run
npx expo start          # Dev server (scan QR with Expo Go)
npx expo start --ios    # iOS simulator (needs Xcode)
npx expo start --android # Android emulator (needs Android SDK)
npx expo start --web    # Web browser

# 4. Test
npm test                # Jest (2699+ tests)
npm run lint            # ESLint
npm run typecheck       # TypeScript

# 5. E2E (optional, needs native toolchain)
npm run e2e:prebuild
npm run e2e:build:ios && npm run e2e:test:ios
npm run e2e:build:android && npm run e2e:test:android
```

---

## 11. Visual Identity — Blue Ridge Mountain Aesthetic

The app uses a warm, editorial dark theme inspired by Blue Ridge Mountain watercolor illustrations.

### Design Tokens (`src/theme/tokens.ts`)

All brand colors, typography, spacing come from tokens mirroring `sharedTokens.js` (web):

| Token Group | Key Values |
|-------------|-----------|
| Primary colors | Sand `#E8D5B7`, Espresso `#3A2518`, Mountain Blue `#5B8FA8`, Coral `#E8845C` |
| Dark palette | Background `#1C1410`, Surface `#2A1F19`, Glass `rgba(42,31,25,0.7)` |
| Typography | Playfair Display (headings), Source Sans 3 (body) |
| Shadows | Espresso-tinted (warm brown, NOT gray) |

### Key Visual Components

| Component | File | Description |
|-----------|------|-------------|
| `MountainSkyline` | `src/components/MountainSkyline.tsx` | SVG mountain silhouette with sky gradient. Variants: `sunrise` (blue-gold), `sunset` (coral-gold). Used as hero backdrop and section dividers. |
| `GlassCard` | `src/components/GlassCard.tsx` | Glassmorphism card with dark espresso tint. Intensity: `light`, `medium`, `heavy`. |
| `EmptyState` | `src/components/EmptyState.tsx` | Empty state display with icon/illustration + action button. |

### Screen Aesthetic Checklist

When testing, verify each screen matches the Blue Ridge editorial feel:

| Screen | Expected Treatment | Last Updated |
|--------|--------------------|-------------|
| Home | Mountain skyline hero backdrop + GlassCard CTAs + mountain divider | — |
| Shop | Dark editorial background, sand product cards, category pills | — |
| Search | Search input with 300ms debounce + CMS trending chips (Wix) + results grid | 2026-03-22 cm-c00 + hq-jc723 |
| Product Detail | Dark surfaces, editorial typography, warm shadows. Freight delivery banner (🚛) when requiresFreight=true with optional liftgate badge | 2026-03-22 cm-z9n |
| Cart (empty) | Dark background, illustrated empty state (Blue Ridge SVG) | — |
| Cart (items) | Dark editorial, product thumbnails, coral CTA | — |
| Checkout | KeyboardAwareScrollView, saved address picker chips, address pre-fill. Loyalty tier banner near order summary when cart has items (hides on loading/error) | 2026-03-22 cm-ds5 |
| Account | Dark editorial, Playfair Display heading, coral Sign In, saved addresses, privacy section (data export + account deletion) | — |
| Onboarding | Brand story slides + style quiz (dark editorial treatment). Quiz result shows Wix-fetched product thumbnails (expo-image) | 2026-03-22 cm-49p |
| Login/SignUp | Dark editorial with GlassCard form container, KeyboardAwareScrollView | — |
| OrderDetail | Order tracking with status timeline. Tracking number shows as tappable link only when URL present; plain text otherwise. recordDelivery fires exactly once | 2026-03-22 cm-tsh |
| Collections | Collection grid with error state card + retry button + skeleton loader during fetch | 2026-03-22 cm-thv |
| RoomGallery | Room photos with expo-image memory-disk cache + blurhash blur-in placeholder | 2026-03-22 cm-x6f |
| OrderConfirmation | "+N points earned" toast animation on purchase. Streak badge display. Tier progress bar | 2026-03-22 cm-ihz |
| NotificationPreferences | Per-category toggle switches | — |
| ForceUpdateModal | Required/recommended variants with store link | — |

### Sandbox Testing Protocol

```bash
# Web
npx expo start --web

# iOS Simulator (needs Xcode)
npx expo start --ios

# Android Emulator (needs Android SDK)
npx expo start --android

# Run full test suite
npm test
```

**Visual checks per platform:**
- [ ] Mountain skyline SVG renders with correct gradient (no gray fallback)
- [ ] Fonts load (Playfair Display headings, Source Sans 3 body)
- [ ] GlassCard opacity looks correct (semi-transparent dark, not solid)
- [ ] Dark palette backgrounds are warm espresso (#1C1410), not pure black
- [ ] Coral CTAs are `#E8845C` (not green, not red)
- [ ] Shadows use warm espresso tint (check card shadows)
- [ ] Empty states show Blue Ridge illustrations (not just emoji)
- [ ] No layout clipping on different screen sizes

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-svg` | ^15.15.3 | SVG rendering for MountainSkyline + illustrations |

---

## Quick Status Check

| Component | Status | What's Needed |
|-----------|--------|---------------|
| Wix integration | **Live** | API keys in `.env` |
| Auth (login/register/OAuth) | **Live** | Wix OAuth app configured |
| Product catalog + collections | **Live** | Wix Stores API enabled |
| AR / 3D models | **Live** | CDN hosting + real models |
| AR measurement tool | **Live** | Nothing |
| AR comparison mode | **Live** | Nothing |
| AR multi-product staging | **Live** (up to 5) | Nothing |
| Model download progress | **Live** | Nothing |
| Deep linking (custom scheme) | **Live** | Nothing |
| Universal links (HTTPS) | **Configured** | Server-side AASA/assetlinks hosting |
| Push notifications | **Live** | Backend token storage endpoint |
| Push notification deep links | **Live** | product_id, order_id, collection_slug, promo payload routing |
| Push token refresh | **Live** | Nothing |
| Analytics (Firebase + Mixpanel) | **Live** | Mixpanel token in `.env` |
| Sentry crash reporting | **Live** | Real DSN in `.env` |
| Offline queue + SWR caching | **Live** | Nothing |
| CI/CD (GitHub Actions) | **Running** | Billing limit currently blocking PRs |
| EAS Build pipeline | **Configured** | `eas build` ready (dev/preview/production) |
| OTA Updates | **Configured** | `runtimeVersion` appVersion policy |
| CF+ Premium features | **Live** | AR unlock, free shipping, early access gates |
| BrandedSpinner | **Live** | Replaces all ActivityIndicator usage |
| AnimatedPressable | **Live** | Haptic feedback + spring animation |
| MountainSkyline SVG | **Live** | Renders on Home hero + divider |
| Dark editorial theme | **Live** | All 23 screens |
| GlassCard components | **Live** | Home CTAs, form containers |
| KeyboardAwareScrollView | **Live** | Auto-scroll to focused field on forms |
| Saved address book | **Live** | Max 5 addresses, default selection, checkout pre-fill |
| Force update check | **Live** | Semver comparison, AppState foreground re-check |
| Account deletion (GDPR/CCPA) | **Live** | Wix member deletion + local data wipe |
| Data export (GDPR/CCPA) | **Live** | JSON export via share sheet (native) / Share API (web) |
| Test suite | **2931 tests passing** | 189 suites |
