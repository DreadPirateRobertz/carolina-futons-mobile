/**
 * Integration tests for deep-link routing end-to-end through NavigationContainer.
 *
 * Earlier tests in this folder cover linkingConfig path resolution in isolation
 * (via getStateFromPath) and useDeepLink hook behaviour. This file wires the
 * real NavigationContainer to the real linkingConfig with URL delivery mocked,
 * so we exercise the same code path the app uses at runtime — including the
 * cold-start (getInitialURL) and hot (subscribe) flows.
 *
 * Target routes (cm-9s8, follow-up to cm-703 PR #512):
 *   /product/:slug           → ProductDetail
 *   /orders/:orderId         → OrderDetail
 *   /collections/:slug       → CollectionDetail
 *   /challenges/:challengeId → Challenges  (param is optional — both forms tested)
 *   /loyalty                 → Loyalty
 *
 * Also covers high-risk paths called out in PR #513 review:
 *   /store-locator           → StoreLocator (alias normalized to /stores)
 *   /referral/:code          → ReferralLanding (custom parse function)
 *   /account/addresses       → SavedAddresses (nested path disambiguation)
 */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { linkingConfig } from '../linking';

jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'));

function makeStub(name: string) {
  // React Navigation's ScreenComponentType is generic over its ParamList; for
  // a test harness we accept any route shape and render the params as JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Stub = ({ route }: any) => (
    <>
      <Text testID={`screen-${name}`}>{name}</Text>
      <Text testID={`screen-${name}-params`}>{JSON.stringify(route.params ?? {})}</Text>
    </>
  );
  Stub.displayName = `Stub(${name})`;
  return Stub;
}

const TabsStub = () => <Text testID="screen-Tabs">Tabs</Text>;

const Stack = createNativeStackNavigator();

type Handler = (url: string) => void;

/**
 * Build a NavigationContainer with a testable linking config. React Navigation
 * calls `getInitialURL` once on mount and `subscribe` to receive foreground URLs;
 * we override both so individual tests drive the flow deterministically.
 */
function makeTestApp({ initialUrl }: { initialUrl?: string | null }) {
  const unsubscribe = jest.fn();
  let emit: Handler = () => {};

  const linking = {
    ...linkingConfig,
    getInitialURL: async () => (initialUrl === undefined ? null : initialUrl),
    subscribe(listener: Handler) {
      emit = listener;
      return unsubscribe;
    },
  };

  const App = () => (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Tabs">
        <Stack.Screen name="Tabs" component={TabsStub} />
        <Stack.Screen name="ProductDetail" component={makeStub('ProductDetail')} />
        <Stack.Screen name="OrderDetail" component={makeStub('OrderDetail')} />
        <Stack.Screen name="OrderHistory" component={makeStub('OrderHistory')} />
        <Stack.Screen name="CollectionDetail" component={makeStub('CollectionDetail')} />
        <Stack.Screen name="Collections" component={makeStub('Collections')} />
        <Stack.Screen name="Challenges" component={makeStub('Challenges')} />
        <Stack.Screen name="Loyalty" component={makeStub('Loyalty')} />
        <Stack.Screen name="Category" component={makeStub('Category')} />
        <Stack.Screen name="StoreLocator" component={makeStub('StoreLocator')} />
        <Stack.Screen name="ReferralLanding" component={makeStub('ReferralLanding')} />
        <Stack.Screen name="SavedAddresses" component={makeStub('SavedAddresses')} />
        <Stack.Screen name="NotFound" component={makeStub('NotFound')} />
      </Stack.Navigator>
    </NavigationContainer>
  );

  return {
    App,
    /** Call this to emit a foreground URL event (after render + settled). */
    emit: (url: string) => emit(url),
    unsubscribe,
  };
}

function parseParamsJson(node: { props: { children: string } }): unknown {
  return JSON.parse(node.props.children);
}

describe('deep link navigation — integration (cm-9s8)', () => {
  beforeAll(() => {
    // Silence RN navigator-state warnings emitted when the test stack
    // does not declare every screen referenced in linkingConfig.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    (console.warn as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();
  });

  describe('cold-start deep links (getInitialURL)', () => {
    it('navigates to ProductDetail when app opens from carolinafutons://product/:slug', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://product/asheville-full' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-ProductDetail');
      const params = await findByTestId('screen-ProductDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'asheville-full' });
    });

    it('navigates to OrderDetail when app opens from carolinafutons://orders/:orderId', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://orders/ord-12345' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-OrderDetail');
      const params = await findByTestId('screen-OrderDetail-params');
      expect(parseParamsJson(params)).toEqual({ orderId: 'ord-12345' });
    });

    it('navigates to CollectionDetail when app opens from carolinafutons://collections/:slug', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://collections/mattresses' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-CollectionDetail');
      const params = await findByTestId('screen-CollectionDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'mattresses' });
    });

    it('navigates to Challenges when app opens from carolinafutons://challenges/:challengeId', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://challenges/ch-spring-2026' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-Challenges');
      const params = await findByTestId('screen-Challenges-params');
      expect(parseParamsJson(params)).toEqual({ challengeId: 'ch-spring-2026' });
    });

    // The Challenges route declares challengeId as optional (`challenges/:challengeId?`),
    // so a bare /challenges URL must still resolve to the Challenges screen — without a
    // challengeId param. Reviewer flagged this case as missing in PR #513.
    it('navigates to Challenges (no id) when app opens from carolinafutons://challenges', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://challenges' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-Challenges');
      const params = await findByTestId('screen-Challenges-params');
      const parsed = parseParamsJson(params) as { challengeId?: unknown };
      expect(parsed.challengeId).toBeUndefined();
    });

    it('navigates to Loyalty when app opens from carolinafutons://loyalty', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://loyalty' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-Loyalty');
    });

    it('navigates via universal link https://carolinafutons.com/product/:slug', async () => {
      const { App } = makeTestApp({
        initialUrl: 'https://carolinafutons.com/product/carolina-classic-queen',
      });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-ProductDetail');
      const params = await findByTestId('screen-ProductDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'carolina-classic-queen' });
    });

    it('navigates via www universal link https://www.carolinafutons.com/loyalty', async () => {
      const { App } = makeTestApp({
        initialUrl: 'https://www.carolinafutons.com/loyalty',
      });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-Loyalty');
    });

    it('preserves slug param when the URL includes a query string (UTM attribution)', async () => {
      const { App } = makeTestApp({
        initialUrl:
          'https://carolinafutons.com/product/asheville-full?utm_source=email&utm_campaign=spring',
      });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-ProductDetail');
      const params = await findByTestId('screen-ProductDetail-params');
      expect((parseParamsJson(params) as { slug: string }).slug).toBe('asheville-full');
    });

    it('resolves backend-produced products/:id alias to ProductDetail', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://products/wix-sku-99' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-ProductDetail');
      const params = await findByTestId('screen-ProductDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'wix-sku-99' });
    });
  });

  // High-risk paths called out in PR #513 review:
  //   - alias normalization (store-locator → stores) runs through normalizePathForLinking
  //   - custom parse function on ReferralLanding (`referral/:code`)
  //   - nested-segment route SavedAddresses must not be eaten by the Tabs/Account prefix
  describe('high-risk path resolution (alias / parse / nested)', () => {
    it('normalizes /store-locator alias to StoreLocator (cold start)', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://store-locator' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-StoreLocator');
    });

    it('canonical /stores also resolves to StoreLocator (cold start)', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://stores' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-StoreLocator');
    });

    it('normalizes /store-locator alias on hot link too', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://store-locator');
      });

      await findByTestId('screen-StoreLocator');
    });

    it('parses ReferralLanding code via custom parse function (cold start)', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://referral/SUMMER2026' });
      const { findByTestId } = render(<App />);

      await findByTestId('screen-ReferralLanding');
      const params = await findByTestId('screen-ReferralLanding-params');
      expect(parseParamsJson(params)).toEqual({ code: 'SUMMER2026' });
    });

    it('parses ReferralLanding code on hot link', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://referral/FALL2025');
      });

      await findByTestId('screen-ReferralLanding');
      const params = await findByTestId('screen-ReferralLanding-params');
      expect(parseParamsJson(params)).toEqual({ code: 'FALL2025' });
    });

    it('routes nested /account/addresses to SavedAddresses (not Tabs/Account)', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://account/addresses' });
      const { findByTestId, queryByTestId } = render(<App />);

      await findByTestId('screen-SavedAddresses');
      // Confirm the nested path was NOT swallowed by the Tabs/Account screen.
      expect(queryByTestId('screen-Tabs')).toBeNull();
    });
  });

  describe('hot deep links (foreground subscribe listener)', () => {
    it('routes foreground link to ProductDetail', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://product/hot-slug');
      });

      await findByTestId('screen-ProductDetail');
      const params = await findByTestId('screen-ProductDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'hot-slug' });
    });

    it('routes foreground link to OrderDetail', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://orders/ord-hot');
      });

      await findByTestId('screen-OrderDetail');
      const params = await findByTestId('screen-OrderDetail-params');
      expect(parseParamsJson(params)).toEqual({ orderId: 'ord-hot' });
    });

    it('routes foreground link to CollectionDetail', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://collections/bedroom');
      });

      await findByTestId('screen-CollectionDetail');
      const params = await findByTestId('screen-CollectionDetail-params');
      expect(parseParamsJson(params)).toEqual({ slug: 'bedroom' });
    });

    it('routes foreground link to Challenges with id', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://challenges/weekly-quiz');
      });

      await findByTestId('screen-Challenges');
      const params = await findByTestId('screen-Challenges-params');
      expect(parseParamsJson(params)).toEqual({ challengeId: 'weekly-quiz' });
    });

    it('routes foreground link to Loyalty', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('carolinafutons://loyalty');
      });

      await findByTestId('screen-Loyalty');
    });
  });

  describe('cold-start with no link (normal launch)', () => {
    it('renders Tabs when getInitialURL returns null', async () => {
      const { App } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');
    });
  });

  describe('edge cases — malformed / invalid URLs', () => {
    it('renders Tabs on empty initial URL', async () => {
      const { App } = makeTestApp({ initialUrl: '' });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');
    });

    it('does not crash on unknown route (falls back to Tabs or NotFound)', async () => {
      const { App } = makeTestApp({ initialUrl: 'carolinafutons://totally-unknown-route' });
      const { queryByTestId } = render(<App />);

      await waitFor(() => {
        const onTabs = queryByTestId('screen-Tabs');
        const onNotFound = queryByTestId('screen-NotFound');
        expect(onTabs || onNotFound).toBeTruthy();
      });

      expect(queryByTestId('screen-ProductDetail')).toBeNull();
      expect(queryByTestId('screen-Loyalty')).toBeNull();
      expect(queryByTestId('screen-OrderDetail')).toBeNull();
    });

    it('does not crash on hot link with malformed URL', async () => {
      const { App, emit } = makeTestApp({ initialUrl: null });
      const { findByTestId } = render(<App />);
      await findByTestId('screen-Tabs');

      await act(async () => {
        emit('not-a-valid-url');
      });
      await act(async () => {
        emit('carolinafutons://');
      });
      await act(async () => {
        emit('');
      });

      await findByTestId('screen-Tabs');
    });

    it('calls unsubscribe on unmount', async () => {
      const { App, unsubscribe } = makeTestApp({ initialUrl: null });
      const { findByTestId, unmount } = render(<App />);
      await findByTestId('screen-Tabs');
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
