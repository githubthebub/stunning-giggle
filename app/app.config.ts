/**
 * Expo app configuration.
 *
 * `extra` surfaces a couple of runtime-readable knobs, but the source of truth
 * for behaviour is src/config/appConfig.ts. No analytics, no updates URL, no
 * network services are configured here — the app is offline-first by design.
 */
import type { ExpoConfig } from 'expo/config';
import { appConfig } from './src/config/appConfig';

const config: ExpoConfig = {
  name: 'Compass',
  slug: 'compass',
  scheme: 'compass',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#12151b',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.example.compass',
    // Local-only app: no background modes, no network entitlements required.
  },
  android: {
    package: 'com.example.compass',
    // No INTERNET-dependent features; the app functions fully offline.
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Compass uses your device passcode/biometrics to protect the local encryption key.',
      },
    ],
  ],
  extra: {
    minimumAge: appConfig.minimumAge,
    defaultCrisisRegion: appConfig.defaultCrisisRegion,
  },
};

export default config;
