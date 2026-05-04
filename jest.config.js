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
  // Kill and recycle workers that exceed this memory threshold, preventing OOM
  // crashes in CI when large test suites (e.g. SearchScreen) accumulate heap.
  workerIdleMemoryLimit: '512MB',
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
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/crew/',
    'stores\\.test\\.ts',
    'storeCard\\.test\\.tsx',
    'storeLocatorScreen\\.test\\.tsx',
    'useStoreLocator\\.test\\.tsx',
  ],
  // Prevent zombie worker processes from accumulating memory after test runs.
  forceExit: true,
};
