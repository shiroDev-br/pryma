import { computed, defineComponent, onBeforeUnmount, onMounted, ref, type PropType } from 'vue';
import { useYoutubePlayer } from '~/composables/useYoutubePlayer';
import type { YoutubeEntry } from '~/constants/youtube';

const ERROR_MESSAGES: Record<number, string> = {
  2: 'Parâmetro inválido.',
  5: 'O player HTML5 não é compatível.',
  100: 'Vídeo não encontrado ou removido.',
  101: 'O dono do vídeo não permite tocar fora do YouTube.',
  150: 'O dono do vídeo não permite tocar fora do YouTube.',
};

export default defineComponent({
  name: 'YoutubePlayer',

  props: {
    entry: { type: Object as PropType<YoutubeEntry>, required: true },
  },

  emits: {
    back: (): boolean => true,
  },

  setup(props, { emit }) {
    const frameEl = ref<HTMLElement | null>(null);
    const isPlaying = ref(false);
    const loading = ref(true);
    const apiError = ref<string | null>(null);
    const playerError = ref<string | null>(null);
    const videoTitle = ref('');
    const position = ref({ index: 0, total: 0 });
    /** Playlist do YouTube ou vídeo do feed com fila — ambos têm anterior/próximo. */
    const isPlaylist = computed(() => props.entry.kind === 'playlist' || !!props.entry.queue?.length);

    const subtitle = computed(() => {
      if (props.entry.kind === 'playlist') return props.entry.title;
      if (props.entry.queue?.length) return 'Fila de reprodução';
      return props.entry.channel;
    });

    let skipTimer: ReturnType<typeof setTimeout> | null = null;

    /** Título/posição só existem depois que o vídeo carrega — relê a cada troca de estado. */
    function syncMeta(): void {
      videoTitle.value = player.currentTitle();
      position.value = player.playlistPosition();
    }

    const player = useYoutubePlayer({
      onReady: syncMeta,
      onStateChange: (state) => {
        isPlaying.value = state === 1;
        if (state === 1) playerError.value = null;
        syncMeta();
      },
      onError: (code) => {
        playerError.value = ERROR_MESSAGES[code] ?? 'Este vídeo não está disponível.';
        // Playlist: vídeo indisponível (privado/removido/sem embed) → pula pro próximo.
        if (isPlaylist.value) {
          playerError.value += ' Pulando…';
          if (skipTimer) clearTimeout(skipTimer);
          skipTimer = setTimeout(() => {
            playerError.value = null;
            player.next();
          }, 1500);
        }
      },
    });

    async function start(): Promise<void> {
      if (!frameEl.value) return;
      apiError.value = null;
      loading.value = true;
      try {
        const { kind, youtubeId, queue } = props.entry;
        await player.mount(
          frameEl.value,
          kind === 'playlist'
            ? { playlistId: youtubeId }
            : queue?.length
              ? { videoIds: [youtubeId, ...queue] }
              : youtubeId,
        );
      } catch {
        apiError.value = 'Não foi possível carregar o player do YouTube. Verifique sua conexão.';
      } finally {
        loading.value = false;
      }
    }

    function togglePlay(): void {
      if (isPlaying.value) player.pause();
      else player.play();
    }

    /* ── Tela cheia (mesma lógica do player MTV, com fallback webkit) ──── */

    type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

    function fullscreenElement(): Element | null {
      const doc = document as FsDocument;
      return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    }

    let fullscreenOpener: HTMLElement | null = null;

    function onFullscreenChange(): void {
      if (!fullscreenElement() && fullscreenOpener?.isConnected) {
        fullscreenOpener.focus({ preventScroll: true });
        fullscreenOpener = null;
      }
    }

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

    onMounted(() => {
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      // O card que abriu o player fica escondido: sem isto o foco caía no
      // <body> e o OK do controle não fazia nada até apertar uma seta.
      document.querySelector<HTMLElement>('[data-nav="yt-toggle"]')?.focus({ preventScroll: true });
      void start();
    });

    onBeforeUnmount(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      if (skipTimer) clearTimeout(skipTimer);
      player.destroy();
    });

    return {
      emit,
      frameEl,
      player,
      isPlaylist,
      subtitle,
      isPlaying,
      loading,
      apiError,
      playerError,
      videoTitle,
      position,
      start,
      togglePlay,
      toggleFullscreen,
    };
  },
});
