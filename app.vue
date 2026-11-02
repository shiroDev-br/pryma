<template>
  <!-- Sem bg opaco aqui: o canvas (`html`/`body` no main.css) já pinta o preto
       e um `bg-bg` taparia o AppBackground (que fica em z-index negativo). -->
  <div class="min-h-screen flex flex-col text-ink">
    <AppIntro />
    <GlobalLoading />
    <ExitConfirmModal />
    <UpdateModal />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';
import AppIntro from '~/components/global/AppIntro.vue';
import GlobalLoading from '~/components/global/GlobalLoading.vue';
import ExitConfirmModal from '~/components/global/ExitConfirmModal.vue';
import UpdateModal from '~/components/global/UpdateModal.vue';
import { useBackLayer } from '~/composables/useBackLayer';
import { useDoubleBackExit } from '~/composables/useDoubleBackExit';
import { useUpdater } from '~/composables/useUpdater';

// Vinheta de abertura: capa escura ANTES do primeiro paint (senão a página
// aparece por um instante antes do overlay montar). O AppIntro tira a capa.
useHead({
  script: [
    {
      key: 'intro-cover',
      tagPosition: 'head',
      innerHTML:
        "try{if(sessionStorage.getItem('iptv.introShown')!=='1'&&location.pathname.indexOf('/admin')!==0)document.documentElement.classList.add('intro-pending')}catch(e){}",
    },
  ],
});

const router = useRouter();
const { handleBackButton, showExitModal, cancelExit } = useDoubleBackExit();
const { updateModal, closeUpdateModal } = useUpdater();

// Janelas globais: o Voltar do aparelho fecha elas antes de qualquer outra coisa.
useBackLayer(() => updateModal.value !== null, closeUpdateModal);
useBackLayer(() => showExitModal.value, cancelExit);

/** Teclado no navegador (no nativo, o Voltar vem pelo plugin do Capacitor). */
function onBackspace(event: KeyboardEvent): void {
  if (event.key !== 'Backspace' && event.key !== 'BrowserBack') return;
  if (router.currentRoute.value.path !== '/') return;
  event.preventDefault();
  handleBackButton();
}

onMounted(() => {
  if (!Capacitor.isNativePlatform()) window.addEventListener('keydown', onBackspace);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onBackspace);
});
</script>
