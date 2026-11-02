import { ref } from 'vue';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface UpdaterPlugin {
  status(options: { url: string }): Promise<{ installed: boolean; canOpenUrl: boolean; amazon: boolean }>;
  openDownloader(options: { url: string }): Promise<{ mode: 'url' | 'app' }>;
  openStore(): Promise<void>;
}

/** Plugin nativo (android/.../UpdaterPlugin.java) — só existe no APK. */
const Updater = registerPlugin<UpdaterPlugin>('Updater');

/** Janela do botão Atualizações: sem o Downloader ('missing') ou com o código para digitar ('code'). */
const updateModal = ref<null | 'missing' | 'code'>(null);
/** Pedido em andamento: o código e a URL do aftv.news. */
const pending = ref<{ code: string; url: string } | null>(null);

/**
 * Botão "Atualizações": o APK novo é instalado pelo app Downloader (AFTVnews).
 *  - APK com Downloader que aceita a URL → abre direto na atualização;
 *  - Downloader que não aceita → janela com o código + "Abrir Downloader";
 *  - sem Downloader → janela pedindo para instalar (botão abre a loja);
 *  - navegador → abre a URL numa aba, como antes.
 */
export function useUpdater() {
  async function openUpdates(code: string, url: string): Promise<void> {
    pending.value = { code, url };
    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    try {
      const status = await Updater.status({ url });
      if (!status.installed) {
        updateModal.value = 'missing';
        return;
      }
      if (status.canOpenUrl) {
        await Updater.openDownloader({ url });
        return;
      }
      updateModal.value = 'code';
    } catch {
      // APK antigo sem o plugin: pelo menos mostra o código.
      updateModal.value = 'code';
    }
  }

  async function launchDownloader(): Promise<void> {
    const url = pending.value?.url ?? '';
    updateModal.value = null;
    try {
      await Updater.openDownloader({ url });
    } catch {
      updateModal.value = 'missing';
    }
  }

  async function openStore(): Promise<void> {
    updateModal.value = null;
    await Updater.openStore().catch(() => undefined);
  }

  function closeUpdateModal(): void {
    updateModal.value = null;
  }

  return { updateModal, pending, openUpdates, launchDownloader, openStore, closeUpdateModal };
}
