import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { closeTopBackLayer } from '~/composables/useBackLayer';
import { useDoubleBackExit } from '~/composables/useDoubleBackExit';

/**
 * Botão voltar do Android no app nativo:
 * 1. tela cheia → sai da tela cheia;
 * 2. modal/menu aberto → fecha (janela de sair, atualização, jogos do dia… ver useBackLayer);
 * 3. tem histórico → volta;
 * 4. fora da home sem histórico → vai pra home (replace: a home não "volta" pra cá);
 * 5. na home → aviso "pressione de novo" e, no 2º, a janela de confirmação.
 *    Nunca fecha direto: voltar 2× rápido numa tela qualquer chegava na home
 *    e o 2º toque fechava o app sem perguntar.
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return;

  const router = useRouter();
  const { handleBackButton } = useDoubleBackExit();

  void CapApp.addListener('backButton', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (closeTopBackLayer()) return;
    if (window.history.state?.back) {
      window.history.back();
      return;
    }
    if (router.currentRoute.value.path !== '/') {
      void router.replace('/');
      return;
    }
    handleBackButton();
  });
});
