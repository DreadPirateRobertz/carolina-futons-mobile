const React = require('react');
const { View } = require('react-native');

module.exports = {
  Video: React.forwardRef(({ testID, onError, ...props }, ref) =>
    React.createElement(View, {
      testID,
      ref,
      testOnly_onError: onError,
      ...props,
    }),
  ),
  ResizeMode: {
    COVER: 'cover',
    CONTAIN: 'contain',
    STRETCH: 'stretch',
    NONE: 'none',
  },
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
};
