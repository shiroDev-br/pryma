import { onScopeDispose, watch } from 'vue';

/**
 * Camadas que o botão Voltar do aparelho fecha antes de sair da tela.
 *
 * O Voltar do Fire Stick/Android não chega ao JS como tecla: vem pelo plugin do
 * Capacitor (plugins/capacitor.client.ts). Modal ou menu aberto não ficava
 * sabendo — o Voltar navegava por trás dele e, na home, ainda contava como
 * tentativa de sair. Quem abre algo por cima da tela declara aqui.
 */
const layers: (() => void)[] = [];

/** Enquanto `isOpen()` for verdadeiro, o Voltar chama `close` em vez de navegar. */
export function useBackLayer(isOpen: () => boolean, close: () => void): void {
  if (import.meta.server) return;

  const remove = (): void => {
    const index = layers.indexOf(close);
    if (index >= 0) layers.splice(index, 1);
  };

  watch(isOpen, (open) => {
    remove();
    if (open) layers.push(close);
  }, { immediate: true });

  onScopeDispose(remove);
}

/** Fecha a camada do topo. false = não havia nenhuma (o Voltar segue o caminho normal). */
export function closeTopBackLayer(): boolean {
  const close = layers[layers.length - 1];
  if (!close) return false;
  close();
  return true;
}
