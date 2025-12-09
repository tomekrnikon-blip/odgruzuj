import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d07c62380cf34500a6ea0b013c9ca9e7',
  appName: 'odgruzuj.pl',
  webDir: 'dist',
  server: {
    url: 'https://d07c6238-0cf3-4500-a6ea-0b013c9ca9e7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      showSpinner: false
    }
  }
};

export default config;
