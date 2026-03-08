# Story Proposals for Melania — Awaiting Mail System Recovery
> From: cfutons_mobile/crew/bishop
> Date: 2026-02-23
> Status: UNSENT (gt mail system down — "no agent found" on all recipients)

---

## 1. Delivery Scheduling & White Glove Options

**WHAT:** Add delivery date/time picker to CheckoutScreen with tiered delivery options.

**Options:**
- Standard (free, 5-7 days)
- Express ($49, 2-3 days)
- White Glove ($99, delivery + assembly)

Show delivery windows by ZIP code. Save delivery preference for repeat customers. Send confirmation with tracking link.

**WHY:** Furniture is large — customers need to plan. White Glove upsell drives revenue. Reduces checkout abandonment.

**EFFORT:** Medium (checkout refactor + new delivery selection component)
**DEPENDS ON:** Existing CheckoutScreen, order data model

---

## 2. Fabric Swatches & Samples Program

**WHAT:** Let customers request free physical fabric samples (3-5 swatches) before buying.

**Features:**
- "Request Swatches" button on product detail and AR screens
- Select up to 5 fabrics from product's available options
- Free samples (or $5 refundable with purchase)
- Track swatch order status in Order History
- Pre-select ordered fabrics in checkout flow

**WHY:** Customers hesitate on $400+ fabric purchases sight-unseen. Swatches reduce returns and increase confidence. Industry standard (Wayfair, Article, etc). Pre-selection psychology drives conversion.

**EFFORT:** Low-Medium (new swatch request flow + data model addition)
**DEPENDS ON:** Product data (fabrics already modeled), existing order tracking

---

## 3. Room Measurement & Fit Helper

**WHAT:** Tool to measure room dimensions and check if a futon fits before buying.

**Features:**
- AR-assisted room measurement using device camera (detect wall dimensions)
- Manual fallback: enter room length/width/ceiling height
- Overlay showing selected futon dimensions vs room layout
- Suggest compatible futon sizes for the space
- Save room measurements for future shopping
- Share measurements (for store visits)

**WHY:** #1 reason for furniture returns is "doesn't fit." Builds on existing AR infrastructure (arSupport, camera permissions). Differentiates from competitors. Especially valuable for apartment/dorm customers.

**EFFORT:** Medium-High (extends existing AR stack)
**DEPENDS ON:** ARScreen, arSupport service (both implemented)

---

## 4. Complete Store Locator with Appointment Booking

**WHAT:** Finish the store locator feature (TDD specs exist) with map view and appointment booking.

**Features:**
- Map view with nearby stores, distance, hours, directions
- Store detail: photos, hours, features (try-before-you-buy, design consultants)
- Book appointments: consultation, room measurement, order pickup
- Date/time picker from available slots
- Calendar integration for confirmation
- In-store inventory check (is this futon in stock at my nearest store?)

**WHY:** Drives foot traffic. In-store consultations increase AOV. Room measurements reduce returns. Data model already exists (stores.ts has 4 NC locations, hours, appointment types). TDD specs ready.

**EFFORT:** Medium (useStoreLocator hook + screens, data model exists)
**DEPENDS ON:** stores.ts data (implemented), StoreDetailScreen (implemented), StoreLocatorScreen (shell exists)

---

## 5. Product Comparison & Advanced Filters

**WHAT:** Advanced filtering and side-by-side product comparison on ShopScreen.

**Features:**
- New filter dimensions: material type, style (modern/rustic/transitional), features (reclines/storage/sleeper), color family, price range slider
- "Compare" checkbox to build side-by-side view (up to 3 products)
- Comparison table: dimensions, fabrics, price, features, review score
- Save filter presets ("My Preferences")
- "Best Match" sort combining preferences

**WHY:** Current filtering is category + sort only. 48 products across 7 categories needs better discovery. Comparison drives higher-value selections. Reduces decision fatigue on expensive purchases.

**EFFORT:** Medium (extends useProducts hook, new ComparisonScreen, filter UI)
**DEPENDS ON:** useProducts (implemented), product data (48 items ready)
