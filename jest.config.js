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
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // TDD tests for unimplemented features — skip until modules exist
  // SearchScreen: skipped in CI — fake-timer accumulation causes SIGTERM OOM on GH Actions
  //   (7741 other tests pass; tracked in gh issue #434 for SearchScreen test isolation fix)
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/crew/',
    'stores\\.test\\.ts',
    'StoreCard\\.test\\.tsx',
    'StoreLocatorScreen\\.test\\.tsx',
    'useStoreLocator\\.test\\.tsx',
    'SearchScreen\\.test\\.tsx',
  ],
  // Prevent zombie worker processes from accumulating memory after test runs.
  forceExit: true,
};
