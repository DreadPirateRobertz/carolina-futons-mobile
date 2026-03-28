const React = require('react');
const { View } = require('react-native');

const mockPlayer = {
  loop: false,
  muted: false,
  play: jest.fn(),
  pause: jest.fn(),
  release: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  status: 'idle',
};

module.exports = {
  VideoView: React.forwardRef(({ testID, ...props }, ref) =>
    React.createElement(View, { testID, ref, ...props }),
  ),
  useVideoPlayer: jest.fn((source, setup) => {
    if (setup) setup(mockPlayer);
    return mockPlayer;
  }),
  createVideoPlayer: jest.fn(() => mockPlayer),
  isPictureInPictureSupported: jest.fn().mockResolvedValue(false),
};
