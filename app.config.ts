import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Build-time validation: enforce that production builds have a Wix proxy URL
 * configured, preventing accidental deployment without server-side API routing.
 */
function validateProductionConfig() {
  const isProduction = process.env.APP_VARIANT === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
  if (!isProduction) return;

  if (!process.env.EXPO_PUBLIC_WIX_PROXY_URL) {
    throw new Error(
      'EXPO_PUBLIC_WIX_PROXY_URL is required for production builds. ' +
        'Direct API key usage is not allowed in production — configure a backend proxy. ' +
        'See .env.example for details.',
    );
  }

  if (process.env.EXPO_PUBLIC_WIX_API_KEY) {
    throw new Error(
      'EXPO_PUBLIC_WIX_API_KEY must NOT be set — it exposes the API key in the client bundle. ' +
        'Use WIX_API_KEY (non-public) for development, or EXPO_PUBLIC_WIX_PROXY_URL for production.',
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  validateProductionConfig();

  return {
    ...config,
    name: 'Carolina Futons',
    slug: 'carolina-futons-mobile',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      backgroundColor: '#E8D5B7',
      resizeMode: 'contain',
    },
    assetBundlePatterns: ['assets/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.carolinafutons.mobile',
      associatedDomains: [
        'applinks:carolinafutons.com',
        'applinks:www.carolinafutons.com',
      ],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#E8D5B7',
      },
      package: 'com.carolinafutons.mobile',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'carolinafutons.com', pathPrefix: '/product' },
            { scheme: 'https', host: 'www.carolinafutons.com', pathPrefix: '/product' },
            { scheme: 'https', host: 'carolinafutons.com', pathPrefix: '/products' },
            { scheme: 'https', host: 'www.carolinafutons.com', pathPrefix: '/products' },
            { scheme: 'https', host: 'carolinafutons.com', pathPrefix: '/category' },
            { scheme: 'https', host: 'www.carolinafutons.com', pathPrefix: '/category' },
            { scheme: 'https', host: 'carolinafutons.com', pathPrefix: '/collections' },
            { scheme: 'https', host: 'www.carolinafutons.com', pathPrefix: '/collections' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    scheme: 'carolinafutons',
    plugins: [
      'expo-asset',
      'expo-secure-store',
      'expo-font',
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.carolinafutons',
          enableGooglePay: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#E8D5B7',
        },
      ],
    ],
  };
};
