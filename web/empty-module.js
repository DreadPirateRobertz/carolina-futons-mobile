// Stub for native-only modules on web (e.g. @stripe/stripe-react-native).
// Provider components pass children through; everything else is a no-op.
const passthrough = ({ children }) => children || null;
const noop = () => null;

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === '__esModule') return true;
      if (prop === 'default') return passthrough;
      // Common Provider/Context patterns — render children
      if (typeof prop === 'string' && /Provider|Context|Consumer/.test(prop)) {
        return passthrough;
      }
      // Hooks return safe defaults
      if (typeof prop === 'string' && prop.startsWith('use')) {
        return () => ({});
      }
      // Everything else is a no-op component
      return noop;
    },
  },
);
