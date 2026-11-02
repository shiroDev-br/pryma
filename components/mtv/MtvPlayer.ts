import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';
import { useMtvClips } from '~/composables/useMtvClips';
import { useYoutubePlayer } from '~/composables/useYoutubePlayer';
import type { MtvClip, MtvPlaylist } from '~/types';

/** Fisher-Yates — fila aleatória estável por embaralhada. */
function shuffle<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatDuration(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default defineComponent({
  name: 'MtvPlayer',

  props: {
    playlist: { type: Object as PropType<MtvPlaylist>, required: true },
  },

  emits: {
    /** Usuário quer voltar pro seletor de playlist. */
    back: (): boolean => true,
  },

  setup(props, { emit }) {
    const frameEl = ref<HTMLElement | null>(null);
    const sentinelEl = ref<HTMLElement | null>(null);
    const queue = shallowRef<MtvClip[]>([]);
    const currentIndex = ref(0);
    const isPlaying = ref(false);
    const playerError = ref<string | null>(null);

    const { items, total, error, isPending, isLoading, hasNext, loadMore, refresh } = useMtvClips(
      props.playlist.id,
    );

    const currentClip = computed(() => queue.value[currentIndex.value] ?? null);

    /* ── Player YouTube ────────────────────────────────────────────────── */

    const player = useYoutubePlayer({
      onEnded: () => playNext(),
      onStateChange: (state) => {
        isPlaying.value = state === 1;
      },
      onError: (code) => {
        const errorMessages: Record<number, string> = {
          2: 'Parâmetro inválido.',
          5: 'O player HTML5 não é compatível.',
          100: 'Vídeo não encontrado.',
          101: 'Embed não permitido pelo proprietário.',
          150: 'Embed não permitido pelo proprietário.',
        };
        playerError.value = errorMessages[code] || 'Este clipe não está disponível. Pulando…';
        // Auto-skip após 1.5s se houver próximo
        if (queue.value.length > 1) {
          setTimeout(() => {
            playerError.value = null;
            playNext();
          }, 1500);
        }
      },
      onApiError: (err) => {
        apiReady = false;
        apiError.value = 'Não foi possível carregar o player do YouTube. Verifique sua conexão.';
      },
    });

    let mounted = false;
    const fullscreen = ref(false);
    let apiReady = false;
    let apiError = ref<string | null>(null);
    let iframeObserver: MutationObserver | null = null;

    /** Remove largura/altura hardcodados que o YouTube API injeta no iframe. */
    function forceIframeFullSize(): void {
      const iframe = frameEl.value?.querySelector('iframe');
      if (iframe) {
        iframe.removeAttribute('width');
        iframe.removeAttribute('height');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.display = 'block';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
      }
    }

    function setupIframeObserver(): void {
      if (iframeObserver) iframeObserver.disconnect();
      const iframe = frameEl.value?.querySelector('iframe');
      if (!iframe) return;
      iframeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'width' || mutation.attributeName === 'height')) {
            forceIframeFullSize();
            break;
          }
        }
      });
      iframeObserver.observe(iframe, { attributes: true, attributeFilter: ['width', 'height'] });
    }

    /** Montagem em andamento — troca de clipe nesse meio-tempo só anota o id. */
    let mounting = false;
    let pendingId: string | null = null;

    async function startPlayback(clip: MtvClip | null): Promise<void> {
      if (!clip?.id) return;
      playerError.value = null;
      await nextTick();
      if (mounted) {
        player.load(clip.id);
        // O YouTube pode redefinir width/height ao trocar vídeo
        await nextTick();
        forceIframeFullSize();
        setupIframeObserver();
        return;
      }
      if (mounting) {
        pendingId = clip.id;
        return;
      }
      // Sem o elemento ainda (clipes chegaram antes do mount): o onMounted inicia.
      if (!frameEl.value) return;

      mounting = true;
      pendingId = null;
      apiError.value = null;
      try {
        await player.mount(frameEl.value, clip.id);
        apiReady = true;
        mounted = true;
        await nextTick();
        forceIframeFullSize();
        setupIframeObserver();
        if (pendingId && pendingId !== clip.id) player.load(pendingId);
      } catch {
        apiReady = false;
        apiError.value = 'Não foi possível carregar o player do YouTube.';
      } finally {
        mounting = false;
        pendingId = null;
      }
    }

    /* ── Tela cheia ────────────────────────────────────────────────────── */

    // WebView antiga (Chrome <71) só tem a API com prefixo webkit.
    type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

    function fullscreenElement(): Element | null {
      const doc = document as FsDocument;
      return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    }

    /** Botão que abriu a tela cheia — recebe o foco de volta na saída (D-pad). */
    let fullscreenOpener: HTMLElement | null = null;

    /** O estado vem do documento: sair por Esc/Voltar/botão do YouTube não passa
     *  pelo toggle, e um flag próprio ficava "true" — o próximo OK só saía. */
    function onFullscreenChange(): void {
      fullscreen.value = fullscreenElement() !== null;
      if (!fullscreen.value && fullscreenOpener?.isConnected) {
        fullscreenOpener.focus({ preventScroll: true });
        fullscreenOpener = null;
      }
    }

    /** Alterna tela cheia do iframe YouTube. */
    function toggleFullscreen(event?: Event): void {
      if (fullscreenElement()) {
        const doc = document as FsDocument;
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
        else doc.webkitExitFullscreen?.();
        return;
      }
      const iframe = frameEl.value?.querySelector<FsElement>('iframe');
      if (!iframe) return;
      fullscreenOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
      if (iframe.requestFullscreen) iframe.requestFullscreen().catch(() => {});
      else iframe.webkitRequestFullscreen?.();
    }

    // O card da playlist some ao abrir o player: sem isto o foco caía no
    // <body> e o OK do controle não fazia nada. Os controles só aparecem
    // depois que os clipes chegam — tenta por alguns segundos.
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    function focusToggle(attempt = 0): void {
      focusTimer = null;
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const toggle = document.querySelector<HTMLElement>('[data-nav="toggle"]');
      if (toggle && toggle.getClientRects().length > 0) {
        toggle.focus({ preventScroll: true });
        return;
      }
      if (attempt < 40) focusTimer = setTimeout(() => focusToggle(attempt + 1), 150);
    }

    onMounted(() => {
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      focusToggle();
    });

    onBeforeUnmount(() => {
      if (focusTimer) clearTimeout(focusTimer);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    });

    function playAt(index: number): void {
      if (index < 0 || index >= queue.value.length) return;
      currentIndex.value = index;
      startPlayback(queue.value[index]);
    }

    function playNext(): void {
      if (!queue.value.length) return;
      playAt((currentIndex.value + 1) % queue.value.length);
    }

    function playPrev(): void {
      if (!queue.value.length) return;
      playAt((currentIndex.value - 1 + queue.value.length) % queue.value.length);
    }

    function togglePlay(): void {
      if (isPlaying.value) player.pause();
      else player.play();
    }

    /** Reembaralha a fila mantendo o clipe atual na posição equivalente. */
    function reshuffle(): void {
      const current = currentClip.value;
      queue.value = shuffle(items.value);
      if (current) {
        const found = queue.value.findIndex((clip) => clip.id === current.id);
        currentIndex.value = found >= 0 ? found : 0;
      } else {
        currentIndex.value = 0;
      }
    }

    /* ── Fila reativa aos clipes carregados ────────────────────────────── */

    watch(items, (list) => {
      const playable = list.filter((clip) => !!clip.id);
      if (!playable.length) return;
      if (queue.value.length === 0) {
        // Primeira carga: embaralha e toca o primeiro
        queue.value = shuffle(playable);
        currentIndex.value = 0;
        startPlayback(queue.value[0]);
      } else {
        // Carga incremental: mantém a fila atual, anexa os novos no final
        const known = new Set(queue.value.map((clip) => clip.id));
        const additions = playable.filter((clip) => !known.has(clip.id));
        if (additions.length) queue.value = [...queue.value, ...additions];
      }
    });

    /* ── Infinite scroll da tracklist ──────────────────────────────────── */

    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      // Se itens já chegaram antes do mount (cache), inicia agora
      if (items.value.length && queue.value.length === 0) {
        const playable = items.value.filter((clip) => !!clip.id);
        if (playable.length) {
          queue.value = shuffle(playable);
          currentIndex.value = 0;
        }
      }
      // A fila pode ter sido montada pelo watch antes do frame existir.
      if (queue.value.length) void startPlayback(currentClip.value);
      // Observa sentinela do infinite scroll
      const setupObserver = (el: HTMLElement | null, has: boolean) => {
        observer?.disconnect();
        if (el && has) {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) loadMore();
            },
            { rootMargin: '200px' },
          );
          observer.observe(el);
        }
      };
      setupObserver(sentinelEl.value, hasNext.value);
      watch([sentinelEl, hasNext], ([el, has]) => setupObserver(el, has));
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
      iframeObserver?.disconnect();
      player.destroy();
    });

    return {
      emit,
      frameEl,
      sentinelEl,
      queue,
      currentIndex,
      currentClip,
      isPlaying,
      playerError,
      total,
      error,
      isPending,
      isLoading,
      hasNext,
      refresh,
      playAt,
      playNext,
      playPrev,
      togglePlay,
      reshuffle,
      formatDuration,
      toggleFullscreen,
      startPlayback,
      apiReady: computed(() => player.isApiReady()),
      apiError,
    };
  },
});
