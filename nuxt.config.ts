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
    // SVG inline (não máscara CSS): cada ícone em modo CSS é um <span> com
    // mask-image — com a GPU da TV sem memória a máscara se perdia e o ícone
    // virava um quadrado sólido (tela "sumida" só com quadradinhos).
    mode: 'svg',
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
  // admin.css global (não importado pelas páginas): o painel roda sem SSR e,
  // com cssCodeSplit desligado, CSS de componente vai para um style.css que o
  // HTML não referencia — só o CSS global é embutido. Classes prefixadas adm-/admin-.
  css: ['~/assets/css/main.css', '~/assets/css/admin.css'],
  // TVs/sideloading costumam ter WebView antigo (Chromium <80) que não parseia
  // `?.`/`??` (ES2020) — sem isso o bundle quebra e a tela fica preta.
  vite: {
    build: {
      target: 'es2017',
      cssTarget: 'chrome61',
      cssCodeSplit: false,
      // NÃO desligar cssMinify: é a minificação (esbuild) que rebaixa o CSS
      // para o cssTarget acima — `inset` vira top/right/bottom/left, #rrggbbaa
      // vira rgba(). Sem ela a TV antiga ignora todo `inset-0` e home, prévia,
      // player e loading global saem do lugar.
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
  // Painel de staff: sessão vive no localStorage — renderizar no servidor só
  // geraria uma tela sem usuário e erro de hidratação. SPA no cliente.
  routeRules: {
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },
  hooks: {
    // Painel de staff (/admin) é só web: fora do build do APK (NUXT_SSR=0),
    // para não ir embutido no app que o cliente final instala.
    'pages:extend'(pages) {
      if (process.env.NUXT_SSR !== '0') return;
      for (let i = pages.length - 1; i >= 0; i--) {
        if (pages[i].path === '/admin' || pages[i].path.startsWith('/admin/')) pages.splice(i, 1);
      }
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
      // Carimbo do build (injetado pelo script de APK) — exibido no login/About
      // pra saber na TV qual build está rodando.
      buildId: process.env.BUILD_ID || 'dev',
    },
  },
});
