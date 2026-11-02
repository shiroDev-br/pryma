import { ADMIN_POLL_MS } from '~/constants';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import { getAccessToken } from '~/utils/tokenStorage';
import type { ApiError, ClientAccount, ClientQuery, RequestStatus } from '~/types';

const BUSY = new Set(['pending', 'syncing']);

/**
 * Tabela de clientes do painel: recarrega quando o filtro muda e, enquanto
 * alguma lista visível estiver na fila/processando, atualiza sozinha.
 */
export function useAdminClients(query: Ref<ClientQuery>) {
  const items = ref<ClientAccount[]>([]);
  const total = ref(0);
  const status = ref<RequestStatus>('idle');
  const error = ref<ApiError | null>(null);

  let controller: AbortController | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  const hasBusy = computed(() =>
    items.value.some((client) => client.playlist && BUSY.has(client.playlist.status)),
  );

  /** `silent`: atualização de fundo — sem trocar a tabela por "carregando". */
  async function load(silent = false): Promise<void> {
    // Logout em andamento: o filtro muda junto com o usuário — nada a buscar.
    if (!getAccessToken()) return;
    controller?.abort();
    controller = new AbortController();
    clearTimeout(pollTimer);
    if (!silent) status.value = 'pending';

    try {
      const page = await getRepositories().admin.listClients(query.value, { signal: controller.signal });
      items.value = page.items;
      total.value = page.total;
      status.value = 'success';
      error.value = null;
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'unknown_error' && controller.signal.aborted) return;
      error.value = apiError;
      if (!silent) status.value = 'error';
    }

    if (hasBusy.value) pollTimer = setTimeout(() => load(true), ADMIN_POLL_MS);
  }

  watch(query, () => load(), { deep: true, immediate: true });

  onScopeDispose(() => {
    controller?.abort();
    clearTimeout(pollTimer);
  });

  return { items, total, status, error, hasBusy, refresh: load };
}
