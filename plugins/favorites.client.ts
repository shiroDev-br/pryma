import { usePreferencesStore } from '~/stores/preferences';

/**
 * Favoritos vivem no localStorage, que o servidor não enxerga: o estado do
 * Pinia hidrata vazio a partir do HTML do SSR. Depois de montar, relê do
 * storage (no APK, sem SSR, já nasce certo e isto só repete a leitura).
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    usePreferencesStore().hydrateFavorites();
  });
});
