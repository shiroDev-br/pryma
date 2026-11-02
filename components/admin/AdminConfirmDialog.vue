<template>
  <Teleport to="body">
    <div v-if="open" class="adm-dialog-backdrop" data-no-spatial @click.self="cancel">
      <div
        class="adm-dialog adm-card"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown.esc.prevent="cancel"
      >
        <h2 :id="titleId" class="text-lg font-bold">{{ title }}</h2>
        <div class="mt-2 text-sm leading-relaxed text-ink-muted">
          <slot />
        </div>
        <p v-if="error" class="adm-alert adm-alert--error mt-4" role="alert">{{ error }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button ref="cancelButton" type="button" class="adm-btn" :disabled="pending" @click="cancel">Cancelar</button>
          <button type="button" class="adm-btn adm-btn--danger" :disabled="pending" @click="emit('confirm')">
            <Icon v-if="pending" name="svg-spinners:ring-resize" class="h-4 w-4" aria-hidden="true" />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    confirmLabel?: string;
    pending?: boolean;
    error?: string;
  }>(),
  { confirmLabel: 'Confirmar', pending: false, error: '' },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const titleId = useId();
const cancelButton = ref<HTMLButtonElement | null>(null);

// Ação destrutiva: o foco começa no "Cancelar", nunca no botão perigoso.
watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    cancelButton.value?.focus();
  },
);

function cancel(): void {
  if (!props.pending) emit('cancel');
}
</script>
