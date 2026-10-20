import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prysma.iptv',
  appName: 'Pryma',
  webDir: '.output/public',
  server: {
    // `http` em vez do padrão `https` pra não bloquear chamadas http:// à API
    // (mixed content) enquanto o backend ainda não está atrás de TLS.
    androidScheme: 'http',
  },
};

export default config;
