# Carolina Futons Website Visual Reference

> Design reference for mobile app alignment with carolinafutons.com
> Captured: 2026-02-28

## Screenshots Captured

| Page | File | Notes |
|------|------|-------|
| Homepage (above fold) | `homepage-above-fold` | Hero banner, February Super Sale promo, nav |
| Homepage (below fold) | `homepage-below-fold` | Product photo grid, lifestyle imagery |
| Category: Wall Huggers | `category-wall-huggers` | 3-col product grid, Flash Sale badges, Out of Stock state |
| Product Detail: Canby (top) | `product-detail-canby-top` | Breadcrumbs, hero image, lavender/pink background |
| Product Detail: Canby (pricing) | `product-detail-canby-pricing` | Price, Afterpay/Affirm, Size/Color dropdowns, Add to Cart, Apple/Google Pay |
| Cart (empty state) | `cart-page` | Empty cart with "Continue Browsing" CTA, pink gradient background |
| Footer | `homepage-footer` | Logo, social icons (Instagram, Facebook), tagline |

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Brand Blue** | `#4A7FB5` (approx) | Logo border, nav links, "Log In" text, section accents |
| **CTA Green** | `#3ECF8E` (approx) | "Add to Cart" buttons — pill-shaped, full-width |
| **Out of Stock Gray** | `#CCCCCC` (approx) | Replaces green CTA when out of stock |
| **Flash Sale Red** | `#E8845C` (coral-red) | "Flash Sale" text badge under price |
| **Product BG Pink** | `#F0D6E0` (lavender/pink) | Product detail page background — gradient pink/lavender |
| **Cart BG Pink** | `#F8B4C8` (soft pink) | Cart page gradient wave background |
| **White** | `#FFFFFF` | Nav bar background, card backgrounds |
| **Showroom Text** | `#4A7FB5` (blue) | Showroom hours, contact info |

### Mapping to Mobile Tokens

| Web Color | Mobile Token | Notes |
|-----------|-------------|-------|
| Brand Blue `#4A7FB5` | `mountainBlue #5B8FA8` | Close match — mobile uses slightly desaturated version |
| CTA Green `#3ECF8E` | `success #4A7C59` | Web is brighter/minty; mobile is deeper forest green |
| Flash Sale Red | `sunsetCoral #E8845C` | Direct match |
| Product BG Pink | `offWhite #FAF7F2` | Web uses pink/lavender; mobile uses warm near-white (deliberate divergence for mobile UX) |
| White | `white #FFFFFF` | Same |

**Note**: The website's pink/lavender backgrounds are distinctive but may feel dated on mobile. The mobile app uses the warmer `offWhite` and `sandLight` palette per melania's design direction.

## Typography

| Element | Web Style | Mobile Mapping |
|---------|-----------|----------------|
| Logo | Custom "Carolina Futons" lockup with dog icon | Same logo asset |
| Nav links | Blue, ~14px, medium weight, uppercase tracking | `navLink` token: 13px, 600 weight, 0.5 letter-spacing |
| Category headings | Blue serif, ~36px (e.g., "Wall Huggers") | `h1` token: 30px Playfair Display |
| Product names | Dark, ~16px, below product image | `body` token: 15px Source Sans 3 |
| Prices | Dark, ~16px, "From $XXX.00" pattern | `price` token: 20px, 700 weight |
| Flash Sale badge | Coral/red, ~13px, below price | `bodySmall` token: 13px, coral color |
| Description text | Dark, ~14px, justified paragraph | `body` token: 15px |
| Dimensions | Monospace-like, ~13px | `bodySmall` token: 13px |

**Key differences**: Web uses a serif font for category headings (similar to Playfair Display). Body text is sans-serif. This matches our mobile approach exactly.

## Component Patterns

### Navigation Bar
- **Web**: Logo (centered), showroom hours (left), Log In + Cart (right), horizontal nav links below
- **Mobile adaptation**: Bottom tab bar with Home, Shop, AR, Cart, Profile tabs

### Product Cards (Category Page)
- **Web layout**: 3-column grid
- **Image**: Circular crop, centered, white background
- **Below image**: Product name (centered), horizontal rule, "From $XXX.00" price, Flash Sale badge text
- **CTA**: Full-width green pill "Add to Cart" button
- **Out of stock**: Gray pill "Out of Stock" replaces green CTA
- **Mobile adaptation**: 2-column grid, rectangular card with rounded corners, image top + info below

### Product Detail Page
- **Hero**: Large product image with lavender/pink gradient background
- **Breadcrumb**: Home / Category / Product (left), Prev | Next nav (right)
- **Image gallery**: Thumbnail strip below hero
- **Info section** (right column):
  - Price: "From $XXX.00"
  - Flash Sale badge
  - Afterpay: "or 4 interest-free payments of $XXX with Afterpay"
  - Affirm: "0% APR or as low as $XX/mo with Affirm"
  - Size dropdown (required)
  - Color dropdown (required)
  - Quantity +/- stepper
  - Green "Add to Cart" button + Wishlist heart icon
  - Apple Pay button (black)
  - Google Pay button (black)
- **Left column**: Description paragraph, Dimensions section (WxDxH format)
- **Mobile adaptation**: Single column — image carousel, then price/options, then description

### Cart Page
- **Empty state**: "My cart" heading, "Cart is empty", "Continue Browsing" link
- **Background**: Pink gradient wave
- **Mobile adaptation**: Keep empty state, use sand/offWhite background instead of pink

### Footer
- **Minimal**: Logo (centered), social icons (Instagram, Facebook), phone/email icons
- **Tagline**: "Where Comfort Meets Design With Your Budget & Style In Mind"
- **No**: link columns, newsletter signup, trust badges
- **Mobile adaptation**: Similar minimal footer, add push notification CTA instead of newsletter

## BNPL / Financing Patterns

| Provider | Format | Example |
|----------|--------|---------|
| **Afterpay** | "or 4 interest-free payments of $XXX.XX with [Afterpay logo] Learn More" | $184.25 for $737 product |
| **Affirm** | "0% APR or as low as $XX/mo with [Affirm logo]. See if you qualify" | $46/mo for $737 product |
| **Apple Pay** | Black button with Apple Pay logo | Below Add to Cart |
| **Google Pay** | Black button with Google Pay logo | Below Apple Pay |

**Mobile implementation notes**:
- Afterpay/Affirm messaging should appear on ProductDetailScreen below price
- Apple Pay / Google Pay via Expo's `expo-apple-authentication` or Stripe integration
- Consider Wix Payments SDK for unified checkout

## Mobile-Relevant UX Patterns to Adopt

1. **"From $XXX.00" pricing**: Products have variants (size/color) so show starting price
2. **Flash Sale badges**: Red text under price, not overlay badge (differs from our current badge overlay approach)
3. **Size + Color required**: Both dropdowns mandatory before Add to Cart
4. **Quantity stepper**: +/- buttons, not text input
5. **Wishlist heart**: Adjacent to Add to Cart button
6. **Breadcrumb nav**: Adapt to mobile header back button + category breadcrumb
7. **Prev/Next product nav**: Swipe gesture on mobile product detail

## Design Tokens to Match

Already aligned in `src/theme/tokens.ts`:
- Spacing: 4px base grid (xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, xxxl:64)
- Border radius: sm:4, md:8, lg:12, xl:16, pill:9999
- Shadows: espresso-tinted (rgba(58,37,24,x)), not generic black
- Typography: Playfair Display headings + Source Sans 3 body
- Transitions: fast:150ms, medium:250ms, slow:400ms

## Gaps Identified (filed separately)

1. ~~Missing `offWhite` token~~ — Fixed in PR #27
2. ~~Hard-coded colors in ViewInRoomButton + HomeScreen~~ — Fixed in PR #27
3. ~~Bestseller badge color mismatch~~ — Fixed in PR #27
4. Web uses pink/lavender backgrounds extensively — mobile deliberately uses sand/offWhite (approved divergence)
5. Web product cards use circular images — mobile uses rectangular with rounded corners (approved divergence)
