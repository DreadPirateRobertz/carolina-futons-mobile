import { linkingConfig, SUPPORTED_PATHS } from '../linking';
import { getStateFromPath } from '@react-navigation/native';

/** Helper: resolve a URL path to the deepest screen name using linkingConfig.getStateFromPath for normalization */
function getScreen(path: string): string {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return 'NO_MATCH';
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.name;
}

/** Helper: resolve a URL path to the deepest screen's params */
function getParams(path: string): Record<string, any> | undefined {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return undefined;
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.params as Record<string, any> | undefined;
}

describe('linkingConfig', () => {
  it('has custom scheme prefix', () => {
    expect(linkingConfig.prefixes).toContain('carolinafutons://');
  });

  it('has universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain('https://carolinafutons.com');
  });

  it('has www universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain('https://www.carolinafutons.com');
  });

  const screens = linkingConfig.config!.screens as any;

  it('maps Home screen inside Tabs', () => {
    expect(screens.Tabs.screens.Home).toBe('home');
  });

  it('maps Shop screen inside Tabs', () => {
    expect(screens.Tabs.screens.Shop).toBe('shop');
  });

  it('maps Category screen with slug param', () => {
    expect(screens.Category).toBe('category/:slug');
  });

  it('maps ProductDetail screen with slug param', () => {
    const pd = screens.ProductDetail;
    expect(typeof pd).toBe('object');
    expect((pd as { path: string }).path).toBe('product/:slug');
  });

  it('maps Cart screen inside Tabs', () => {
    expect(screens.Tabs.screens.Cart).toBe('cart');
  });

  it('maps Checkout screen', () => {
    expect(screens.Checkout).toBe('checkout');
  });

  it('maps OrderHistory screen', () => {
    expect(screens.OrderHistory).toBe('orders');
  });

  it('maps OrderDetail screen with orderId param', () => {
    expect(screens.OrderDetail).toBe('orders/:orderId');
  });

  it('maps Account screen inside Tabs', () => {
    expect(screens.Tabs.screens.Account).toBe('account');
  });

  it('maps Login screen', () => {
    expect(screens.Login).toBe('login');
  });

  it('maps SignUp screen', () => {
    expect(screens.SignUp).toBe('signup');
  });

  it('maps NotificationPreferences screen', () => {
    expect(screens.NotificationPreferences).toBe('notifications');
  });

  it('maps AR screen', () => {
    expect(screens.AR).toBe('ar');
  });

  it('maps ForgotPassword screen', () => {
    expect(screens.ForgotPassword).toBe('forgot-password');
  });
});

describe('SUPPORTED_PATHS', () => {
  it('includes home', () => {
    expect(SUPPORTED_PATHS).toContain('home');
  });

  it('includes shop', () => {
    expect(SUPPORTED_PATHS).toContain('shop');
  });

  it('includes cart', () => {
    expect(SUPPORTED_PATHS).toContain('cart');
  });

  it('includes checkout', () => {
    expect(SUPPORTED_PATHS).toContain('checkout');
  });

  it('includes account', () => {
    expect(SUPPORTED_PATHS).toContain('account');
  });

  it('includes login', () => {
    expect(SUPPORTED_PATHS).toContain('login');
  });

  it('includes orders', () => {
    expect(SUPPORTED_PATHS).toContain('orders');
  });

  it('includes notifications', () => {
    expect(SUPPORTED_PATHS).toContain('notifications');
  });

  it('includes ar', () => {
    expect(SUPPORTED_PATHS).toContain('ar');
  });

  it('includes wishlist', () => {
    expect(SUPPORTED_PATHS).toContain('wishlist');
  });

  it('includes stores', () => {
    expect(SUPPORTED_PATHS).toContain('stores');
  });

  it('includes store-locator', () => {
    expect(SUPPORTED_PATHS).toContain('store-locator');
  });

  it('includes forgot-password', () => {
    expect(SUPPORTED_PATHS).toContain('forgot-password');
  });

  it('includes collections', () => {
    expect(SUPPORTED_PATHS).toContain('collections');
  });
});

describe('deep link route resolution (getStateFromPath)', () => {
  describe('product pages', () => {
    it('resolves product/:slug to ProductDetail', () => {
      expect(getScreen('product/asheville-full')).toBe('ProductDetail');
    });

    it('passes slug param to ProductDetail', () => {
      expect(getParams('product/asheville-full')).toEqual({ slug: 'asheville-full' });
    });

    it('handles hyphenated product slugs', () => {
      expect(getParams('product/carolina-classic-queen')).toEqual({
        slug: 'carolina-classic-queen',
      });
    });

    it('resolves /products/:slug (plural) to ProductDetail', () => {
      expect(getScreen('/products/asheville-full')).toBe('ProductDetail');
    });

    it('passes slug param from /products/:slug (plural)', () => {
      expect(getParams('/products/asheville-full')).toEqual({ slug: 'asheville-full' });
    });
  });

  describe('categories', () => {
    it('resolves category/:slug to Category', () => {
      expect(getScreen('category/frames')).toBe('Category');
    });

    it('passes slug param to Category', () => {
      expect(getParams('category/frames')).toEqual({ slug: 'frames' });
    });
  });

  describe('order tracking', () => {
    it('resolves /orders to OrderHistory', () => {
      expect(getScreen('orders')).toBe('OrderHistory');
    });

    it('resolves /orders/:orderId to OrderDetail', () => {
      expect(getScreen('orders/ord-12345')).toBe('OrderDetail');
    });

    it('passes orderId param to OrderDetail', () => {
      expect(getParams('orders/ord-12345')).toEqual({ orderId: 'ord-12345' });
    });
  });

  describe('tab screens', () => {
    it('resolves /home to Home tab', () => {
      expect(getScreen('home')).toBe('Home');
    });

    it('resolves /shop to Shop tab', () => {
      expect(getScreen('shop')).toBe('Shop');
    });

    it('resolves /cart to Cart tab', () => {
      expect(getScreen('cart')).toBe('Cart');
    });

    it('resolves /account to Account tab', () => {
      expect(getScreen('account')).toBe('Account');
    });
  });

  describe('store pages', () => {
    it('resolves /stores to StoreLocator', () => {
      expect(getScreen('stores')).toBe('StoreLocator');
    });

    it('resolves /store-locator to StoreLocator', () => {
      expect(getScreen('store-locator')).toBe('StoreLocator');
    });

    it('resolves /stores/:storeId to StoreDetail', () => {
      expect(getScreen('stores/charlotte')).toBe('StoreDetail');
    });

    it('passes storeId param to StoreDetail', () => {
      expect(getParams('stores/charlotte')).toEqual({ storeId: 'charlotte' });
    });
  });

  describe('other screens', () => {
    it('resolves /checkout', () => {
      expect(getScreen('checkout')).toBe('Checkout');
    });

    it('resolves /login', () => {
      expect(getScreen('login')).toBe('Login');
    });

    it('resolves /signup', () => {
      expect(getScreen('signup')).toBe('SignUp');
    });

    it('resolves /wishlist', () => {
      expect(getScreen('wishlist')).toBe('Wishlist');
    });

    it('resolves /ar', () => {
      expect(getScreen('ar')).toBe('AR');
    });

    it('resolves /notifications', () => {
      expect(getScreen('notifications')).toBe('NotificationPreferences');
    });

    it('resolves /forgot-password', () => {
      expect(getScreen('forgot-password')).toBe('ForgotPassword');
    });

    it('resolves /collections', () => {
      expect(getScreen('collections')).toBe('Collections');
    });

    it('resolves /collections/:slug', () => {
      expect(getScreen('collections/mattresses')).toBe('CollectionDetail');
    });

    it('passes slug param to CollectionDetail', () => {
      expect(getParams('collections/mattresses')).toEqual({ slug: 'mattresses' });
    });

    it('resolves /style-quiz', () => {
      expect(getScreen('style-quiz')).toBe('StyleQuiz');
    });

    it('resolves /achievements to AchievementBadges', () => {
      expect(getScreen('achievements')).toBe('AchievementBadges');
    });

    it('resolves /alerts to Notifications', () => {
      expect(getScreen('alerts')).toBe('Notifications');
    });
  });
});

describe('linkingConfig — AchievementBadges and Notifications', () => {
  const screens = linkingConfig.config!.screens as any;

  it('maps AchievementBadges screen', () => {
    expect(screens.AchievementBadges).toBe('achievements');
  });

  it('maps Notifications screen', () => {
    expect(screens.Notifications).toBe('alerts');
  });
});

describe('SUPPORTED_PATHS — AchievementBadges and Notifications', () => {
  it('includes achievements', () => {
    expect(SUPPORTED_PATHS).toContain('achievements');
  });

  it('includes alerts', () => {
    expect(SUPPORTED_PATHS).toContain('alerts');
  });
});

// --- NEW: gamification deep links ---

describe('linkingConfig — gamification screens', () => {
  const screens = linkingConfig.config!.screens as any;

  it('maps Leaderboard screen', () => {
    expect(screens.Leaderboard).toBe('leaderboard');
  });

  it('maps Challenges screen', () => {
    expect(screens.Challenges).toBe('challenges');
  });

  it('maps AvatarEquip screen', () => {
    expect(screens.AvatarEquip).toBe('avatar');
  });

  it('maps RoomGallery screen', () => {
    expect(screens.RoomGallery).toBe('gallery');
  });
});

describe('deep link route resolution — gamification screens', () => {
  it('resolves /leaderboard to Leaderboard', () => {
    expect(getScreen('leaderboard')).toBe('Leaderboard');
  });

  it('resolves /challenges to Challenges', () => {
    expect(getScreen('challenges')).toBe('Challenges');
  });

  it('resolves /avatar to AvatarEquip', () => {
    expect(getScreen('avatar')).toBe('AvatarEquip');
  });

  it('resolves /gallery to RoomGallery', () => {
    expect(getScreen('gallery')).toBe('RoomGallery');
  });
});

describe('SUPPORTED_PATHS — gamification screens', () => {
  it('includes leaderboard', () => {
    expect(SUPPORTED_PATHS).toContain('leaderboard');
  });

  it('includes challenges', () => {
    expect(SUPPORTED_PATHS).toContain('challenges');
  });

  it('includes avatar', () => {
    expect(SUPPORTED_PATHS).toContain('avatar');
  });

  it('includes gallery', () => {
    expect(SUPPORTED_PATHS).toContain('gallery');
  });
});

// ── hq-qw5: deep link coverage audit — missing screen routes ─────────────

describe('linkingConfig — screens added in hq-qw5 audit', () => {
  const screens = linkingConfig.config!.screens as any;

  it('maps Premium screen', () => {
    expect(screens.Premium).toBe('premium');
  });

  it('maps Search screen', () => {
    expect(screens.Search).toBe('search');
  });

  it('maps Compare screen', () => {
    expect(screens.Compare).toBe('compare');
  });

  it('maps PrivacyPolicy screen', () => {
    expect(screens.PrivacyPolicy).toBe('privacy');
  });

  it('maps Loyalty screen', () => {
    expect(screens.Loyalty).toBe('loyalty');
  });

  it('maps WarrantyRegistration screen', () => {
    expect(screens.WarrantyRegistration).toBe('warranty');
  });

  it('maps SavedAddresses screen', () => {
    expect(screens.SavedAddresses).toBe('account/addresses');
  });

  it('maps ConsultationBooking screen', () => {
    expect(screens.ConsultationBooking).toBe('consultation');
  });

  it('maps BookingCancellation screen', () => {
    expect(screens.BookingCancellation).toBe('consultation/cancel');
  });
});

describe('deep link route resolution — hq-qw5 audit', () => {
  it('resolves /premium to Premium', () => {
    expect(getScreen('premium')).toBe('Premium');
  });

  it('resolves /search to Search', () => {
    expect(getScreen('search')).toBe('Search');
  });

  it('resolves /compare to Compare', () => {
    expect(getScreen('compare')).toBe('Compare');
  });

  it('resolves /privacy to PrivacyPolicy', () => {
    expect(getScreen('privacy')).toBe('PrivacyPolicy');
  });

  it('resolves /loyalty to Loyalty', () => {
    expect(getScreen('loyalty')).toBe('Loyalty');
  });

  it('resolves /warranty to WarrantyRegistration', () => {
    expect(getScreen('warranty')).toBe('WarrantyRegistration');
  });

  it('resolves /account/addresses to SavedAddresses', () => {
    expect(getScreen('account/addresses')).toBe('SavedAddresses');
  });

  it('resolves /consultation to ConsultationBooking', () => {
    expect(getScreen('consultation')).toBe('ConsultationBooking');
  });

  it('resolves /consultation/cancel to BookingCancellation', () => {
    expect(getScreen('consultation/cancel')).toBe('BookingCancellation');
  });

  it('resolves /referral/:code to ReferralLanding', () => {
    expect(getScreen('referral/ABC123')).toBe('ReferralLanding');
  });

  it('passes code param to ReferralLanding', () => {
    expect(getParams('referral/ABC123')).toEqual({ code: 'ABC123' });
  });
});

describe('SUPPORTED_PATHS — hq-qw5 audit', () => {
  it('includes premium', () => {
    expect(SUPPORTED_PATHS).toContain('premium');
  });

  it('includes search', () => {
    expect(SUPPORTED_PATHS).toContain('search');
  });

  it('includes compare', () => {
    expect(SUPPORTED_PATHS).toContain('compare');
  });

  it('includes privacy', () => {
    expect(SUPPORTED_PATHS).toContain('privacy');
  });

  it('includes loyalty', () => {
    expect(SUPPORTED_PATHS).toContain('loyalty');
  });

  it('includes warranty', () => {
    expect(SUPPORTED_PATHS).toContain('warranty');
  });

  it('includes account/addresses', () => {
    expect(SUPPORTED_PATHS).toContain('account/addresses');
  });

  it('includes consultation', () => {
    expect(SUPPORTED_PATHS).toContain('consultation');
  });

  it('includes referral', () => {
    expect(SUPPORTED_PATHS).toContain('referral');
  });

  it('has no duplicate entries', () => {
    const seen = new Set<string>();
    for (const path of SUPPORTED_PATHS) {
      expect(seen.has(path)).toBe(false);
      seen.add(path);
    }
  });
});

// ── cm-ay9: Trails deep links + badges alias ──────────────────────────────────

describe('linkingConfig — Trails routes (cm-ay9)', () => {
  const screens = linkingConfig.config!.screens as any;

  it('maps Trails screen with optional trailId param', () => {
    const trails = screens.Trails;
    expect(typeof trails).toBe('object');
    expect(trails.path).toBe('trails/:trailId?');
  });
});

describe('deep link route resolution — Trails (cm-ay9)', () => {
  it('resolves /trails to Trails screen (list view)', () => {
    expect(getScreen('trails')).toBe('Trails');
  });

  it('resolves /trails/spring to Trails screen', () => {
    expect(getScreen('trails/spring')).toBe('Trails');
  });

  it('resolves /trails/summer to Trails screen', () => {
    expect(getScreen('trails/summer')).toBe('Trails');
  });

  it('resolves /trails/fall to Trails screen', () => {
    expect(getScreen('trails/fall')).toBe('Trails');
  });

  it('passes trailId param to Trails screen', () => {
    expect(getParams('trails/spring')).toEqual({ trailId: 'spring' });
  });

  it('passes trailId param for summer trail', () => {
    expect(getParams('trails/summer')).toEqual({ trailId: 'summer' });
  });

  it('resolves /badges to AchievementBadges (alias)', () => {
    expect(getScreen('badges')).toBe('AchievementBadges');
  });

  it('resolves /badges with leading slash', () => {
    expect(getScreen('/badges')).toBe('AchievementBadges');
  });
});

describe('SUPPORTED_PATHS — Trails and badges (cm-ay9)', () => {
  it('includes badges', () => {
    expect(SUPPORTED_PATHS).toContain('badges');
  });

  it('includes trails', () => {
    expect(SUPPORTED_PATHS).toContain('trails');
  });
});
