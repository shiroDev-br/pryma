<template>
  <Transition name="update-modal">
    <div
      v-if="updateModal"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
      @click="closeUpdateModal"
    >
      <!-- role/aria-modal: o motor espacial só navega dentro da janela. -->
      <div
        class="mx-4 w-full max-w-lg rounded-xl border border-line bg-surface p-7 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        @click.stop
        @keydown.esc.prevent="closeUpdateModal"
      >
        <Icon name="material-symbols:system-update-rounded" class="mx-auto mb-4 h-12 w-12 text-blue-light" aria-hidden="true" />

        <template v-if="updateModal === 'missing'">
          <h2 id="update-modal-title" class="mb-2 text-xl font-bold text-ink">Instale o app Downloader</h2>
          <p class="text-ink-muted">
            A atualização do Pryma é feita pelo app <strong class="text-ink">Downloader</strong> (gratuito).
            Instale pela loja do aparelho e aperte <strong class="text-ink">Atualizações</strong> de novo.
          </p>
        </template>
        <template v-else>
          <h2 id="update-modal-title" class="mb-2 text-xl font-bold text-ink">Atualizar o Pryma</h2>
          <p class="text-ink-muted">No Downloader, digite este código e aperte <strong class="text-ink">Go</strong>:</p>
        </template>

        <p class="my-5 text-4xl font-bold tracking-[0.18em] text-ink tabular-nums">{{ pending?.code }}</p>

        <div class="flex justify-center">
          <button
            ref="primaryEl"
            type="button"
            class="mr-3 h-11 flex-1 rounded-lg bg-blue-dark font-medium text-white transition-colors hover:bg-blue focus:outline-none focus-visible:shadow-focus"
            @click="updateModal === 'missing' ? openStore() : launchDownloader()"
          >
            {{ updateModal === 'missing' ? 'Abrir loja' : 'Abrir Downloader' }}
          </button>
          <button
            type="button"
            class="h-11 flex-1 rounded-lg border border-line bg-surface/70 font-medium text-ink transition-colors hover:border-blue-dark hover:text-blue-light focus:outline-none focus-visible:shadow-focus"
            @click="closeUpdateModal"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useUpdater } from '~/composables/useUpdater';

const { updateModal, pending, launchDownloader, openStore, closeUpdateModal } = useUpdater();

const primaryEl = ref<HTMLButtonElement | null>(null);
let previousFocus: HTMLElement | null = null;

// Abriu: foco no botão principal. Fechou: devolve o foco ao card da home.
watch(updateModal, async (open, wasOpen) => {
  if (open && !wasOpen) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    primaryEl.value?.focus({ preventScroll: true });
  } else if (!open) {
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
});
</script>

<style scoped>
.update-modal-enter-active,
.update-modal-leave-active {
  transition: opacity 0.2s ease;
}

.update-modal-enter-from,
.update-modal-leave-to {
  opacity: 0;
}
</style>
