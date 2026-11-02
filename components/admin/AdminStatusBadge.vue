<template>
  <span class="status-badge" :class="`status-badge--${status}`" :title="error || undefined">
    <Icon v-if="busy" name="svg-spinners:ring-resize" class="h-3 w-3" aria-hidden="true" />
    <span v-else class="status-dot" aria-hidden="true" />
    {{ LABELS[status] }}
  </span>
</template>

<script setup lang="ts">
import type { PlaylistStatus } from '~/types';

const props = defineProps<{
  status: PlaylistStatus;
  error?: string | null;
}>();

const LABELS: Record<PlaylistStatus, string> = {
  pending: 'Na fila',
  syncing: 'Verificando',
  ready: 'Ativa',
  failed: 'Falhou',
};

const busy = computed(() => props.status === 'pending' || props.status === 'syncing');
</script>
