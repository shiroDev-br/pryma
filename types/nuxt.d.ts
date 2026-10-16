declare module '#app' {
  interface PublicRuntimeConfig {
    dataMode: 'mock' | 'live';
    /** Base da API falada pelo browser/APK (sem proxy Nitro). */
    apiBaseUrl: string;
    /** API-Football — no APK a chave vive no bundle. */
    footballApiKey: string;
    footballTimezone: string;
  }
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

export {};
