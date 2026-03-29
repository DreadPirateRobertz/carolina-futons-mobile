const React = require('react');

const Image = React.forwardRef(function ExpoImage(props, ref) {
  // Pass all props through so tests can assert on expo-image-specific props
  // (contentFit, transition, recyclingKey, placeholder, cachePolicy, etc.)
  return React.createElement('Image', { ...props, ref });
});

Image.displayName = 'ExpoImage';

module.exports = { Image };
