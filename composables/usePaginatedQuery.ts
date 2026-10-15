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
  /** Promise da primeira página — `await` no setup pra SSR sair com dados. */
  ready: Promise<void>;
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

  // Primeira página em voo — pages `await ready` pra não hidratar "Carregando".
  const ready = options.immediate === false ? Promise.resolve() : refresh();

  return { items, status, error, total, hasNext, isLoading, isPending, ready, refresh, loadMore, reset };
}
