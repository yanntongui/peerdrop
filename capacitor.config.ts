import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peerdrop.app',
  appName: 'PeerDrop',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      // Camera permissions for QR scanning
    },
    Share: {
      // Share sheet for sending files
    },
    Filesystem: {
      // File system access for reading/writing files
    },
  },
  ios: {
    // iOS specific config
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    // Android specific config
    allowMixedContent: true,
  },
};

export default config;
