export default defineNuxtPlugin((nuxtApp) => {
  const { start, finish } = useGlobalLoading();

  let pendingNavigations = 0;

  nuxtApp.hook('page:start', () => {
    pendingNavigations++;
    start('Carregando…');
  });

  nuxtApp.hook('page:finish', () => {
    pendingNavigations = Math.max(0, pendingNavigations - 1);
    if (pendingNavigations === 0) {
      finish();
    }
  });

  // page:error hook não existe no Nuxt 3, usar app:error ou errorHandler
  nuxtApp.hook('app:error', () => {
    pendingNavigations = 0;
    finish();
  });
});