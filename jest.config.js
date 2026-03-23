// Set test keys before babel-preset-expo inlines EXPO_PUBLIC_ vars
process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test_mock';
process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_test_mock';
// Set Google OAuth web client ID for expo-auth-session Google provider tests
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-google-web-client-id';

module.exports = {
  preset: 'jest-expo',
  // Cap workers at 50% of CPUs to reduce resource contention under parallel load.
  // Default (ncpus - 1) caused flaky timeouts in render-heavy test suites.
  maxWorkers: '50%',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setup.after.js'],
  transformIgnorePatterns: [
    // Transform all the React Native / Expo packages, plus until-async (ESM-only dep
    // pulled in by msw/lib/core/utils/handleRequest.js for integration tests).
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|until-async)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Route MSW imports to compiled CJS bundles — MSW v2 uses package exports
    // that resolve to ESM in jest-expo's react-native environment, breaking
    // Node-based integration tests. Pinning to the lib/ CJS build avoids
    // the ESM-only transitive dependency (until-async, rettime) transform issue.
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // TDD tests for unimplemented features — skip until modules exist
  testPathIgnorePatterns: [
    '/node_modules/',
    'stores\\.test\\.ts',
    'StoreCard\\.test\\.tsx',
    'StoreLocatorScreen\\.test\\.tsx',
    'useStoreLocator\\.test\\.tsx',
  ],
};
