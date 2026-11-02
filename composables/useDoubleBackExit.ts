import { ref } from 'vue';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const showExitModal = ref(false);
let lastBackPress = 0;
/** 2º Voltar dentro desta janela abre a confirmação. */
const DOUBLE_PRESS_WINDOW_MS = 2000;
const HINT_VISIBLE_MS = 1500;

function cancelExit(): void {
  showExitModal.value = false;
  lastBackPress = 0;
}

/** Voltar na home: 1º toque avisa, 2º pergunta. Nunca fecha o app direto. */
function handleBackButton(): void {
  if (showExitModal.value) {
    cancelExit();
    return;
  }

  const now = Date.now();
  if (now - lastBackPress < DOUBLE_PRESS_WINDOW_MS) {
    showExitModal.value = true;
    lastBackPress = 0;
    return;
  }

  lastBackPress = now;
  showExitHint();
}

function confirmExit(): void {
  if (Capacitor.isNativePlatform()) void CapApp.exitApp();
  else window.close();
}

let hintTimer: ReturnType<typeof setTimeout> | undefined;

/** Aviso fora da árvore do Vue: vale em qualquer estado da home e não mexe no foco do controle. */
function showExitHint(): void {
  let toast = document.getElementById('exit-hint-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'exit-hint-toast';
    toast.textContent = 'Pressione voltar novamente para sair';
    document.body.appendChild(toast);
  }

  const element = toast;
  element.style.opacity = '1';
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    element.style.opacity = '0';
  }, HINT_VISIBLE_MS);
}

export function useDoubleBackExit() {
  return { showExitModal, handleBackButton, confirmExit, cancelExit };
}
