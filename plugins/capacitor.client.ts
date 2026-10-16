import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

/**
 * Botão voltar do Android no app nativo:
 * 1. tela cheia → sai da tela cheia;
 * 2. tem histórico → volta;
 * 3. sem histórico → fecha o app.
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return;

  const router = useRouter();

  void CapApp.addListener('backButton', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (window.history.state?.back) {
      window.history.back();
      return;
    }
    if (router.currentRoute.value.path !== '/') {
      void router.push('/');
      return;
    }
    void CapApp.exitApp();
  });
});
