// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  // Desligado: em dev, o DevTools sobe um segundo listener WebSocket na
  // mesma porta do Nitro (SO_REUSEPORT), o que faz o browser receber
  // "426 Upgrade Required" em parte das requisições. Reativar se necessário.
  devtools: { enabled: false },
  // NUXT_SSR=0 gera SPA estático — build do APK (Capacitor não tem Nitro).
  ssr: process.env.NUXT_SSR !== '0',
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon',
  ],
  // Nomes planos: components/media/CategoryCard -> <CategoryCard>
  // Só .vue vira componente — arquivos .ts/.css co-locados são módulos internos.
  components: [{ path: '~/components', pathPrefix: false, extensions: ['vue'] }],
  css: ['~/assets/css/main.css'],
  // Pacote de redesign já aplicado — mantido só como referência histórica.
  typescript: {
    tsConfig: {
      exclude: ['../prysma-home-redesign/**'],
    },
  },
  runtimeConfig: {
    public: {
      // Base da API falada pelo browser/APK — no APK não existe proxy Nitro.
      apiBaseUrl: process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8000',
      dataMode: process.env.DATA_MODE || 'mock',
      // API-Football — no APK a chave vive no bundle (aceito para o app mobile).
      footballApiKey: process.env.FOOTBALL_API_KEY || '',
      footballTimezone: process.env.FOOTBALL_TIMEZONE || 'America/Sao_Paulo',
    },
  },
});
