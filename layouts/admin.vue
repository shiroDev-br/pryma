<template>
  <!-- data-no-spatial: no painel as setas são do teclado (inputs/selects), não do D-pad. -->
  <div class="admin-shell" data-no-spatial>
    <header class="border-b border-line bg-bg/80 backdrop-blur">
      <div class="admin-header mx-auto flex max-w-[76rem] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3.5">
        <NuxtLink to="/admin" class="flex items-center gap-2.5">
          <img src="/prysma-mark.svg" alt="" width="28" height="28" class="h-7 w-7" />
          <span class="text-[0.95rem] font-bold tracking-[0.2em]">PRYMA</span>
          <span class="rounded-sm border border-line px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Painel
          </span>
        </NuxtLink>

        <nav class="admin-nav flex items-center gap-1" aria-label="Painel">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="admin-nav-link"
            :class="{ 'admin-nav-link--active': isActive(item.to) }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="admin-user ml-auto flex items-center gap-3">
          <div class="text-right leading-tight">
            <p class="text-sm font-semibold">{{ user?.username }}</p>
            <p class="text-[0.7rem] text-ink-muted">{{ roleLabel }}</p>
          </div>
          <button type="button" class="adm-btn adm-btn--sm" @click="logout">
            <Icon name="material-symbols:logout-rounded" class="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </header>

    <main class="admin-main mx-auto max-w-[76rem] px-6 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ADMIN_LOGIN_PATH, isAdmin } from '~/utils/staff';

const auth = useAuth();
const route = useRoute();

const user = auth.user;

const nav = computed(() => [
  { to: '/admin', label: 'Clientes' },
  ...(isAdmin(user.value)
    ? [
        { to: '/admin/revendedores', label: 'Revendedores' },
        { to: '/admin/servidores', label: 'Servidores' },
        { to: '/admin/wallpapers', label: 'Wallpapers' },
      ]
    : []),
]);

const roleLabel = computed(() => (isAdmin(user.value) ? 'Administrador' : 'Revendedor'));

function isActive(to: string): boolean {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to);
}

async function logout(): Promise<void> {
  await auth.logout();
  await navigateTo(ADMIN_LOGIN_PATH);
}
</script>
