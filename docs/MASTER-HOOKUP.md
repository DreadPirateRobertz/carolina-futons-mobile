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

**Routes supported**: home, shop, category/{slug}, product/{slug}, cart, checkout, orders, orders/{id}, account, login, signup, wishlist, ar, notifications, stores, reset-password

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

| Screen | Expected Treatment |
|--------|--------------------|
| Home | Mountain skyline hero backdrop + GlassCard CTAs + mountain divider |
| Shop | Dark editorial background, sand product cards, category pills |
| Product Detail | Dark surfaces, editorial typography, warm shadows |
| Cart (empty) | Dark background, illustrated empty state (Blue Ridge SVG) |
| Cart (items) | Dark editorial, product thumbnails, coral CTA |
| Account | Dark editorial, Playfair Display heading, coral Sign In |
| Onboarding | Brand story slides + style quiz (dark editorial treatment) |
| Login/SignUp | Dark editorial with GlassCard form container |

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
| Test suite | **2699 tests passing** | 176 suites |
