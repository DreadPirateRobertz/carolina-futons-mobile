const React = require('react');
const { View } = require('react-native');

const ViewShot = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement(View, { ...props, ref }, children),
);
ViewShot.displayName = 'ViewShot';

module.exports = {
  __esModule: true,
  default: ViewShot,
  captureRef: jest.fn(() => Promise.resolve('/tmp/screenshot.png')),
};
