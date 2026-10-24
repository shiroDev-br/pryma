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
  android: {
    // Ícones adaptativos (mobile) - o Capacitor gera a partir do `assets/icon.png`
    // Banner para Android TV (320x180) - usado no launcher da TV
    // O banner deve estar em `assets/icon.png` e será redimensionado
    // Para usar banner diferente na TV, adicione `android:banner` no AndroidManifest
  },
};

export default config;
