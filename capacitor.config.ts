import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.florestaja.app',
  appName: 'Floresta Já',
  webDir: 'dist',
  server: {
    url: 'https://kitchen360app.netlify.app',
    cleartext: false
  }
};

export default config;
