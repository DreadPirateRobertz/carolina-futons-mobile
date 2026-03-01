const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @wix/sdk ships ESM entry (build/index.mjs) that doesn't exist in the package.
// Force Metro to use the CJS entry (cjs/build/index.js) instead.
const wixSdkCjs = path.resolve(__dirname, 'node_modules/@wix/sdk/cjs/build/index.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@wix/sdk') {
    return { filePath: wixSdkCjs, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
