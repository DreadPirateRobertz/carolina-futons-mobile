const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @wix/sdk ships ESM entry (build/index.mjs) that doesn't exist in the package.
// Force Metro to use the CJS entry (cjs/build/index.js) instead.
const wixSdkCjs = path.resolve(__dirname, 'node_modules/@wix/sdk/cjs/build/index.js');

// Stub for native-only modules that break web builds (deep RN imports)
const emptyModule = require.resolve('./web/empty-module.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@wix/sdk') {
    return { filePath: wixSdkCjs, type: 'sourceFile' };
  }

  // @stripe/stripe-react-native imports react-native internals that don't
  // exist on web (TextInputState → Platform). Stub it for web builds.
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { filePath: emptyModule, type: 'sourceFile' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
