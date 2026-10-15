declare module '#app' {
  interface PublicRuntimeConfig {
    dataMode: 'mock' | 'live';
  }

  interface RuntimeConfig {
    apiBaseUrl: string;
  }
}

export {};
