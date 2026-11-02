/**
 * Overlay de carregamento entre telas.
 *
 * `page:loading:start` sai no `beforeEach` do router — ANTES do middleware e
 * do download do chunk da página. O `page:start` antigo só disparava depois
 * disso: na TV, o intervalo entre apertar OK e a tela nova ficava sem nenhum
 * retorno visual. `page:loading:end` cobre sucesso, navegação cancelada e erro.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { start, finish } = useGlobalLoading();

  nuxtApp.hook('page:loading:start', () => {
    // Primeira carga: o HTML do servidor já está na tela — o overlay só
    // cobriria a página pronta (e ligaria no meio da hidratação).
    if (nuxtApp.isHydrating) return;
    start('Carregando…');
  });
  nuxtApp.hook('page:loading:end', () => finish());
  nuxtApp.hook('app:error', () => finish());
  nuxtApp.hook('vue:error', () => finish());
});
