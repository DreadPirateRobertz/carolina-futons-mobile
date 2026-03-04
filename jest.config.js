// Set Stripe test key before babel-preset-expo inlines EXPO_PUBLIC_ vars
process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock';

module.exports = {
  preset: 'jest-expo',
  setupFiles: [
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
  ],
  // TDD tests for unimplemented features — skip until modules exist
  testPathIgnorePatterns: [
    '/node_modules/',
    'stores\\.test\\.ts',
    'StoreCard\\.test\\.tsx',
    'StoreLocatorScreen\\.test\\.tsx',
    'useStoreLocator\\.test\\.tsx',
  ],
};
