import { defineComponent, ref } from 'vue';
import openingSrc from '~/assets/mtv-opening.mp4';

export default defineComponent({
  name: 'MtvOpening',

  emits: {
    /** Abertura terminou (ended ou skip) — o pai avança pra fase de escolha. */
    done: (): boolean => true,
  },

  setup(_props, { emit }) {
    const videoEl = ref<HTMLVideoElement | null>(null);
    const muted = ref(false);

    function finish(): void {
      emit('done');
    }

    function toggleSound(): void {
      muted.value = !muted.value;
      if (videoEl.value) {
        videoEl.value.muted = muted.value;
        if (!muted.value) videoEl.value.play().catch(() => {});
      }
    }

    return { openingSrc, videoEl, muted, finish, toggleSound };
  },
});
