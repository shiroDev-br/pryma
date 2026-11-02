import { computed, ref, shallowRef, watch } from 'vue';
import type { ShallowRef, WatchSource } from 'vue';
import { toApiError } from '~/utils/errors';
import type { ApiError, Paginated, RequestStatus } from '~/types';

export type PaginatedFetcher<T> = (cursor: string | null, signal: AbortSignal) => Promise<Paginated<T>>;

export interface UsePaginatedQueryOptions {
  /** Quando mudam, a lista reinicia (filtros/params). */
  resetOn?: WatchSource[];
  /** Carregar a primeira página ao montar. */
  immediate?: boolean;
}

export interface PaginatedQuery<T> {
  items: ShallowRef<T[]>;
  status: Ref<RequestStatus>;
  error: Ref<ApiError | null>;
  total: Ref<number>;
  hasNext: ComputedRef<boolean>;
  isLoading: ComputedRef<boolean>;
  isPending: ComputedRef<boolean>;
  /** Primeira página — `await` no setup segura a troca de tela até ter o que mostrar. */
  ready: Promise<void>;
  /** Primeira página de fato concluída — também na hidratação, em que `ready` não espera. */
  settled: Promise<void>;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  reset(): void;
}

/**
 * Núcleo de listagem com cursor — usado por listagem, busca e infinite scroll.
 * Cancela a request anterior (AbortController) e acumula itens em shallowRef
 * para nunca aplicar reatividade profunda a milhares de itens.
 */
export function usePaginatedQuery<T>(
  fetchPage: PaginatedFetcher<T>,
  options: UsePaginatedQueryOptions = {},
): PaginatedQuery<T> {
  const items = shallowRef<T[]>([]) as ShallowRef<T[]>;
  const status = ref<RequestStatus>('idle');
  const error = ref<ApiError | null>(null);
  const total = ref(0);
  const cursor = ref<string | null>(null);

  let controller: AbortController | null = null;
  let requestId = 0;

  const hasNext = computed(() => cursor.value !== null);
  const isLoading = computed(() => status.value === 'pending');
  const isPending = computed(() => status.value === 'pending' && items.value.length === 0);

  async function load(mode: 'replace' | 'append'): Promise<void> {
    // O catálogo exige login e o token só existe no cliente: no servidor a API
    // responde 401 e o HTML saía com "Não foi possível carregar".
    if (import.meta.server) return;

    controller?.abort();
    const local = new AbortController();
    controller = local;
    const id = ++requestId;

    status.value = 'pending';
    error.value = null;

    try {
      const page = await fetchPage(mode === 'append' ? cursor.value : null, local.signal);
      if (id !== requestId) return;

      items.value = mode === 'replace' ? page.items : [...items.value, ...page.items];
      total.value = page.total;
      cursor.value = page.nextCursor;
      status.value = 'success';
    } catch (err) {
      if (local.signal.aborted || id !== requestId) return;
      error.value = toApiError(err);
      status.value = 'error';
    }
  }

  function refresh(): Promise<void> {
    return load('replace');
  }

  function loadMore(): Promise<void> {
    if (!hasNext.value || isLoading.value) return Promise.resolve();
    return load('append');
  }

  function reset(): void {
    controller?.abort();
    requestId += 1;
    items.value = [];
    cursor.value = null;
    total.value = 0;
    status.value = 'idle';
    error.value = null;
  }

  if (options.resetOn?.length) {
    watch(options.resetOn, () => {
      reset();
      if (options.immediate !== false) refresh();
    });
  }

  const immediate = options.immediate !== false;
  // O servidor pinta "carregando"; a hidratação precisa encontrar o mesmo estado —
  // por isso ela não espera a página (a lista entra logo depois de montar).
  if (immediate && import.meta.server) status.value = 'pending';
  const firstLoad = immediate ? refresh() : Promise.resolve();
  const ready = tryUseNuxtApp()?.isHydrating ? Promise.resolve() : firstLoad;

  onScopeDispose(() => controller?.abort());

  return { items, status, error, total, hasNext, isLoading, isPending, ready, settled: firstLoad, refresh, loadMore, reset };
}
