// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  // Desligado: em dev, o DevTools sobe um segundo listener WebSocket na
  // mesma porta do Nitro (SO_REUSEPORT), o que faz o browser receber
  // "426 Upgrade Required" em parte das requisições. Reativar se necessário.
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon',
    '@nuxt/content',
  ],
  // Nomes planos: components/media/CategoryCard -> <CategoryCard>
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/css/main.css'],
  // Pacote de redesign já aplicado — mantido só como referência histórica.
  typescript: {
    tsConfig: {
      exclude: ['../prysma-home-redesign/**'],
    },
  },
  runtimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
    // API-Football — privada (fora de `public`, o browser nunca vê a chave).
    footballApiKey: process.env.FOOTBALL_API_KEY || '',
    footballTimezone: process.env.FOOTBALL_TIMEZONE || 'America/Sao_Paulo',
    public: {
      omdbApiKey: process.env.OMDB_API_KEY,
      dataMode: process.env.DATA_MODE || 'mock',
    },
  },
  content: {
    database: {
      type: 'd1',
      bindingName: 'iptv',
    },
  },
});
