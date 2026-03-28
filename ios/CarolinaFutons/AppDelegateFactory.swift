// AppDelegateFactory.swift
// Expo SDK 55 bare workflow migration to ExpoReactNativeFactory.
//
// ExpoReactNativeFactoryDelegate is a Swift-only class that can't be an ObjC superclass,
// so AppDelegateFactory is Swift-private. AppDelegateFactoryHelper is the ObjC-visible
// wrapper that AppDelegate.mm uses to get a pre-configured ExpoReactNativeFactoryObjC.

internal import Expo
internal import React

private class AppDelegateFactory: ExpoReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

@objc(AppDelegateFactoryHelper)
class AppDelegateFactoryHelper: NSObject {
  // Retain both objects for the lifetime of this helper.
  private let factoryDelegate: AppDelegateFactory
  @objc private(set) var expoFactory: ExpoReactNativeFactoryObjC

  @objc override init() {
    factoryDelegate = AppDelegateFactory()
    expoFactory = ExpoReactNativeFactory(delegate: factoryDelegate)
    super.init()
  }
}
