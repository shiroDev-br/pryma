import { onMounted } from 'vue';
import { useFootballStore } from '~/stores/football';

/** Revalida no máximo 1×/min — o proxy já cacheia, aqui só detecta cache vencido. */
const SYNC_INTERVAL_MS = 60_000;

let syncStarted = false;

function startSync(store: ReturnType<typeof useFootballStore>): void {
  if (syncStarted || import.meta.server) return;
  syncStarted = true;

  const revalidate = (): void => {
    void store.ensureFresh();
  };

  window.setInterval(revalidate, SYNC_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revalidate();
  });
}

/**
 * Time do coração + próximo jogo, prontos para a UI.
 *
 * Hidrata o cache local e dispara a busca quando ele está vencido (00h do dia
 * seguinte ao jogo). Pode ser chamado por quantas telas quiser — cada etapa é
 * idempotente. Deve ser chamado dentro do `setup` do componente.
 */
export function useFavoriteTeam() {
  const store = useFootballStore();

  onMounted(() => {
    store.hydrate();
    void store.ensureFresh();
    startSync(store);
  });

  return store;
}
