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
    let fullscreen = ref(false);
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

    async function startPlayback(clip: MtvClip): Promise<void> {
      if (!clip?.id) return;
      playerError.value = null;
      await nextTick();
      if (!mounted && frameEl.value) {
        try {
          await player.mount(frameEl.value, clip.id);
          apiReady = true;
          apiError.value = null;
          mounted = true;
          await nextTick();
          forceIframeFullSize();
          setupIframeObserver();
        } catch (err) {
          apiReady = false;
          apiError.value = 'Não foi possível carregar o player do YouTube.';
        }
      } else if (mounted) {
        player.load(clip.id);
        // O YouTube pode redefinir width/height ao trocar vídeo
        await nextTick();
        forceIframeFullSize();
        setupIframeObserver();
      }
    }

    /** Alterna tela cheia do iframe YouTube. */
    function toggleFullscreen(): void {
      const iframe = frameEl.value?.querySelector('iframe');
      if (!iframe) return;
      if (fullscreen.value) {
        document.exitFullscreen().catch(() => {});
        fullscreen.value = false;
      } else {
        iframe.requestFullscreen?.().catch(() => {});
        fullscreen.value = true;
      }
    }

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
          startPlayback(queue.value[0]);
        }
      }
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
