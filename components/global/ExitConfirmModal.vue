<template>
  <Transition name="exit-modal">
    <div v-if="showExitModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" @click="cancelExit">
      <!-- role/aria-modal: o motor espacial (plugins/spatial-navigation) só navega dentro do modal. -->
      <div
        ref="dialogEl"
        class="bg-surface border border-line rounded-xl p-6 max-w-md w-full mx-4 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        @click.stop
        @keydown="onKeydown"
      >
        <Icon name="material-symbols:exit-to-app-rounded" class="h-12 w-12 mx-auto text-blue-light mb-4" aria-hidden="true" />
        <h2 id="exit-modal-title" class="text-xl font-bold text-ink mb-2">Sair do app?</h2>
        <p class="text-ink-muted mb-6">Tem certeza que deseja fechar o Pryma?</p>
        <div class="flex gap-3 justify-center">
          <button
            ref="cancelEl"
            type="button"
            class="flex-1 h-11 rounded-lg border border-line bg-surface/70 text-ink font-medium transition-colors hover:border-blue-dark hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
            @click="cancelExit"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex-1 h-11 rounded-lg bg-danger text-white font-medium transition-colors hover:bg-red-500 focus:outline-none focus-visible:shadow-focus"
            @click="confirmExit"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useDoubleBackExit } from '~/composables/useDoubleBackExit';

const { showExitModal, confirmExit, cancelExit } = useDoubleBackExit();

const dialogEl = ref<HTMLElement | null>(null);
const cancelEl = ref<HTMLButtonElement | null>(null);
/** Foco antes de abrir — volta pra ele ao cancelar. */
let previousFocus: HTMLElement | null = null;

// Abriu: foco no "Cancelar" (o OK do controle nunca fecha o app por engano).
// Fechou: devolve o foco a quem tinha antes.
watch(showExitModal, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    cancelEl.value?.focus({ preventScroll: true });
  } else {
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
});

/** Prende o foco no modal: Tab circula entre os botões; Esc cancela. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelExit();
    return;
  }
  if (event.key !== 'Tab') return;
  const buttons = Array.from(dialogEl.value?.querySelectorAll<HTMLElement>('button') ?? []);
  if (buttons.length === 0) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement as HTMLElement);
  const delta = event.shiftKey ? -1 : 1;
  buttons[(index + delta + buttons.length) % buttons.length]?.focus();
}
</script>

<style scoped>
.exit-modal-enter-active,
.exit-modal-leave-active {
  transition: opacity 0.2s ease;
}

.exit-modal-enter-from,
.exit-modal-leave-to {
  opacity: 0;
}

.exit-modal-enter-from .bg-surface,
.exit-modal-leave-to .bg-surface {
  transform: scale(0.95);
}
</style>