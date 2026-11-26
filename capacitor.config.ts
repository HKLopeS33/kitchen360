import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.florestaja.app',
  appName: 'Floresta Já',
  webDir: 'dist',
  server: {
    url: 'https://kitchen360app.netlify.app',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#1f3a0f',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
