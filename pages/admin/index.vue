<template>
  <div>
    <AdminPageHeader title="Clientes" :subtitle="subtitle" />

    <p class="mb-6 text-[0.82rem] leading-relaxed text-ink-muted">
      Não há cadastro manual: no primeiro login no app, o usuário e a senha são procurados nos servidores cadastrados e
      o cliente aparece aqui, vinculado ao servidor que aceitou a conta.
    </p>

    <p v-if="notice" class="adm-alert adm-alert--success mb-6" role="status">{{ notice }}</p>
    <p v-if="actionError" class="adm-alert adm-alert--error mb-6" role="alert">{{ actionError }}</p>

    <!-- Filtros. -->
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <label class="min-w-[14rem] flex-1">
        <span class="adm-label">Buscar</span>
        <input v-model="search" class="adm-input" type="search" placeholder="Nome ou usuário do cliente" />
      </label>
      <label v-if="admin" class="w-[14rem]">
        <span class="adm-label">Revendedor</span>
        <select class="adm-select" :value="resellerId" @change="setFilter('reseller', ($event.target as HTMLSelectElement).value)">
          <option value="">Todos</option>
          <option v-for="r in resellers" :key="r.id" :value="r.id">{{ r.username }}</option>
        </select>
      </label>
      <label class="w-[14rem]">
        <span class="adm-label">Servidor</span>
        <select class="adm-select" :value="serverId" @change="setFilter('server', ($event.target as HTMLSelectElement).value)">
          <option value="">Todos</option>
          <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
    </div>

    <div class="adm-card overflow-x-auto">
      <LoadingState v-if="clients.status.value === 'pending' && !clients.items.value.length" class="px-5" message="Carregando clientes…" />
      <p v-else-if="clients.status.value === 'error'" class="adm-alert adm-alert--error m-4">
        {{ clients.error.value?.message }}
      </p>
      <p v-else-if="!clients.items.value.length" class="px-5 py-10 text-center text-sm text-ink-muted">
        {{ hasFilters ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente entrou no app ainda.' }}
      </p>
      <table v-else class="adm-table adm-table--stack">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Servidor</th>
            <th v-if="admin">Revendedor</th>
            <th>Cadastro</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in clients.items.value" :key="client.id">
            <td data-label="Cliente">
              <div>
                <p class="font-semibold">{{ client.name || client.username }}</p>
                <p v-if="client.name" class="mt-0.5 text-[0.75rem] text-ink-muted">usuário {{ client.username }}</p>
              </div>
            </td>
            <td data-label="Servidor">
              <div class="flex flex-col items-start gap-1">
                <span class="font-medium">{{ client.serverName ?? 'Lista original' }}</span>
                <AdminStatusBadge v-if="client.playlist" :status="client.playlist.status" :error="client.playlist.error" />
                <span v-if="client.playlist?.status === 'failed' && client.playlist.error" class="max-w-[22rem] text-[0.75rem] text-danger">
                  {{ client.playlist.error }}
                </span>
              </div>
            </td>
            <td v-if="admin" class="text-ink-muted" data-label="Revendedor">{{ client.resellerUsername ?? '—' }}</td>
            <td class="whitespace-nowrap text-ink-muted" data-label="Cadastro">{{ formatDateTime(client.createdAt) }}</td>
            <td>
              <div class="flex justify-end gap-2">
                <button
                  v-if="client.canResync"
                  type="button"
                  class="adm-btn adm-btn--sm"
                  :disabled="syncing.has(client.id) || isBusy(client)"
                  title="Conferir a conta do cliente no servidor de novo"
                  @click="syncClient(client)"
                >
                  <Icon name="material-symbols:sync-rounded" class="h-4 w-4" aria-hidden="true" />
                  Verificar
                </button>
                <button
                  type="button"
                  class="adm-btn adm-btn--sm adm-btn--ghost-danger"
                  :aria-label="`Excluir ${client.name || client.username}`"
                  @click="askDelete(client)"
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

    <AdminConfirmDialog
      :open="toDelete !== null"
      title="Excluir cliente?"
      confirm-label="Excluir cliente"
      :pending="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="closeDelete"
    >
      <p v-if="toDelete">
        <strong class="text-ink">{{ toDelete.name || toDelete.username }}</strong>
        <template v-if="toDelete.name"> (usuário {{ toDelete.username }})</template>
        perde o acesso ao app imediatamente. Esta ação não pode ser desfeita.
      </p>
    </AdminConfirmDialog>

    <!-- Paginação. -->
    <div v-if="clients.total.value > ADMIN_PAGE_SIZE" class="mt-4 flex items-center justify-between text-sm text-ink-muted">
      <span>{{ rangeLabel }}</span>
      <div class="flex gap-2">
        <button type="button" class="adm-btn adm-btn--sm" :disabled="page <= 1" @click="setFilter('page', String(page - 1))">
          Anterior
        </button>
        <button type="button" class="adm-btn adm-btn--sm" :disabled="page >= pageCount" @click="setFilter('page', String(page + 1))">
          Próxima
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ADMIN_PAGE_SIZE } from '~/constants';
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import { formatNumber, formatDateTime } from '~/utils/adminFormat';
import { isAdmin } from '~/utils/staff';
import type { ClientAccount, ClientQuery, Reseller, Server } from '~/types';

definePageMeta({ layout: 'admin', middleware: 'admin' });

useHead({ title: 'Clientes — Painel Pryma' });

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const admin = computed(() => isAdmin(auth.user.value));

// ── Filtros na URL (?q=&reseller=&server=&page=) — compartilháveis e com voltar.
function queryValue(key: string): string {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

const resellerId = computed(() => queryValue('reseller'));
const serverId = computed(() => queryValue('server'));
const page = computed(() => Math.max(1, Number(queryValue('page')) || 1));

/** Um único replace: trocar filtro e voltar pra página 1 na mesma navegação. */
function setFilter(key: 'q' | 'reseller' | 'server' | 'page', value: string): void {
  const query = { ...route.query };
  if (value && !(key === 'page' && value === '1')) query[key] = value;
  else delete query[key];
  if (key !== 'page') delete query.page;
  router.replace({ query });
}

const search = ref(queryValue('q'));
const debouncedSearch = useDebouncedValue(search);
watch(debouncedSearch, (value) => setFilter('q', value.trim()));

const clientQuery = computed<ClientQuery>(() => ({
  q: queryValue('q') || null,
  resellerId: admin.value ? resellerId.value || null : null,
  serverId: serverId.value || null,
  limit: ADMIN_PAGE_SIZE,
  offset: (page.value - 1) * ADMIN_PAGE_SIZE,
}));

const clients = useAdminClients(clientQuery);

const hasFilters = computed(() => Boolean(queryValue('q') || resellerId.value || serverId.value));
const pageCount = computed(() => Math.max(1, Math.ceil(clients.total.value / ADMIN_PAGE_SIZE)));
const rangeLabel = computed(() => {
  const start = (page.value - 1) * ADMIN_PAGE_SIZE + 1;
  const end = Math.min(page.value * ADMIN_PAGE_SIZE, clients.total.value);
  return `${start}–${end} de ${formatNumber(clients.total.value)}`;
});
const subtitle = computed(() =>
  clients.status.value === 'success'
    ? `${formatNumber(clients.total.value)} ${clients.total.value === 1 ? 'cliente' : 'clientes'}${hasFilters.value ? ' no filtro' : ''}`
    : undefined,
);

// ── Opções dos filtros: servidores e revendedores (admin).
const servers = ref<Server[]>([]);
const resellers = ref<Reseller[]>([]);

onMounted(async () => {
  const repo = getRepositories().admin;
  const [serverPage, resellerPage] = await Promise.allSettled([
    repo.listServers(),
    admin.value ? repo.listResellers() : Promise.resolve({ items: [] }),
  ]);
  if (serverPage.status === 'fulfilled') servers.value = serverPage.value.items;
  if (resellerPage.status === 'fulfilled') resellers.value = resellerPage.value.items;
});

const notice = ref('');

// ── Verificar a conta no servidor de novo.
const syncing = ref(new Set<string>());
const actionError = ref('');

function isBusy(client: ClientAccount): boolean {
  return client.playlist?.status === 'pending' || client.playlist?.status === 'syncing';
}

async function syncClient(client: ClientAccount): Promise<void> {
  syncing.value.add(client.id);
  actionError.value = '';
  try {
    await getRepositories().admin.syncClient(client.id);
    // A verificação roda em background logo após a resposta: mostra
    // "na fila" já e deixa a atualização automática acompanhar.
    if (client.playlist) client.playlist.status = 'pending';
    setTimeout(() => clients.refresh(true), 1500);
  } catch (err) {
    actionError.value = toApiError(err).message;
  } finally {
    syncing.value.delete(client.id);
  }
}

// ── Excluir cliente (com confirmação).
const toDelete = ref<ClientAccount | null>(null);
const deleting = ref(false);
const deleteError = ref('');

function askDelete(client: ClientAccount): void {
  deleteError.value = '';
  toDelete.value = client;
}

function closeDelete(): void {
  toDelete.value = null;
}

async function confirmDelete(): Promise<void> {
  const client = toDelete.value;
  if (!client) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await getRepositories().admin.deleteClient(client.id);
    toDelete.value = null;
    actionError.value = '';
    notice.value = `${client.name || client.username} foi excluído.`;
    // Última linha da página: volta uma página para não cair numa vazia.
    if (clients.items.value.length === 1 && page.value > 1) setFilter('page', String(page.value - 1));
    else await clients.refresh(true);
  } catch (err) {
    deleteError.value = toApiError(err).message;
  } finally {
    deleting.value = false;
  }
}
</script>
