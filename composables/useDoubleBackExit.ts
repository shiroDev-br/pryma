import { ref, onMounted, onUnmounted } from 'vue';

const showExitModal = ref(false);
let lastBackPress = 0;
const DOUBLE_PRESS_WINDOW = 2000; // 2 seconds

export function useDoubleBackExit() {
  function handleBackButton(): boolean {
    // Voltar com o modal aberto = cancelar (padrão de TV).
    if (showExitModal.value) {
      cancelExit();
      return true;
    }

    const now = Date.now();
    
    if (now - lastBackPress < DOUBLE_PRESS_WINDOW) {
      // Double press detected - show exit modal
      showExitModal.value = true;
      lastBackPress = 0;
      return true; // Handled
    }
    
    lastBackPress = now;
    
    // Show toast/hint for first press
    showExitHint();
    
    // Reset after window expires
    setTimeout(() => {
      if (lastBackPress === now) {
        lastBackPress = 0;
      }
    }, DOUBLE_PRESS_WINDOW);
    
    return true; // Handled (prevents default back navigation)
  }

  function confirmExit(): void {
    // Use Capacitor App plugin if available, otherwise window.close
    if (typeof window !== 'undefined') {
      // @ts-ignore - Capacitor global
      if (window.Capacitor?.Plugins?.App) {
        // @ts-ignore
        window.Capacitor.Plugins.App.exitApp();
      } else if (window.navigator?.app) {
        window.navigator.app.exitApp();
      } else {
        window.close();
      }
    }
  }

  function cancelExit(): void {
    showExitModal.value = false;
    lastBackPress = 0;
  }

  return {
    showExitModal,
    handleBackButton,
    confirmExit,
    cancelExit,
  };
}

// Simple toast/hint for first back press
function showExitHint(): void {
  // Create or update toast element
  let toast = document.getElementById('exit-hint-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'exit-hint-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(2, 8, 23, 0.95);
      border: 1px solid rgba(22, 136, 255, 0.5);
      border-radius: 9999px;
      padding: 0.75rem 1.5rem;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 500;
      z-index: 10000;
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = 'Pressione voltar novamente para sair';
  toast.style.opacity = '1';
  
  setTimeout(() => {
    if (toast) toast.style.opacity = '0';
  }, 1500);
}