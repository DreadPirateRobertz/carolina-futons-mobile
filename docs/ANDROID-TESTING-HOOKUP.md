# Carolina Futons Mobile — Android Phone Testing Guide

> **For the Overseer.** Complete walkthrough of every feature and screen in the app,
> what they should look like, and how to test on your Android phone.
>
> Updated 2026-03-04 — Sprint: Illustration System + Sandbox + Uniqueness

---

## Quick Start: Get the App on Your Phone

### Option A: Expo Go (Fastest — no build needed)

```bash
# On your Mac, in the project directory:
npx expo start

# Then scan the QR code with your Android phone's camera
# (or open Expo Go app and scan from there)
```

**Limitations with Expo Go:** AR camera, push notifications, and Stripe payments
require a dev build (Option B). Everything else works.

### Option B: Dev Build via EAS (Full features)

```bash
# First time only:
npx eas login
npx eas build --profile development --platform android

# Download the .apk from the EAS dashboard URL and install on your phone
# Then start the dev server:
npx expo start --dev-client
```

### Option C: Local Dev Build (If you have Android SDK)

```bash
npx expo run:android --device
# This builds and installs directly to your connected phone via USB
```

### Environment Setup

Create `.env` at project root (if not already there):

```bash
EXPO_PUBLIC_WIX_API_KEY=your-api-key
EXPO_PUBLIC_WIX_SITE_ID=your-site-id
EXPO_PUBLIC_WIX_CLIENT_ID=your-oauth-client-id
```

Without these, the app runs with mock data — products, orders, and auth are simulated.

---

## App Overview

**Carolina Futons** is a premium furniture shopping app with AR room visualization,
inspired by the Blue Ridge Mountains of North Carolina. The design language is
warm, editorial, and organic — watercolor mountain illustrations, espresso-dark
backgrounds, hand-crafted typography.

**Navigation:** Bottom tab bar with 4 tabs: Home, Shop, Cart, Account.
Stack screens push on top for detail views.

---

## Screen-by-Screen Testing Guide

### 1. Onboarding (First Launch Only)

**When you see it:** First time opening the app (or after clearing app data).

**What it should look like:**
- Dark background (`#1C1410` warm espresso, NOT pure black)
- MountainSkyline SVG at top — `sunrise` variant with blue-to-gold gradient sky
- 3 brand story slides you swipe through:
  - Slide 1: Brand introduction
  - Slide 2: Craftsmanship story
  - Slide 3: AR experience preview
- Progress bar at bottom
- Then 3 quiz questions in GlassCard containers:
  - Room type (living room, bedroom, office, studio)
  - Style preference (modern, traditional, transitional, minimalist)
  - Primary use (everyday seating, sleeping, guest room, kids room)
- Completion screen with "Get Started" coral CTA button

**What to check:**
- [ ] MountainSkyline renders with gradient (not a gray box)
- [ ] Playfair Display font on headings (serif, elegant)
- [ ] Source Sans 3 font on body text (clean sans-serif)
- [ ] GlassCard quiz options have semi-transparent dark background with subtle border
- [ ] Selected quiz option shows highlighted state (coral border or fill)
- [ ] Progress bar updates as you advance
- [ ] Swiping works smoothly between slides
- [ ] "Get Started" button is coral (`#E8845C`)
- [ ] Tapping "Get Started" takes you to Home tab

**To re-test:** Clear app data or delete/reinstall the app.

---

### 2. Home Screen (Tab 1)

**What it should look like:**
- Full-width MountainSkyline hero at top — `sunrise` variant
  - Blue sky gradient fading to gold at horizon
  - Mountain silhouette layers (currently 2, upgrading to 7)
  - If `showGlow` is on: radial sunrise glow at horizon
- Below hero: 2 GlassCard CTAs side by side:
  - **"View in AR"** — launches AR screen
  - **"Shop Collection"** — navigates to Shop tab
- Mountain divider (smaller `sunset` variant MountainSkyline)
- Brand content sections below

**What to check:**
- [ ] Mountain SVG renders smoothly (no jagged edges, no gray fallback)
- [ ] Sky gradient has correct colors: blue top (`#B8D4E3`) fading to gold (`#F0C87A`)
- [ ] GlassCards have glassmorphism effect (semi-transparent with blur hint)
- [ ] GlassCard text is legible (off-white text on dark glass)
- [ ] Warm espresso background, NOT pure black
- [ ] Coral accent colors on CTAs (`#E8845C`)
- [ ] Fonts loaded: Playfair Display headings, Source Sans 3 body
- [ ] Tapping "View in AR" opens AR screen (or error if no dev build)
- [ ] Tapping "Shop Collection" switches to Shop tab
- [ ] Scrolling is smooth

---

### 3. Shop Screen (Tab 2)

**What it should look like:**
- Dark background (`#1C1410`)
- SearchBar at top with placeholder text
- CategoryFilter chips below search (horizontal scroll): Futons, Mattresses, Covers, Accessories
- SortPicker (dropdown): Popularity, Price Low-High, Price High-Low, Newest, Rating
- Product grid (2 columns) with ProductCard items:
  - Product image
  - Product name (Playfair Display)
  - Price (coral or sand text)
  - Wishlist heart button (top-right of card)
- Sand-colored (`#E8D5B7`) product cards on dark background

**What to check:**
- [ ] Search works: type a product name, results filter
- [ ] Category chips filter products when tapped
- [ ] Sort picker changes product order
- [ ] Product cards have warm espresso shadow (not gray)
- [ ] Wishlist heart toggles (outline → filled) on tap
- [ ] Tapping a product card opens ProductDetail screen
- [ ] Empty search shows empty state with illustration

**Empty state (no results):**
- [ ] Shows Blue Ridge SVG illustration (mountain scene)
- [ ] "No products found" message
- [ ] Suggest clearing filters

---

### 4. Product Detail Screen

**How to get here:** Tap any product from Shop.

**What it should look like:**
- Dark surface background (`#2A1F19`)
- Product image gallery (swipeable if multiple images)
- Product name in Playfair Display (large)
- Price in coral or price typography
- Star rating + review count
- Description in Source Sans 3
- Fabric selector (colored dots for fabric options)
- Quantity picker (+/- buttons)
- "Add to Cart" button — coral (`#E8845C`), full width
- "View in Room" button — launches AR with this product pre-selected
- Reviews section with ReviewSummary + individual ReviewCards
- RecommendationCarousel at bottom (horizontal scroll of related products)
- WishlistButton (heart icon in header or on image)

**What to check:**
- [ ] Product image loads (or shows placeholder)
- [ ] Fabric dots show correct colors for each option
- [ ] Tapping fabric dot updates selection
- [ ] Quantity +/- works (min 1, max 10)
- [ ] "Add to Cart" adds item with correct fabric/qty
- [ ] Cart badge updates in tab bar after adding
- [ ] "View in Room" opens AR screen with this product
- [ ] Reviews section shows star distribution bar chart
- [ ] Recommendation carousel scrolls horizontally
- [ ] Back button returns to Shop

---

### 5. Cart Screen (Tab 3)

#### Cart with Items

**What it should look like:**
- Dark background (`#1C1410`)
- MountainSkyline header (sunset variant)
- List of cart items, each showing:
  - Product thumbnail
  - Product name + fabric name
  - Fabric color dot
  - Quantity controls (+/-)
  - Line item price
  - Remove button (swipe or X)
- Order summary card:
  - Subtotal
  - Shipping (free over $500)
  - Estimated tax
  - Total (bold)
- BNPL teaser ("As low as $X/mo with Affirm")
- "Proceed to Checkout" coral CTA button

**What to check:**
- [ ] Quantity updates change line prices and total
- [ ] Removing an item updates the list and total
- [ ] Free shipping note shows when subtotal > $500
- [ ] Cart badge in tab bar matches item count
- [ ] "Proceed to Checkout" navigates to Checkout screen

#### Cart Empty State

**What it should look like:**
- Dark background
- Blue Ridge mountain SVG illustration (centered)
- "Your cart is empty" heading
- "Start Shopping" coral CTA button

**What to check:**
- [ ] Illustration renders (not just an emoji icon)
- [ ] "Start Shopping" navigates to Shop tab

---

### 6. Account Screen (Tab 4)

#### Authenticated State

**What it should look like:**
- Dark background (`#1C1410`)
- MountainSkyline (sunrise variant) at top
- User avatar + display name
- Menu items in GlassCard containers:
  - Order History
  - Saved Addresses
  - Payment Methods
  - Notification Preferences
  - Wishlist
  - Store Locator
- "Sign Out" button at bottom

**What to check:**
- [ ] User name displays correctly
- [ ] Each menu item navigates to its screen
- [ ] GlassCards have glassmorphism effect
- [ ] Sign Out clears session and shows guest view

#### Guest State

**What it should look like:**
- Dark background
- MountainSkyline at top
- Heading: "Welcome" or similar in Playfair Display
- Message inviting to sign in
- "Sign In" coral CTA button

**What to check:**
- [ ] "Sign In" navigates to Login screen (modal)

---

### 7. Login Screen

**What it should look like:**
- Dark editorial or warm sand background
- GlassCard form container with:
  - Email input field
  - Password input field
  - "Sign In" coral button
- Social auth buttons: "Continue with Google", "Continue with Apple"
- "Forgot Password?" link
- "Don't have an account? Sign Up" link

**What to check:**
- [ ] Email field accepts text, keyboard shows @
- [ ] Password field masks input
- [ ] Social buttons are styled (not default blue)
- [ ] "Forgot Password" navigates to ForgotPassword screen
- [ ] "Sign Up" navigates to SignUp screen
- [ ] Form validates (shows error on empty submit)

---

### 8. Sign Up Screen

**What it should look like:**
- Similar to Login but with:
  - Name input
  - Email input
  - Password input
  - T&C checkbox
  - "Sign Up" coral button
  - Social auth buttons
  - "Already have an account? Sign In" link

**What to check:**
- [ ] All fields accept input
- [ ] T&C checkbox toggles
- [ ] Validation fires on empty/invalid fields
- [ ] "Sign In" link goes back to Login

---

### 9. Checkout Screen

**What it should look like:**
- Dark editorial background
- Order summary at top (items, subtotal, shipping, total)
- Payment method selection in GlassCard containers:
  - Apple Pay / Google Pay (platform-appropriate)
  - Affirm (BNPL)
  - Klarna (BNPL)
  - Credit/Debit Card
- "Place Order" coral CTA button

**What to check (with Stripe configured):**
- [ ] Payment methods display correctly
- [ ] Google Pay shows (not Apple Pay) on Android
- [ ] Selecting a payment method highlights it
- [ ] Card entry form appears for credit card option
- [ ] "Place Order" processes (or shows meaningful error without API keys)
- [ ] Double-tap prevention (button disables after first tap)

**What to check (without Stripe):**
- [ ] Graceful fallback — shows payment options but explains setup needed

---

### 10. AR Screen

**Requires:** Dev build (not Expo Go). AR uses the camera.

**What it should look like:**
- Full camera view (your room)
- ARProductPicker at bottom (horizontal strip of product thumbnails)
- Once surface detected: PlaneIndicator shows floor/wall markers
- Tap floor to place a futon 3D model
- ARControls overlay:
  - Rotate button (spin model)
  - Scale button (resize)
  - Screenshot button (capture)
- ARFutonOverlay shows the 3D furniture model on the detected surface

**What to check:**
- [ ] Camera permission prompt appears
- [ ] Camera feed is live (not frozen)
- [ ] Surface detection indicators appear on flat surfaces
- [ ] Tapping places a model (using PoC SheenChair model)
- [ ] Rotate/scale controls work
- [ ] Screenshot saves to gallery
- [ ] Back button returns to previous screen
- [ ] Product picker lets you switch between models

**Known limitation:** Currently uses a placeholder 3D model (KhronosGroup SheenChair).
Real Carolina Futons models need CDN hosting.

---

### 11. Wishlist Screen

**How to get here:** Account > Wishlist, or tap heart on any product.

**What it should look like:**
- Dark background
- Product grid (same style as Shop) showing saved items
- Share button (top right)
- "Clear All" option

**Empty state:**
- Mountain SVG illustration
- "No saved items" message
- "Browse Products" CTA

**What to check:**
- [ ] Products you hearted appear here
- [ ] Removing heart removes from wishlist
- [ ] Share generates shareable text
- [ ] Empty state illustration renders

---

### 12. Store Locator Screen

**How to get here:** Account > Store Locator.

**What it should look like:**
- Warm sand background (lighter than other screens)
- SearchBar for location search
- List of store cards (4 NC showroom locations):
  - Store name, address, distance
  - StoreCard with warm styling

**What to check:**
- [ ] All 4 stores display
- [ ] Distance shows (if location permission granted)
- [ ] Tapping a store opens StoreDetail
- [ ] Search filters stores
- [ ] Empty state if search finds nothing

---

### 13. Store Detail Screen

**What it should look like:**
- Store hero photo
- Address, phone, email (tappable)
- Hours table (day-by-day open/close)
- Appointment type picker: Consultation, Measurement, Pickup
- Action buttons: Call, Directions, Email

**What to check:**
- [ ] Phone number opens dialer
- [ ] Email opens mail app
- [ ] Directions opens maps
- [ ] Hours display correctly
- [ ] Appointment types selectable

---

### 14. Order History Screen

**How to get here:** Account > Order History.

**What it should look like:**
- Dark background
- List of order cards:
  - Order thumbnail, order ID
  - Status badge (Processing/Confirmed/Shipped/Delivered) with color coding
  - Order total, date
- Tap to see Order Detail

**Empty state:**
- Mountain illustration
- "No orders yet" message
- "Start Shopping" CTA

---

### 15. Order Detail Screen

**What it should look like:**
- Order header (ID, date, status badge)
- Item list with thumbnails
- Tracking timeline (if shipped)
- Return/help button
- Price breakdown

---

### 16. Notification Preferences Screen

**How to get here:** Account > Notification Preferences.

**What it should look like:**
- Toggle switches for each notification type:
  - Order updates
  - Promotions
  - Back in stock alerts
  - Cart reminders

**What to check:**
- [ ] Toggles work
- [ ] State persists after leaving and returning

---

### 17. Category Screen

**How to get here:** Tap a category chip on Shop, or deep link.

**What it should look like:**
- Same as Shop but filtered to one category
- Category name in header
- SortPicker + product grid
- Back button to Shop

---

## Deep Link Testing

Test these URLs by opening them on your Android phone (paste in Chrome or use `adb`):

```bash
# From your Mac (with phone connected via USB):
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://home"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://shop"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://cart"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://account"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://wishlist"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://ar"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://stores"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://product/asheville-full"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://category/futons"
adb shell am start -a android.intent.action.VIEW -d "carolinafutons://notifications"
```

**What to check:**
- [ ] Each link opens the correct screen
- [ ] Product deep link shows the correct product
- [ ] App launches if not running, navigates if already open

---

## Visual Identity Checklist (All Screens)

These should be true on EVERY screen:

| Check | Expected |
|-------|----------|
| Background color | Warm espresso `#1C1410` (NOT pure `#000000` black) |
| Heading font | Playfair Display (serif, elegant) |
| Body font | Source Sans 3 (clean sans-serif) |
| Primary CTA color | Sunset Coral `#E8845C` |
| Card shadows | Warm brown tint (NOT gray) |
| Text color (primary) | Off-white `#F5F0EB` (NOT pure `#FFFFFF` white) |
| Text color (muted) | Warm muted `#B8A99A` |
| GlassCard effect | Semi-transparent dark with subtle light border |
| Mountain SVGs | Smooth gradients, no gray rectangles |
| Status bar | Light text on dark background |

### Color Reference Card

```
Sand Base:       #E8D5B7  ████  (warm tan — cards, light surfaces)
Sand Light:      #F2E8D5  ████  (cream — highlights)
Espresso:        #3A2518  ████  (dark brown — text, shadows)
Espresso Light:  #5C4033  ████  (mid brown — secondary surfaces)
Mountain Blue:   #5B8FA8  ████  (slate blue — accents, distant mountains)
Sunset Coral:    #E8845C  ████  (warm coral — CTAs, prices)
Dark BG:         #1C1410  ████  (warm dark — screen backgrounds)
Dark Surface:    #2A1F19  ████  (slightly lighter — card surfaces)
```

---

## Incoming Features (Open PRs)

These features are coded but haven't landed on main yet. You may or may not see
them depending on which branch you're testing:

| Feature | PR | What You'll See |
|---------|-----|-----------------|
| **Animation Primitives** | #44 | Spring-press feedback on buttons, shimmer skeleton loaders, parallax scroll headers, staggered list entry animations |
| **Blue Ridge Visual Identity** | #45 | Dark editorial redesign on Home/Shop/Onboarding/ProductDetail/Account/Cart, MountainSkyline hero with sunrise glow |
| **Screen Visual Polish** | #46 | Login/SignUp/ForgotPassword/Checkout/OrderHistory/StoreLocator get dark editorial + glassmorphic forms (172 new tests) |
| **Stripe Payment** | #47 | Real checkout: card entry, Apple/Google Pay, Affirm, Klarna, order confirmation, double-submit guard |
| **Push Notifications** | #48 | Real expo-notifications: permission prompt, foreground badge, tap-to-navigate |
| **Review Photo Upload** | #49 | Photo picker in review form: up to 5 photos, previews with remove, photos in submission |

---

## Sprint Beads (Current Work)

| Bead | Task | Owner | Status |
|------|------|-------|--------|
| `cm-dyg` | Merge queue — land PRs #44-49 | Dallas | In progress |
| `cm-sgi` | Shared illustration utilities | Dallas | Blocked by cm-dyg |
| `cm-6dp` | MountainSkyline 7-layer upgrade | Dallas | Blocked by cm-sgi |
| `cm-0qn` | Empty state illustrations (8 screens) | Bishop | Blocked by cm-sgi |
| `cm-rcy` | Nightly CI/CD workflow | Ripley | Blocked by cm-dyg |
| `cm-3m3` | Sandbox testing (iOS/Android/Web) | Dallas + Bishop | Blocked by illustrations |
| `cm-6kb` | Brand uniqueness pass | Crew | Blocked by sandbox |

---

## Test Flows (Recommended Order)

### Flow 1: First-Time User
1. Fresh install / clear data
2. Onboarding slides (swipe through 3)
3. Style quiz (answer 3 questions)
4. Land on Home
5. Verify MountainSkyline hero renders

### Flow 2: Shopping Journey
1. Home > "Shop Collection"
2. Browse products, use search
3. Filter by category (Futons)
4. Sort by price
5. Tap a product > Product Detail
6. Select fabric, set qty to 2
7. "Add to Cart"
8. Verify cart badge shows "2"
9. Tab to Cart > verify items
10. "Proceed to Checkout"

### Flow 3: AR Experience
1. Home > "View in AR" (needs dev build)
2. Grant camera permission
3. Point at floor, wait for surface detection
4. Tap to place model
5. Rotate and scale
6. Take screenshot
7. Check screenshot in gallery

### Flow 4: Wishlist & Social
1. Shop > heart a few products
2. Go to Wishlist screen
3. Verify all hearted items show
4. Tap Share
5. Remove one item (un-heart)
6. Verify it disappears

### Flow 5: Account & Stores
1. Account tab (guest) > Sign In
2. Sign In with email/password
3. Account tab (auth) > Order History
4. Account > Store Locator
5. Tap a store > Store Detail
6. Tap "Call" or "Directions"
7. Back to Account > Sign Out

### Flow 6: Empty States
1. Cart (remove all items) > empty state with illustration
2. Shop > search for "zzzzz" > empty state
3. Wishlist (remove all) > empty state
4. Order History (new account) > empty state

### Flow 7: Deep Links
1. Use `adb` commands from the Deep Link section
2. Verify each opens the correct screen
3. Test while app is running and while app is closed

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| QR code won't scan | Make sure phone and Mac are on same WiFi network |
| "Network request failed" | Check `.env` vars or confirm mock data mode |
| Fonts look wrong (system font) | Kill and restart the app — fonts load async |
| Gray box instead of mountain | `react-native-svg` may need rebuild: `npx expo start -c` |
| AR won't open (Expo Go) | AR needs a dev build — use Option B or C above |
| Cart count stuck | Pull to refresh or restart app |
| App crashes on launch | Run `npx expo start -c` (clears cache) |
| "Module not found" | Run `npm install` then restart |
| Slow on old phone | Normal for dev mode — production builds are much faster |

---

## Running Tests (Developer Reference)

```bash
# Full test suite
npm test

# Specific screen
npx jest --no-coverage --testPathPattern "HomeScreen"

# Specific component
npx jest --no-coverage --testPathPattern "MountainSkyline"

# With coverage
npx jest --coverage

# Lint
npx eslint src/ --ext .ts,.tsx

# Type check
npx tsc --noEmit
```

**Current stats:** 105 suites, 1961 tests (20 skipped), all passing.
