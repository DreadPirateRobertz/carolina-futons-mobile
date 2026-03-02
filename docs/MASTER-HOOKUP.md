# Carolina Futons Mobile — Master Hookup Checklist

> Everything the overseer needs to configure for the app to work end-to-end.
> Generated 2026-03-01 from codebase audit of `main`.

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

## 6. Analytics (Optional)

Framework is in place but currently logs to console in dev mode.

To activate: call `registerProvider()` in `App.tsx` with your Amplitude/Firebase/Mixpanel implementation. 48 event types are already instrumented (screen views, commerce, AR, deep links).

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
| Version | 0.1.0 |
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
npm test                # Jest (1934 tests)
npm run lint            # ESLint
npm run typecheck       # TypeScript

# 5. E2E (optional, needs native toolchain)
npm run e2e:prebuild
npm run e2e:build:ios && npm run e2e:test:ios
npm run e2e:build:android && npm run e2e:test:android
```

---

## Quick Status Check

| Component | Status | What's Needed |
|-----------|--------|---------------|
| Wix integration | Code complete | API keys in `.env` |
| Auth (login/register/OAuth) | Code complete | Wix OAuth app configured |
| Product catalog | Code complete | Wix Stores API enabled |
| AR / 3D models | Code complete | CDN hosting + real models |
| Deep linking (custom scheme) | Working | Nothing |
| Universal links (HTTPS) | Framework ready | Server-side AASA/assetlinks |
| Push notifications | Framework ready | Backend integration |
| Analytics | Framework ready | Provider registration |
| CI/CD | Running | Already configured |
| App Store / Play Store | Not started | EAS build + signing |
