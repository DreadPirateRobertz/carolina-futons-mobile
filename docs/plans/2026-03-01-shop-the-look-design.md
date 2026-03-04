# Shop the Look / Editorial Collections

## Overview

Curated lifestyle collections that group products by styled room scenes with editorial storytelling. Users browse editorial looks, see styled room hero images, and can shop all products featured in each look.

## Data Model

`EditorialCollection`: slug, title, subtitle, editorial description, hero image, mood tags, season, featured flag, array of product IDs referencing existing `Product` catalog.

5 initial collections: Mountain Lodge Living, Modern Minimalist, Studio Apartment Essentials, Guest Room Ready, Reading Nook Retreat.

## Navigation

- `Collections` route on root stack (browse all collections)
- `CollectionDetail` route with `{ slug: string }` param
- Deep links: `collections/` and `collections/:slug`
- Home screen CTA carousel linking to collections

## Screens

**CollectionsScreen**: Full-bleed editorial cards in a vertical scroll. Featured collection gets a larger hero tile. Each card shows hero image with dark overlay + title + subtitle.

**CollectionDetailScreen**: Hero image with editorial overlay (title, subtitle, description), followed by product grid using existing `ProductCard` component pattern. "Shop All Items" total price CTA at bottom.

## Components

- `CollectionCard`: Full-bleed image tile with editorial text overlay (extends CategoryCard pattern)
- Reuse `RecommendationCarousel` for cross-collection suggestions
- Reuse `ProductCard` for product grid within collection detail

## Integration

HomeScreen gets a new horizontal collection carousel section between the existing CTA buttons, using the same pattern as RecommendationCarousel but with collection cards.
