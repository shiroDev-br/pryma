import { computed } from 'vue';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
// NuxtLink é resolvido em compilação — import explícito pro `component :is` em runtime.
import { NuxtLink } from '#components';
import { useUpdater } from '~/composables/useUpdater';
import type { HomeMenuItem } from '~/composables/useHomeMenu';

/**
 * Como um destino do menu abre: rota interna, link externo (navegador do sistema)
 * ou Atualizações (app Downloader). Vale para o carrossel da TV e a grade do celular.
 */
export function useMenuItemLink(item: () => HomeMenuItem) {
  const updater = useUpdater();

  const tag = computed(() => {
    const { externalUrl, to } = item();
    if (externalUrl) return 'a';
    return to ? NuxtLink : 'button';
  });

  const bind = computed(() => {
    const { externalUrl, to } = item();
    if (externalUrl) return { href: externalUrl, target: '_blank', rel: 'noopener noreferrer' };
    return to ? { to } : { type: 'button' as const };
  });

  /** Link externo sai do app; link interno segue o caminho normal do clique. */
  function openExternal(event: MouseEvent): void {
    const { externalUrl, downloaderCode } = item();
    if (!externalUrl) return;
    event.preventDefault();
    if (downloaderCode) void updater.openUpdates(downloaderCode, externalUrl);
    else if (Capacitor.isNativePlatform()) void Browser.open({ url: externalUrl });
    else window.open(externalUrl, '_blank', 'noopener');
  }

  return { tag, bind, openExternal };
}
