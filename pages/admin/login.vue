<template>
  <div class="admin-shell flex min-h-screen items-center justify-center px-6 py-12" data-no-spatial>
    <div class="w-full max-w-[26rem]">
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="/prysma-mark.svg" alt="" width="44" height="44" class="h-11 w-11" />
        <p class="text-[1.4rem] font-bold tracking-[0.24em]">PRYMA</p>
        <p class="text-sm text-ink-muted">Painel de revendedores</p>
      </div>

      <form class="adm-card space-y-4 p-7" @submit.prevent="submit">
        <h1 class="text-lg font-bold">Entrar no painel</h1>

        <label class="block">
          <span class="adm-label">Usuário</span>
          <input v-model="username" class="adm-input" type="text" required autocomplete="username" autofocus />
        </label>

        <label class="block">
          <span class="adm-label">Senha</span>
          <input v-model="password" class="adm-input" type="password" required autocomplete="current-password" />
        </label>

        <p v-if="errorMessage" class="adm-alert adm-alert--error" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="adm-btn adm-btn--primary w-full" :disabled="pending">
          <Icon v-if="pending" name="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
          {{ pending ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isStaff } from '~/utils/staff';
import { getAccessToken } from '~/utils/tokenStorage';

// Sem layout: tela cheia própria (o layout `admin` exige sessão).
definePageMeta({ layout: false });

useHead({ title: 'Pryma — Painel' });

const auth = useAuth();
const route = useRoute();

const username = ref('');
const password = ref('');
const pending = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  // Já logado como staff → direto pro painel (sem token nem consulta a API).
  if (!getAccessToken()) return;
  await auth.hydrate();
  if (isStaff(auth.user.value)) await navigateTo(nextPath());
});

function nextPath(): string {
  const next = route.query.next;
  return typeof next === 'string' && next.startsWith('/admin') ? next : '/admin';
}

async function submit(): Promise<void> {
  pending.value = true;
  errorMessage.value = '';
  auth.clearError();

  const ok = await auth.login({ username: username.value.trim(), password: password.value });
  if (!ok) {
    errorMessage.value = auth.error.value?.message ?? 'Não foi possível entrar.';
    pending.value = false;
    return;
  }
  if (!isStaff(auth.user.value)) {
    // Conta de cliente: o painel não é dela — não deixa sessão aberta aqui.
    await auth.logout();
    errorMessage.value = 'Esta conta não tem acesso ao painel.';
    pending.value = false;
    return;
  }
  await navigateTo(nextPath());
}
</script>
