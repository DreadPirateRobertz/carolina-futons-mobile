// Manual mock for mixpanel-react-native
const Mixpanel = jest.fn().mockImplementation(() => ({
  init: jest.fn(() => Promise.resolve()),
  track: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  flush: jest.fn(),
  optOutTracking: jest.fn(),
  optInTracking: jest.fn(),
  getPeople: () => ({ set: jest.fn() }),
}));

module.exports = { Mixpanel };
