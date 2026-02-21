/**
 * Deep link parsing, UTM tracking, and route resolution.
 *
 * Handles:
 * - Custom scheme: carolinafutons://product/asheville-full
 * - Universal links: https://carolinafutons.com/product/asheville-full?utm_source=email
 * - Deferred deep links: store pending link, resolve on first open
 * - UTM parameter extraction for attribution
 * - Graceful fallback for invalid/expired links
 */

export interface ParsedDeepLink {
  path: string;
  params: Record<string, string>;
  utm: UTMParams | null;
  raw: string;
}

export interface UTMParams {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
}

export type DeepLinkRoute =
  | { screen: 'Home' }
  | { screen: 'Shop' }
  | { screen: 'Category'; params: { slug: string } }
  | { screen: 'ProductDetail'; params: { slug: string } }
  | { screen: 'Cart' }
  | { screen: 'Checkout' }
  | { screen: 'OrderHistory' }
  | { screen: 'OrderDetail'; params: { orderId: string } }
  | { screen: 'Account' }
  | { screen: 'Login' }
  | { screen: 'NotFound'; params: { path: string } };

/** Parse a deep link URL into components */
export function parseDeepLink(url: string): ParsedDeepLink {
  const raw = url;

  // Normalize: strip scheme prefix
  let normalized = url
    .replace(/^carolinafutons:\/\//, '')
    .replace(/^https?:\/\/(www\.)?carolinafutons\.com\//, '');

  // Split path and query
  const [pathPart, queryPart] = normalized.split('?');
  const path = pathPart.replace(/^\/+|\/+$/g, '') || 'home';

  // Parse query params
  const params: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [key, val] = pair.split('=');
      if (key && val) {
        params[decodeURIComponent(key)] = decodeURIComponent(val);
      }
    }
  }

  // Extract UTM params
  const utm = extractUTM(params);

  return { path, params, utm, raw };
}

/** Extract UTM parameters from query params */
export function extractUTM(params: Record<string, string>): UTMParams | null {
  const source = params.utm_source ?? null;
  const medium = params.utm_medium ?? null;
  const campaign = params.utm_campaign ?? null;
  const content = params.utm_content ?? null;
  const term = params.utm_term ?? null;

  if (!source && !medium && !campaign) return null;

  return { source, medium, campaign, content, term };
}

/** Resolve a parsed deep link to a navigation route */
export function resolveRoute(parsed: ParsedDeepLink): DeepLinkRoute {
  const segments = parsed.path.split('/').filter(Boolean);
  const first = segments[0];
  const second = segments[1];

  switch (first) {
    case 'home':
    case '':
    case undefined:
      return { screen: 'Home' };

    case 'shop':
      return { screen: 'Shop' };

    case 'category':
      if (second) return { screen: 'Category', params: { slug: second } };
      return { screen: 'Shop' };

    case 'product':
      if (second) return { screen: 'ProductDetail', params: { slug: second } };
      return { screen: 'Shop' };

    case 'cart':
      return { screen: 'Cart' };

    case 'checkout':
      return { screen: 'Checkout' };

    case 'orders':
      if (second) return { screen: 'OrderDetail', params: { orderId: second } };
      return { screen: 'OrderHistory' };

    case 'account':
      return { screen: 'Account' };

    case 'login':
    case 'signin':
      return { screen: 'Login' };

    default:
      return { screen: 'NotFound', params: { path: parsed.path } };
  }
}

/** Build a shareable deep link URL for a product */
export function buildProductShareUrl(slug: string): string {
  return `https://carolinafutons.com/product/${slug}`;
}

/** Build a shareable deep link URL for a category */
export function buildCategoryShareUrl(slug: string): string {
  return `https://carolinafutons.com/category/${slug}`;
}

/** Build a shareable deep link with UTM params */
export function buildShareUrlWithUTM(baseUrl: string, utm: Partial<UTMParams>): string {
  const params = new URLSearchParams();
  if (utm.source) params.set('utm_source', utm.source);
  if (utm.medium) params.set('utm_medium', utm.medium);
  if (utm.campaign) params.set('utm_campaign', utm.campaign);
  if (utm.content) params.set('utm_content', utm.content);
  if (utm.term) params.set('utm_term', utm.term);
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

/**
 * Deferred deep link storage.
 * When app isn't installed, user goes to App Store → installs → first open.
 * Store the pending link and resolve it on first app launch.
 */
let pendingDeepLink: string | null = null;

export function storePendingDeepLink(url: string): void {
  pendingDeepLink = url;
}

export function consumePendingDeepLink(): string | null {
  const link = pendingDeepLink;
  pendingDeepLink = null;
  return link;
}
