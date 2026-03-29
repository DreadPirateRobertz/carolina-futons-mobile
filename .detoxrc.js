/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/CarolinaFutons.app',
      build:
        'xcodebuild -workspace ios/CarolinaFutons.xcworkspace -scheme CarolinaFutons -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/CarolinaFutons.app',
      build:
        'xcodebuild -workspace ios/CarolinaFutons.xcworkspace -scheme CarolinaFutons -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    'simulator.iphone15': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro Max',
      },
    },
    // App Store screenshot devices — one per required display size group
    // 6.7" group (1290×2796): iPhone 15 Pro Max / 16 Plus / 17 Pro Max
    'simulator.screenshot.6_7': {
      type: 'ios.simulator',
      device: { type: 'iPhone 17 Pro Max' },
    },
    // 6.5" group (1284×2778): iPhone 11/12/13/14 Pro Max, 14 Plus
    // Create this sim if missing: xcrun simctl create "iPhone 14 Plus" "iPhone 14 Plus" <runtime>
    'simulator.screenshot.6_5': {
      type: 'ios.simulator',
      device: { type: 'iPhone 14 Plus' },
    },
    // 5.5" group (1242×2208): iPhone 8 Plus
    // Create this sim if missing: xcrun simctl create "iPhone 8 Plus" "iPhone 8 Plus" <runtime>
    'simulator.screenshot.5_5': {
      type: 'ios.simulator',
      device: { type: 'iPhone 8 Plus' },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'ios.screenshot.iphone15': {
      device: 'simulator.iphone15',
      app: 'ios.release',
    },
    'ios.screenshot.6_7': {
      device: 'simulator.screenshot.6_7',
      app: 'ios.release',
    },
    'ios.screenshot.6_5': {
      device: 'simulator.screenshot.6_5',
      app: 'ios.release',
    },
    'ios.screenshot.5_5': {
      device: 'simulator.screenshot.5_5',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.screenshot.pixel6': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
