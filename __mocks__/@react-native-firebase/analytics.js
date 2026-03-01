// Manual mock for @react-native-firebase/analytics
const mockAnalytics = () => ({
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  setUserId: jest.fn(),
  setUserProperty: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
});

module.exports = { __esModule: true, default: mockAnalytics };
