// Adopts the UIScene life cycle on iOS. Apps built with the iOS 27 SDK trap at
// launch without it, and the SDK 57 native template still starts React Native
// from the app delegate. Mirrors the SDK 58 template: remove this plugin after
// upgrading to SDK 58.
const fs = require('node:fs');
const path = require('node:path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const START_REACT_NATIVE_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_START_COMMENT = `    // The window is created and React Native is started by \`SceneDelegate\` under the
    // scene-based life cycle (required by the iOS 27 SDK).
`;

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('ExpoReactNativeFactoryProvider')) {
      return config;
    }
    if (
      !contents.includes('class AppDelegate: ExpoAppDelegate {') ||
      !contents.includes(START_REACT_NATIVE_BLOCK)
    ) {
      throw new Error(
        "with-ios-scene-lifecycle: AppDelegate.swift doesn't match the SDK 57 template.",
      );
    }
    contents = contents
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      )
      .replace(START_REACT_NATIVE_BLOCK, SCENE_START_COMMENT);
    config.modResults.contents = contents;
    return config;
  });

const withSceneDelegateFile = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
      fs.writeFileSync(
        path.join(config.modRequest.platformProjectRoot, projectName, SCENE_DELEGATE_FILE),
        SCENE_DELEGATE_SOURCE,
      );
      return config;
    },
  ]);

const withSceneDelegateInProject = (config) =>
  withXcodeProject(config, (config) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const filepath = path.join(projectName, SCENE_DELEGATE_FILE);
    if (!config.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
      });
    }
    return config;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

module.exports = (config) =>
  withSceneManifest(
    withSceneDelegateInProject(withSceneDelegateFile(withSceneAppDelegate(config))),
  );
