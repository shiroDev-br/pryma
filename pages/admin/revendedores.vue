<template>
  <div>
    <AdminPageHeader title="Revendedores" :subtitle="subtitle">
      <button type="button" class="adm-btn adm-btn--primary" @click="toggleForm">
        <Icon name="material-symbols:person-add-rounded" class="h-4 w-4" aria-hidden="true" />
        Novo revendedor
      </button>
    </AdminPageHeader>

    <form v-if="showForm" class="adm-card mb-6 flex flex-wrap items-end gap-3 p-5" @submit.prevent="createReseller">
      <label class="block min-w-[16rem] flex-1">
        <span class="adm-label">Usuário de acesso</span>
        <input
          ref="usernameInput"
          v-model="newUsername"
          class="adm-input"
          type="text"
          required
          minlength="3"
          maxlength="32"
          pattern="[a-z0-9][a-z0-9._\-]*"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          placeholder="ex.: revenda.sul"
        />
      </label>
      <button type="submit" class="adm-btn adm-btn--primary" :disabled="creating">
        <Icon v-if="creating" name="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
        {{ creating ? 'Criando…' : 'Criar revendedor' }}
      </button>
      <p class="w-full text-[0.78rem] leading-relaxed text-ink-muted">
        Letras minúsculas, números, ponto, hífen ou sublinhado. A senha é gerada automaticamente.
      </p>
      <p v-if="formError" class="adm-alert adm-alert--error w-full" role="alert">{{ formError }}</p>
    </form>

    <!-- Credenciais do revendedor recém-criado: a senha não pode ser vista de novo. -->
    <div v-if="created" class="adm-alert adm-alert--success mb-6" role="status">
      <p>
        Revendedor <strong>{{ created.reseller.username }}</strong> criado. Copie a senha agora — ela não será
        mostrada de novo.
      </p>
      <div class="adm-secret">
        <span>{{ created.password }}</span>
        <button type="button" class="adm-btn adm-btn--sm" @click="copyPassword">
          <Icon
            :name="copied ? 'material-symbols:check-rounded' : 'material-symbols:content-copy-outline-rounded'"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ copied ? 'Copiada' : 'Copiar' }}
        </button>
      </div>
    </div>

    <div class="adm-card overflow-x-auto">
      <LoadingState v-if="status === 'pending'" class="px-5" message="Carregando revendedores…" />
      <p v-else-if="status === 'error'" class="adm-alert adm-alert--error m-4">{{ errorMessage }}</p>
      <p v-else-if="!resellers.length" class="px-5 py-10 text-center text-sm text-ink-muted">
        Nenhum revendedor cadastrado.
      </p>
      <table v-else class="adm-table adm-table--stack">
        <thead>
          <tr>
            <th>Revendedor</th>
            <th class="adm-num">Clientes</th>
            <th>Desde</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reseller in resellers" :key="reseller.id">
            <td class="font-semibold" data-label="Revendedor">{{ reseller.username }}</td>
            <td class="adm-num" data-label="Clientes">{{ formatNumber(reseller.clientCount) }}</td>
            <td class="whitespace-nowrap text-ink-muted" data-label="Desde">{{ formatDateTime(reseller.createdAt) }}</td>
            <td class="text-right">
              <NuxtLink :to="{ path: '/admin', query: { reseller: reseller.id } }" class="adm-btn adm-btn--sm adm-btn--link">
                Ver clientes
                <Icon name="material-symbols:arrow-forward-rounded" class="h-4 w-4" aria-hidden="true" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRepositories } from '~/repositories';
import { toApiError } from '~/utils/errors';
import { formatNumber, formatDateTime } from '~/utils/adminFormat';
import type { CreatedReseller, RequestStatus, Reseller } from '~/types';

definePageMeta({ layout: 'admin', middleware: 'admin', adminOnly: true });

useHead({ title: 'Revendedores — Painel Pryma' });

const resellers = ref<Reseller[]>([]);
const status = ref<RequestStatus>('pending');
const errorMessage = ref('');

const subtitle = computed(() => {
  if (status.value !== 'success') return undefined;
  const clients = resellers.value.reduce((sum, r) => sum + r.clientCount, 0);
  return `${formatNumber(resellers.value.length)} revendedores · ${formatNumber(clients)} clientes`;
});

async function load(): Promise<void> {
  try {
    resellers.value = (await getRepositories().admin.listResellers()).items;
    status.value = 'success';
  } catch (err) {
    errorMessage.value = toApiError(err).message;
    status.value = 'error';
  }
}

onMounted(load);

// ── Novo revendedor.
const showForm = ref(false);
const newUsername = ref('');
const creating = ref(false);
const formError = ref('');
const created = ref<CreatedReseller | null>(null);
const copied = ref(false);
const usernameInput = ref<HTMLInputElement | null>(null);

async function toggleForm(): Promise<void> {
  showForm.value = !showForm.value;
  formError.value = '';
  if (showForm.value) {
    await nextTick();
    usernameInput.value?.focus();
  }
}

async function createReseller(): Promise<void> {
  creating.value = true;
  formError.value = '';
  copied.value = false;
  try {
    created.value = await getRepositories().admin.createReseller({ username: newUsername.value.trim().toLowerCase() });
    newUsername.value = '';
    showForm.value = false;
    await load();
  } catch (err) {
    formError.value = toApiError(err).message;
  } finally {
    creating.value = false;
  }
}

async function copyPassword(): Promise<void> {
  if (!created.value) return;
  copied.value = await copyText(created.value.password);
}

/**
 * Clipboard API só existe em contexto seguro (https/localhost) — o painel na
 * VPS roda em http puro, então cai no execCommand. Se nada funcionar, a senha
 * continua visível para copiar à mão.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permissão negada — tenta o fallback.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
</script>
