import legacy from '@vitejs/plugin-legacy';

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
  // Ícones embutidos no bundle como SVG inline — TV/WebView sem internet
  // não depende da API pública do Iconify em runtime (ícone some = layout quebra).
  icon: {
    // WebView antiga (<88) não parseia `:where()` e descarta a regra inteira —
    // os ícones CSS simplesmente não aparecem na TV.
    cssWherePseudo: false,
    clientBundle: {
      scan: {
        // O glob padrão cobre só vue/jsx/tsx/md — ícones citados em .ts
        // (categoryVisuals, useHomeMenu…) ficavam de fora do bundle e sumiam
        // offline.
        globInclude: ['**/*.{vue,jsx,tsx,ts,js,md,mdc,mdx,yml,yaml}'],
      },
    },
    // Só as coleções usadas no código — sem isso o server bundle tenta
    // embutir as 177 coleções do @iconify/json.
    serverBundle: {
      collections: ['material-symbols', 'logos', 'svg-spinners'],
    },
  },
  // Nomes planos: components/media/CategoryCard -> <CategoryCard>
  // Só .vue vira componente — arquivos .ts/.css co-locados são módulos internos.
  components: [{ path: '~/components', pathPrefix: false, extensions: ['vue'] }],
  css: ['~/assets/css/main.css', '~/assets/css/responsive.css'],
  // TVs/sideloading costumam ter WebView antigo (Chromium <80) que não parseia
  // `?.`/`??` (ES2020) — sem isso o bundle quebra e a tela fica preta.
  vite: {
    build: {
      target: 'es2017',
      cssTarget: 'chrome61',
    },
    plugins: [
      // WebView <61 não executa `<script type="module">` e WebViews antigos
      // carecem de APIs (globalThis, Promise.allSettled, .at…). O bundle
      // legacy (`nomodule`, transpilado p/ ES5 + core-js) cobre esses casos;
      // o bundle module continua intacto para navegadores modernos.
      legacy({
        targets: ['chrome >= 49'],
        modernPolyfills: true,
      }),
    ],
  },
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
