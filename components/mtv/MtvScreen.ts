import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { readErrorMessage } from '~/utils/errors';
import { useMtvPlaylists } from '~/composables/useMtvPlaylists';
import type { MtvPlaylist } from '~/types';
import MtvOpening from './MtvOpening.vue';
import MtvPlaylistPicker from './MtvPlaylistPicker.vue';
import MtvPlayer from './MtvPlayer.vue';

type MtvPhase = 'opening' | 'picker' | 'playing';

export default defineComponent({
  name: 'MtvScreen',

  components: { MtvOpening, MtvPlaylistPicker, MtvPlayer },

  setup() {
    const route = useRoute();
    const router = useRouter();

    const { playlists, isLoading, error, refresh } = useMtvPlaylists();

    /**
     * A playlist aberta vive na URL (`?playlist=<id>`): entrar nela empilha uma
     * entrada no histórico, então o Voltar da TV (Capacitor → history.back) e o
     * do navegador caem na lista de playlists, não na home.
     */
    const playlistId = computed(() => {
      const value = route.query.playlist;
      return typeof value === 'string' && value ? value : null;
    });

    /** Playlist escolhida — guardada já no clique, sem esperar a lista carregar. */
    const picked = ref<MtvPlaylist | null>(null);

    const selected = computed<MtvPlaylist | null>(() => {
      const id = playlistId.value;
      if (!id) return null;
      if (picked.value?.id === id) return picked.value;
      return playlists.value.find((playlist) => playlist.id === id) ?? null;
    });

    const openingDone = ref(false);

    const phase = computed<MtvPhase>(() => {
      if (playlistId.value) return 'playing';
      return openingDone.value ? 'picker' : 'opening';
    });

    const pickerError = computed(() =>
      error.value ? readErrorMessage(error.value, 'Erro ao carregar playlists.') : null,
    );

    function finishOpening(): void {
      openingDone.value = true;
    }

    function selectPlaylist(playlist: MtvPlaylist): void {
      picked.value = playlist;
      openingDone.value = true;
      void router.push({ query: { ...route.query, playlist: playlist.id } });
    }

    /** Sai do player pra lista. Veio da lista → volta no histórico; abriu direto → troca a URL. */
    function backToPicker(): void {
      openingDone.value = true;
      if (window.history.state?.back) router.back();
      else void router.replace({ query: { ...route.query, playlist: undefined } });
    }

    /** Esc no teclado: no player, volta pra lista (a tela cheia o navegador fecha sozinho). */
    function onKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (phase.value !== 'playing' || document.fullscreenElement) return;
      event.preventDefault();
      backToPicker();
    }

    onMounted(() => window.addEventListener('keydown', onKeydown));
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

    return {
      phase,
      selected,
      playlists,
      isLoading,
      pickerError,
      refresh,
      finishOpening,
      selectPlaylist,
      backToPicker,
    };
  },
});
