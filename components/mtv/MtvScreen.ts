import { computed, defineComponent, ref } from 'vue';
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
    const phase = ref<MtvPhase>('opening');
    const selected = ref<MtvPlaylist | null>(null);

    const { playlists, isLoading, error, refresh } = useMtvPlaylists();

    const pickerError = computed(() =>
      error.value ? readErrorMessage(error.value, 'Erro ao carregar playlists.') : null,
    );

    function finishOpening(): void {
      phase.value = 'picker';
    }

    function selectPlaylist(playlist: MtvPlaylist): void {
      selected.value = playlist;
      phase.value = 'playing';
    }

    function backToPicker(): void {
      selected.value = null;
      phase.value = 'picker';
    }

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
