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
import { useDoubleBackExit } from '~/composables/useDoubleBackExit';

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
const { handleBackButton } = useDoubleBackExit();

function handlePopState(event: PopStateEvent): void {
  // No app nativo o voltar é do plugin do Capacitor — aqui, chegar na home pelo
  // "voltar" contava como 1º toque de saída (o 2º já abria a confirmação).
  if (Capacitor.isNativePlatform()) return;
  // If on home page, let double-back handle exit
  if (router.currentRoute.value.path === '/') {
    event.preventDefault();
    handleBackButton();
    return;
  }
  // Otherwise allow normal back navigation
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState);
  
  // Also handle hardware back button (Android TV, etc)
  window.addEventListener('keydown', (e) => {
    // Nativo: o voltar já passa pelo plugin — contar aqui também abriria a confirmação no 1º toque.
    if (Capacitor.isNativePlatform()) return;
    if (e.key === 'Backspace' || e.key === 'BrowserBack' || e.code === 'Backspace') {
      if (router.currentRoute.value.path === '/') {
        e.preventDefault();
        handleBackButton();
      }
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState);
});
</script>
