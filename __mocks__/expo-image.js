const React = require('react');

const Image = React.forwardRef(function ExpoImage(props, ref) {
  const { contentFit, transition, recyclingKey, ...rest } = props;
  return React.createElement('Image', { ...rest, ref });
});

Image.displayName = 'ExpoImage';

module.exports = { Image };
