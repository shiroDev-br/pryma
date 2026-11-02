<template>
  <div>
    <AdminPageHeader title="Wallpapers" :subtitle="subtitle">
      <div class="adm-tabs" role="tablist" aria-label="Seções">
        <button
          v-for="item in TABS"
          :key="item.value"
          type="button"
          role="tab"
          class="adm-tab"
          :class="{ 'adm-tab--active': tab === item.value }"
          :aria-selected="tab === item.value"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </AdminPageHeader>

    <p class="adm-alert adm-alert--info mb-6 text-[0.8rem] leading-relaxed">
      Escolha com critério: evite artes com pessoas reais, conteúdo sugestivo e marcas de terceiros.
      Os vídeos vêm do DesktopHut — cada importação é convertida para H.264 (1080p/720p) e servida pela API.
    </p>

    <!-- ── Biblioteca (nossa fila + prontos) ── -->
    <template v-if="tab === 'library'">
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <label class="block w-[12rem] max-w-full">
          <span class="adm-label">Status</span>
          <select v-model="statusFilter" class="adm-select">
            <option value="">Todos</option>
            <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
        <p v-if="busyCount" class="pb-2 text-[0.8rem] text-ink-muted">
          <Icon name="svg-spinners:ring-resize" class="mr-1 inline h-3.5 w-3.5 align-[-0.15em]" aria-hidden="true" />
          {{ formatNumber(busyCount) }} na fila de conversão — a lista atualiza sozinha.
        </p>
      </div>

      <p v-if="actionError" class="adm-alert adm-alert--error mb-4" role="alert">{{ actionError }}</p>

      <div class="adm-card overflow-x-auto">
        <LoadingState v-if="libraryStatus === 'pending'" class="px-5" message="Carregando wallpapers…" />
        <p v-else-if="libraryStatus === 'error'" class="adm-alert adm-alert--error m-4">{{ libraryError }}</p>
        <p v-else-if="!library.length" class="px-5 py-10 text-center text-sm text-ink-muted">
          Nenhum wallpaper {{ statusFilter ? 'com esse status' : 'importado ainda' }}.
          <button v-if="!statusFilter" type="button" class="adm-btn adm-btn--sm adm-btn--link" @click="tab = 'source'">
            Abrir o DesktopHut
          </button>
        </p>
        <table v-else class="adm-table adm-table--stack">
          <thead>
            <tr>
              <th>Wallpaper</th>
              <th>Status</th>
              <th class="adm-num">Tamanho</th>
              <th>Importado</th>
              <th><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in library" :key="item.id">
              <td data-label="Wallpaper">
                <div class="flex items-center gap-3">
                  <img
                    v-if="item.thumbUrl"
                    :src="item.thumbUrl"
                    alt=""
                    width="96"
                    height="54"
                    loading="lazy"
                    class="wp-thumb-sm"
                    :class="{ 'opacity-40': item.hidden }"
                  />
                  <div class="min-w-0 text-left">
                    <p class="truncate font-semibold">{{ item.title }}</p>
                    <p class="truncate text-[0.75rem] text-ink-muted">
                      {{ item.categories.join(' · ') || item.sourceSlug }}
                      <span v-if="item.hidden"> · oculto no app</span>
                    </p>
                  </div>
                </div>
              </td>
              <td data-label="Status">
                <span
                  class="status-badge"
                  :class="`status-badge--${BADGE[item.status]}`"
                  :title="item.error || undefined"
                >
                  <Icon v-if="isBusy(item)" name="svg-spinners:ring-resize" class="h-3 w-3" aria-hidden="true" />
                  <span v-else class="status-dot" aria-hidden="true" />
                  {{ STATUS_LABELS[item.status] }}
                </span>
                <p v-if="item.error" class="mt-1 max-w-[18rem] text-[0.72rem] text-ink-muted">{{ item.error }}</p>
              </td>
              <td class="adm-num" data-label="Tamanho">{{ item.bytes ? formatBytes(item.bytes) : '—' }}</td>
              <td class="whitespace-nowrap text-ink-muted" data-label="Importado">{{ formatDateTime(item.createdAt) }}</td>
              <td>
                <div class="flex flex-wrap justify-end gap-1">
                  <button
                    v-if="item.status === 'ready'"
                    type="button"
                    class="adm-btn adm-btn--sm"
                    :disabled="busyId === item.id"
                    @click="toggleHidden(item)"
                  >
                    <Icon
                      :name="item.hidden ? 'material-symbols:visibility-outline-rounded' : 'material-symbols:visibility-off-outline-rounded'"
                      class="h-4 w-4"
                      aria-hidden="true"
                    />
                    {{ item.hidden ? 'Mostrar' : 'Ocultar' }}
                  </button>
                  <button
                    v-if="item.status === 'failed'"
                    type="button"
                    class="adm-btn adm-btn--sm"
                    :disabled="busyId === item.id"
                    @click="retry(item)"
                  >
                    <Icon name="material-symbols:refresh-rounded" class="h-4 w-4" aria-hidden="true" />
                    Tentar de novo
                  </button>
                  <a :href="item.sourceUrl" target="_blank" rel="noopener noreferrer" class="adm-btn adm-btn--sm adm-btn--link">
                    Origem
                  </a>
                  <button
                    type="button"
                    class="adm-btn adm-btn--sm adm-btn--ghost-danger"
                    :disabled="item.status === 'processing'"
                    :aria-label="`Excluir ${item.title}`"
                    @click="askDelete(item)"
                  >
                    <Icon name="material-symbols:delete-outline-rounded" class="h-4 w-4" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="libraryTotal > LIBRARY_PAGE_SIZE" class="mt-4 flex items-center justify-end gap-2 text-sm text-ink-muted">
        <span>{{ formatNumber(offset + 1) }}–{{ formatNumber(Math.min(offset + LIBRARY_PAGE_SIZE, libraryTotal)) }} de {{ formatNumber(libraryTotal) }}</span>
        <button type="button" class="adm-btn adm-btn--sm" :disabled="offset === 0" @click="offset -= LIBRARY_PAGE_SIZE">Anterior</button>
        <button
          type="button"
          class="adm-btn adm-btn--sm"
          :disabled="offset + LIBRARY_PAGE_SIZE >= libraryTotal"
          @click="offset += LIBRARY_PAGE_SIZE"
        >
          Próxima
        </button>
      </div>
    </template>

    <!-- ── DesktopHut (origem) ── -->
    <template v-else>
      <form class="adm-card mb-4 flex flex-wrap items-end gap-3 p-4" @submit.prevent="importByLink">
        <label class="block min-w-[16rem] flex-1">
          <span class="adm-label">Importar por link</span>
          <input
            v-model="link"
            class="adm-input"
            required
            maxlength="512"
            placeholder="https://www.desktophut.com/nome-do-wallpaper-abcd"
          />
        </label>
        <button type="submit" class="adm-btn adm-btn--primary" :disabled="importing">
          <Icon name="material-symbols:add-photo-alternate-outline-rounded" class="h-4 w-4" aria-hidden="true" />
          Importar
        </button>
      </form>

      <div class="mb-4 flex flex-wrap items-end gap-3">
        <label class="block w-[11rem]">
          <span class="adm-label">Ordem</span>
          <select v-model="sort" class="adm-select">
            <option value="latest">Mais recentes</option>
            <option value="popular">Mais baixados</option>
          </select>
        </label>
        <div class="flex items-center gap-2 pb-0.5">
          <button type="button" class="adm-btn adm-btn--sm" :disabled="page <= 1 || sourceStatus === 'pending'" @click="page -= 1">Anterior</button>
          <span class="text-sm text-ink-muted">Página {{ page }}</span>
          <button type="button" class="adm-btn adm-btn--sm" :disabled="!sourceHasMore || sourceStatus === 'pending'" @click="page += 1">Próxima</button>
        </div>
        <button
          type="button"
          class="adm-btn adm-btn--primary ml-auto"
          :disabled="!selected.size || importing"
          @click="importSelected"
        >
          <Icon v-if="importing" name="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
          Importar selecionados ({{ selected.size }})
        </button>
      </div>

      <p v-if="importMessage" class="adm-alert adm-alert--success mb-4" role="status">{{ importMessage }}</p>
      <p v-if="actionError" class="adm-alert adm-alert--error mb-4" role="alert">{{ actionError }}</p>

      <LoadingState v-if="sourceStatus === 'pending'" message="Buscando no DesktopHut…" />
      <p v-else-if="sourceStatus === 'error'" class="adm-alert adm-alert--error">{{ sourceError }}</p>
      <ul v-else class="wp-grid">
        <li v-for="item in sourceItems" :key="item.slug">
          <label class="wp-card" :class="{ 'wp-card--selected': selected.has(item.slug), 'wp-card--done': item.imported }">
            <input
              type="checkbox"
              class="sr-only"
              :checked="selected.has(item.slug)"
              :disabled="item.imported"
              @change="toggleSelected(item.slug)"
            />
            <span class="wp-thumb">
              <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" alt="" loading="lazy" decoding="async" />
              <span v-if="item.imported" class="wp-flag">Já importado</span>
              <Icon
                v-else-if="selected.has(item.slug)"
                name="material-symbols:check-circle"
                class="wp-check h-6 w-6"
                aria-hidden="true"
              />
            </span>
            <span class="block p-3">
              <span class="block truncate text-sm font-semibold">{{ item.title }}</span>
              <span class="block text-[0.72rem] text-ink-muted">
                {{ item.resolution || '—' }} · {{ formatNumber(item.downloads) }} downloads
              </span>
            </span>
          </label>
        </li>
      </ul>
    </template>

    <AdminConfirmDialog
      :open="toDelete !== null"
      title="Excluir wallpaper?"
      confirm-label="Excluir wallpaper"
      :pending="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    >
      <p v-if="toDelete">
        <strong class="text-ink">{{ toDelete.title }}</strong> e os arquivos convertidos são apagados.
        Quem estiver com ele de fundo volta para o Padrão.
      </p>
    </AdminConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ADMIN_POLL_MS } from '~/constants';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import { formatDateTime, formatNumber } from '~/utils/adminFormat';
import type { AdminWallpaper, RequestStatus, SourceSort, SourceWallpaper, WallpaperStatus } from '~/types';

definePageMeta({ layout: 'admin', middleware: 'admin', adminOnly: true });

useHead({ title: 'Wallpapers — Painel Pryma' });

const LIBRARY_PAGE_SIZE = 50;

const TABS = [
  { value: 'library', label: 'Biblioteca' },
  { value: 'source', label: 'DesktopHut' },
] as const;

const STATUS_LABELS: Record<WallpaperStatus, string> = {
  queued: 'Na fila',
  processing: 'Convertendo',
  ready: 'Pronto',
  failed: 'Falhou',
};

/** Reaproveita as cores do status de lista (status-badge--*). */
const BADGE: Record<WallpaperStatus, string> = {
  queued: 'pending',
  processing: 'syncing',
  ready: 'ready',
  failed: 'failed',
};

const route = useRoute();
const router = useRouter();

const tab = computed<'library' | 'source'>({
  get: () => (route.query.tab === 'source' ? 'source' : 'library'),
  set: (value) => {
    void router.replace({ query: { ...route.query, tab: value === 'source' ? 'source' : undefined } });
  },
});

const actionError = ref('');

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace('.', ',')} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
}

// ── Biblioteca ──────────────────────────────────────────────────────────────
const library = ref<AdminWallpaper[]>([]);
const libraryTotal = ref(0);
const libraryStatus = ref<RequestStatus>('pending');
const libraryError = ref('');
const usedBytes = ref(0);
const maxBytes = ref(0);
const statusFilter = ref<WallpaperStatus | ''>('');
const offset = ref(0);
const busyId = ref<string | null>(null);

let controller: AbortController | null = null;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

function isBusy(item: AdminWallpaper): boolean {
  return item.status === 'queued' || item.status === 'processing';
}

const busyCount = computed(() => library.value.filter(isBusy).length);

const subtitle = computed(() => {
  if (libraryStatus.value !== 'success' || !maxBytes.value) return undefined;
  const count = `${formatNumber(libraryTotal.value)} ${libraryTotal.value === 1 ? 'wallpaper' : 'wallpapers'}`;
  return `${count} · ${formatBytes(usedBytes.value)} de ${formatBytes(maxBytes.value)}`;
});

/** `silent`: atualização de fundo (fila andando) — sem "carregando" na tabela. */
async function loadLibrary(silent = false): Promise<void> {
  controller?.abort();
  controller = new AbortController();
  clearTimeout(pollTimer);
  if (!silent) libraryStatus.value = 'pending';
  try {
    const page = await getRepositories().admin.listWallpapers(
      { status: statusFilter.value || undefined, limit: LIBRARY_PAGE_SIZE, offset: offset.value },
      { signal: controller.signal },
    );
    library.value = page.items;
    libraryTotal.value = page.total;
    usedBytes.value = page.usedBytes;
    maxBytes.value = page.maxBytes;
    libraryStatus.value = 'success';
  } catch (err) {
    if (controller.signal.aborted) return;
    if (!silent) {
      libraryError.value = toApiError(err).message;
      libraryStatus.value = 'error';
    }
  }
  if (busyCount.value) pollTimer = setTimeout(() => loadLibrary(true), ADMIN_POLL_MS);
}

watch(statusFilter, () => {
  if (offset.value === 0) void loadLibrary();
  else offset.value = 0;
});
watch(offset, () => loadLibrary());

async function toggleHidden(item: AdminWallpaper): Promise<void> {
  busyId.value = item.id;
  actionError.value = '';
  try {
    Object.assign(item, await getRepositories().admin.updateWallpaper(item.id, { hidden: !item.hidden }));
  } catch (err) {
    actionError.value = toApiError(err).message;
  } finally {
    busyId.value = null;
  }
}

async function retry(item: AdminWallpaper): Promise<void> {
  busyId.value = item.id;
  actionError.value = '';
  try {
    Object.assign(item, await getRepositories().admin.retryWallpaper(item.id));
    void loadLibrary(true);
  } catch (err) {
    actionError.value = toApiError(err).message;
  } finally {
    busyId.value = null;
  }
}

const toDelete = ref<AdminWallpaper | null>(null);
const deleting = ref(false);
const deleteError = ref('');

function askDelete(item: AdminWallpaper): void {
  deleteError.value = '';
  toDelete.value = item;
}

async function confirmDelete(): Promise<void> {
  const item = toDelete.value;
  if (!item) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await getRepositories().admin.deleteWallpaper(item.id);
    toDelete.value = null;
    void loadLibrary(true);
  } catch (err) {
    deleteError.value = toApiError(err).message;
  } finally {
    deleting.value = false;
  }
}

// ── DesktopHut ──────────────────────────────────────────────────────────────
const sort = ref<SourceSort>('latest');
const page = ref(1);
const sourceItems = ref<SourceWallpaper[]>([]);
const sourceHasMore = ref(false);
const sourceStatus = ref<RequestStatus>('idle');
const sourceError = ref('');
const selected = ref(new Set<string>());
const importing = ref(false);
const importMessage = ref('');
const link = ref('');

let sourceController: AbortController | null = null;

async function loadSource(): Promise<void> {
  sourceController?.abort();
  sourceController = new AbortController();
  sourceStatus.value = 'pending';
  try {
    const result = await getRepositories().admin.browseWallpaperSource(
      { page: page.value, sort: sort.value },
      { signal: sourceController.signal },
    );
    sourceItems.value = result.items;
    sourceHasMore.value = result.hasMore;
    sourceStatus.value = 'success';
  } catch (err) {
    if (sourceController.signal.aborted) return;
    sourceError.value = toApiError(err).message;
    sourceStatus.value = 'error';
  }
}

watch(sort, () => {
  if (page.value === 1) void loadSource();
  else page.value = 1;
});
watch(page, () => loadSource());

function toggleSelected(slug: string): void {
  const next = new Set(selected.value);
  if (next.has(slug)) next.delete(slug);
  else next.add(slug);
  selected.value = next;
}

async function runImport(items: { slug: string; title?: string; thumbnailUrl?: string | null }[]): Promise<boolean> {
  importing.value = true;
  importMessage.value = '';
  actionError.value = '';
  try {
    const result = await getRepositories().admin.importWallpapers(items);
    importMessage.value =
      `${formatNumber(result.queued)} na fila de conversão` +
      (result.skipped ? ` · ${formatNumber(result.skipped)} já importado(s)` : '') +
      ' — acompanhe na Biblioteca.';
    return true;
  } catch (err) {
    actionError.value = toApiError(err).message;
    return false;
  } finally {
    importing.value = false;
  }
}

async function importSelected(): Promise<void> {
  const items = sourceItems.value
    .filter((item) => selected.value.has(item.slug))
    .map((item) => ({ slug: item.slug, title: item.title, thumbnailUrl: item.thumbnailUrl }));
  if (!items.length || !(await runImport(items))) return;
  for (const item of sourceItems.value) {
    if (selected.value.has(item.slug)) item.imported = true;
  }
  selected.value = new Set();
}

async function importByLink(): Promise<void> {
  if (await runImport([{ slug: link.value.trim() }])) link.value = '';
}

watch(
  tab,
  (value) => {
    actionError.value = '';
    importMessage.value = '';
    if (value === 'source' && sourceStatus.value === 'idle') void loadSource();
    if (value === 'library') void loadLibrary(libraryStatus.value === 'success');
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  controller?.abort();
  sourceController?.abort();
  clearTimeout(pollTimer);
});
</script>
