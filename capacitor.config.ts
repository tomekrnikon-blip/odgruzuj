import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.odgruzuj.app',
  appName: 'odgruzuj',
  webDir: 'dist',
  // Development server for hot-reload testing
  server: {
    url: 'https://d07c6238-0cf3-4500-a6ea-0b013c9ca9e7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
