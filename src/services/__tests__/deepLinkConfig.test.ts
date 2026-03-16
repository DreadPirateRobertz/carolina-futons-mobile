/**
 * Deep link configuration validation tests.
 *
 * Ensures that the AASA file, Android intent filters in app.json, and the
 * route resolver in deepLink.ts all cover the same set of link paths.
 * This prevents silent regressions where a new route is added to the resolver
 * but not to the native config files (or vice versa).
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveRoute, type ParsedDeepLink } from '../deepLink';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function loadJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf-8'));
}

/** All top-level paths that the route resolver handles (excluding NotFound fallback). */
const KNOWN_ROUTES = [
  'home',
  'shop',
  'category',
  'product',
  'products',
  'cart',
  'checkout',
  'orders',
  'account',
  'login',
  'signin',
  'signup',
  'wishlist',
  'ar',
  'notifications',
  'stores',
  'forgot-password',
  'collections',
];

function makeLink(p: string): ParsedDeepLink {
  return { path: p, params: {}, utm: null, raw: '' };
}

describe('Deep link config validation', () => {
  describe('route resolver covers all known routes', () => {
    for (const route of KNOWN_ROUTES) {
      it(`resolves /${route} to a known screen (not NotFound)`, () => {
        const resolved = resolveRoute(makeLink(route));
        expect(resolved.screen).not.toBe('NotFound');
      });
    }
  });

  describe('AASA file covers all routable paths', () => {
    const aasa = loadJson('web/.well-known/apple-app-site-association') as {
      applinks: { details: { paths: string[] }[] };
    };
    const aasaPaths = aasa.applinks.details[0].paths;

    // Paths that are only reachable via custom scheme (no web equivalent)
    // or are aliases handled by another path entry
    const AASA_EXCEPTIONS = new Set([
      'home', // root path, not a distinct web URL
      'signin', // alias for /login, covered by /login
      'products', // plural alias, covered by /product/*
    ]);

    for (const route of KNOWN_ROUTES) {
      if (AASA_EXCEPTIONS.has(route)) continue;

      it(`AASA includes path for /${route}`, () => {
        const hasPath = aasaPaths.some(
          (p) => p === `/${route}` || p === `/${route}/*` || p.startsWith(`/${route}`),
        );
        expect(hasPath).toBe(true);
      });
    }
  });

  describe('Android intent filters cover all routable paths', () => {
    const appJson = loadJson('app.json') as {
      expo: {
        android: {
          intentFilters: {
            data: { pathPrefix: string; host: string }[];
          }[];
        };
      };
    };
    const intentData = appJson.expo.android.intentFilters[0].data;
    const androidPrefixes = intentData
      .filter((d) => d.host === 'carolinafutons.com')
      .map((d) => d.pathPrefix);

    // Same exceptions as AASA
    const ANDROID_EXCEPTIONS = new Set([
      'home', // root path
      'signin', // alias for /login
      'products', // covered by /product prefix
    ]);

    for (const route of KNOWN_ROUTES) {
      if (ANDROID_EXCEPTIONS.has(route)) continue;

      it(`Android intent filters include pathPrefix for /${route}`, () => {
        const hasPrefix = androidPrefixes.some(
          (p) => p === `/${route}` || route.startsWith(p.replace('/', '')),
        );
        expect(hasPrefix).toBe(true);
      });
    }
  });

  describe('AASA file structure is valid', () => {
    const aasa = loadJson('web/.well-known/apple-app-site-association') as Record<string, unknown>;

    it('has applinks key', () => {
      expect(aasa).toHaveProperty('applinks');
    });

    it('has empty apps array (required by Apple)', () => {
      expect((aasa.applinks as Record<string, unknown>).apps).toEqual([]);
    });

    it('has at least one detail entry', () => {
      const details = (aasa.applinks as Record<string, unknown>).details as unknown[];
      expect(details.length).toBeGreaterThanOrEqual(1);
    });

    it('detail entry has appID', () => {
      const details = (aasa.applinks as Record<string, unknown>).details as Record<
        string,
        unknown
      >[];
      expect(details[0].appID).toBeDefined();
      expect(typeof details[0].appID).toBe('string');
    });

    it('has webcredentials section', () => {
      expect(aasa).toHaveProperty('webcredentials');
    });
  });

  describe('Android assetlinks.json structure is valid', () => {
    const assetlinks = loadJson('web/.well-known/assetlinks.json') as Record<string, unknown>[];

    it('is a non-empty array', () => {
      expect(Array.isArray(assetlinks)).toBe(true);
      expect(assetlinks.length).toBeGreaterThanOrEqual(1);
    });

    it('has correct relation', () => {
      expect(assetlinks[0].relation).toContain('delegate_permission/common.handle_all_urls');
    });

    it('targets the correct package', () => {
      const target = assetlinks[0].target as Record<string, unknown>;
      expect(target.namespace).toBe('android_app');
      expect(target.package_name).toBe('com.carolinafutons.mobile');
    });

    it('has sha256 fingerprint placeholder', () => {
      const target = assetlinks[0].target as Record<string, unknown>;
      const fingerprints = target.sha256_cert_fingerprints as string[];
      expect(fingerprints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('app.json deep link config', () => {
    const appJson = loadJson('app.json') as Record<string, unknown>;
    const expo = appJson.expo as Record<string, unknown>;

    it('has custom scheme configured', () => {
      expect(expo.scheme).toBe('carolinafutons');
    });

    it('has iOS associatedDomains', () => {
      const ios = expo.ios as Record<string, unknown>;
      const domains = ios.associatedDomains as string[];
      expect(domains).toContain('applinks:carolinafutons.com');
      expect(domains).toContain('applinks:www.carolinafutons.com');
    });

    it('Android intent filters have autoVerify enabled', () => {
      const android = expo.android as Record<string, unknown>;
      const filters = android.intentFilters as Record<string, unknown>[];
      expect(filters[0].autoVerify).toBe(true);
    });

    it('Android intent filters include both bare and www hosts', () => {
      const android = expo.android as Record<string, unknown>;
      const filters = android.intentFilters as Record<string, unknown>[];
      const data = filters[0].data as { host: string }[];
      const hosts = new Set(data.map((d) => d.host));
      expect(hosts.has('carolinafutons.com')).toBe(true);
      expect(hosts.has('www.carolinafutons.com')).toBe(true);
    });
  });
});
