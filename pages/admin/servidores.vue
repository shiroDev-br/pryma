<template>
  <div>
    <AdminPageHeader title="Servidores" :subtitle="subtitle">
      <button type="button" class="adm-btn adm-btn--primary" @click="toggleForm">
        <Icon name="material-symbols:dns-outline-rounded" class="h-4 w-4" aria-hidden="true" />
        Novo servidor
      </button>
    </AdminPageHeader>

    <!-- Servidor = DNS do painel Xtream; o catálogo dos clientes é lido dele ao vivo. -->
    <form v-if="showForm" class="adm-card mb-6 flex flex-wrap items-end gap-3 p-5" @submit.prevent="createServer">
      <label class="block w-[16rem] max-w-full">
        <span class="adm-label">Nome do painel</span>
        <input ref="nameInput" v-model="form.name" class="adm-input" required maxlength="120" placeholder="Ex.: Black" />
      </label>
      <label class="block min-w-[18rem] flex-1">
        <span class="adm-label">DNS</span>
        <input v-model="form.url" class="adm-input" required maxlength="512" placeholder="http://painel.exemplo.com" />
      </label>
      <button type="submit" class="adm-btn adm-btn--primary" :disabled="creating">
        <Icon v-if="creating" name="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
        {{ creating ? 'Salvando…' : 'Cadastrar' }}
      </button>
      <p class="w-full text-[0.78rem] leading-relaxed text-ink-muted">
        Só o endereço do painel (com a porta, se tiver). Os clientes são vinculados a ele com usuário e senha.
      </p>
      <p v-if="formError" class="adm-alert adm-alert--error w-full" role="alert">{{ formError }}</p>
    </form>

    <p v-if="actionError" class="adm-alert adm-alert--error mb-6" role="alert">{{ actionError }}</p>

    <div class="adm-card overflow-x-auto">
      <LoadingState v-if="status === 'pending'" class="px-5" message="Carregando servidores…" />
      <p v-else-if="status === 'error'" class="adm-alert adm-alert--error m-4">{{ errorMessage }}</p>
      <p v-else-if="!servers.length" class="px-5 py-10 text-center text-sm text-ink-muted">Nenhum servidor cadastrado ainda.</p>
      <table v-else class="adm-table adm-table--stack">
        <thead>
          <tr>
            <th>Servidor</th>
            <th>DNS</th>
            <th class="adm-num">Clientes</th>
            <th>Cadastro</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="server in servers" :key="server.id">
            <template v-if="editingId === server.id">
              <td colspan="4">
                <form :id="`edit-${server.id}`" class="flex flex-wrap items-center gap-2" @submit.prevent="saveEdit(server)">
                  <input
                    ref="editInput"
                    v-model="edit.name"
                    class="adm-input w-[12rem] max-w-full"
                    required
                    maxlength="120"
                    aria-label="Nome do painel"
                    @keydown.esc="editingId = null"
                  />
                  <input
                    v-model="edit.url"
                    class="adm-input min-w-[16rem] flex-1"
                    required
                    maxlength="512"
                    aria-label="DNS"
                    @keydown.esc="editingId = null"
                  />
                </form>
                <p v-if="edit.url.trim() && edit.url.trim() !== server.url && server.clientCount" class="mt-1 text-[0.75rem] text-ink-muted">
                  Os {{ formatNumber(server.clientCount) }} clientes deste servidor passam a usar o DNS novo.
                </p>
              </td>
              <td>
                <div class="flex justify-end gap-1">
                  <button type="submit" :form="`edit-${server.id}`" class="adm-btn adm-btn--sm adm-btn--primary" :disabled="saving">Salvar</button>
                  <button type="button" class="adm-btn adm-btn--sm" :disabled="saving" @click="editingId = null">Cancelar</button>
                </div>
              </td>
            </template>
            <template v-else>
              <td data-label="Servidor" class="font-semibold">{{ server.name }}</td>
              <td data-label="DNS" class="text-ink-muted">{{ server.url }}</td>
              <td class="adm-num" data-label="Clientes">{{ formatNumber(server.clientCount) }}</td>
              <td class="whitespace-nowrap text-ink-muted" data-label="Cadastro">{{ formatDateTime(server.createdAt) }}</td>
              <td>
                <div class="flex justify-end gap-1">
                  <NuxtLink :to="{ path: '/admin', query: { server: server.id } }" class="adm-btn adm-btn--sm adm-btn--link">
                    Ver clientes
                  </NuxtLink>
                  <button type="button" class="adm-btn adm-btn--sm" @click="startEdit(server)">
                    <Icon name="material-symbols:edit-rounded" class="h-4 w-4" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    class="adm-btn adm-btn--sm adm-btn--ghost-danger"
                    :disabled="server.clientCount > 0"
                    :title="server.clientCount > 0 ? 'Exclua ou mova os clientes antes' : undefined"
                    :aria-label="`Excluir ${server.name}`"
                    @click="askDelete(server)"
                  >
                    <Icon name="material-symbols:delete-outline-rounded" class="h-4 w-4" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminConfirmDialog
      :open="toDelete !== null"
      title="Excluir servidor?"
      confirm-label="Excluir servidor"
      :pending="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    >
      <p v-if="toDelete">
        <strong class="text-ink">{{ toDelete.name }}</strong> ({{ toDelete.url }}) sai da lista de servidores.
      </p>
    </AdminConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import { formatNumber, formatDateTime } from '~/utils/adminFormat';
import type { RequestStatus, Server } from '~/types';

definePageMeta({ layout: 'admin', middleware: 'admin', adminOnly: true });

useHead({ title: 'Servidores — Painel Pryma' });

const servers = ref<Server[]>([]);
const status = ref<RequestStatus>('pending');
const errorMessage = ref('');
const actionError = ref('');

const subtitle = computed(() => {
  if (status.value !== 'success') return undefined;
  const clients = servers.value.reduce((sum, s) => sum + s.clientCount, 0);
  return `${formatNumber(servers.value.length)} servidores · ${formatNumber(clients)} clientes`;
});

async function load(silent = false): Promise<void> {
  if (!silent) status.value = 'pending';
  try {
    servers.value = (await getRepositories().admin.listServers()).items;
    status.value = 'success';
  } catch (err) {
    if (!silent) {
      errorMessage.value = toApiError(err).message;
      status.value = 'error';
    }
  }
}

onMounted(() => load());

// ── Novo servidor.
const showForm = ref(false);
const creating = ref(false);
const formError = ref('');
const form = reactive({ name: '', url: '' });
const nameInput = ref<HTMLInputElement | null>(null);

async function toggleForm(): Promise<void> {
  showForm.value = !showForm.value;
  formError.value = '';
  if (showForm.value) {
    await nextTick();
    nameInput.value?.focus();
  }
}

async function createServer(): Promise<void> {
  creating.value = true;
  formError.value = '';
  try {
    await getRepositories().admin.createServer({ name: form.name.trim(), url: form.url.trim() });
    form.name = '';
    form.url = '';
    showForm.value = false;
    await load(true);
  } catch (err) {
    formError.value = toApiError(err).message;
  } finally {
    creating.value = false;
  }
}

// ── Editar (nome e DNS — os clientes acompanham a troca de DNS).
const editingId = ref<string | null>(null);
const edit = reactive({ name: '', url: '' });
const saving = ref(false);
const editInput = ref<HTMLInputElement[]>([]);

async function startEdit(server: Server): Promise<void> {
  editingId.value = server.id;
  edit.name = server.name;
  edit.url = server.url;
  actionError.value = '';
  await nextTick();
  editInput.value[0]?.focus();
}

async function saveEdit(server: Server): Promise<void> {
  saving.value = true;
  actionError.value = '';
  try {
    const updated = await getRepositories().admin.updateServer(server.id, {
      name: edit.name.trim(),
      url: edit.url.trim(),
    });
    Object.assign(server, updated);
    editingId.value = null;
  } catch (err) {
    actionError.value = toApiError(err).message;
  } finally {
    saving.value = false;
  }
}

// ── Excluir (só servidor sem clientes).
const toDelete = ref<Server | null>(null);
const deleting = ref(false);
const deleteError = ref('');

function askDelete(server: Server): void {
  deleteError.value = '';
  toDelete.value = server;
}

async function confirmDelete(): Promise<void> {
  const server = toDelete.value;
  if (!server) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await getRepositories().admin.deleteServer(server.id);
    toDelete.value = null;
    servers.value = servers.value.filter((s) => s.id !== server.id);
  } catch (err) {
    deleteError.value = toApiError(err).message;
  } finally {
    deleting.value = false;
  }
}
</script>
