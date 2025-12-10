import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.odgruzuj.app',
  appName: 'odgruzuj',
  webDir: 'dist',
  // Production config - no server URL, uses bundled files
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#16a34a',
    preferredContentMode: 'mobile',
    scheme: 'odgruzuj'
  },
  android: {
    backgroundColor: '#16a34a',
    allowMixedContent: false,
    captureInput: true,
    useLegacyBridge: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#16a34a'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
