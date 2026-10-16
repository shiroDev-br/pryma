import { defineComponent, type PropType } from 'vue';
import type { MtvPlaylist } from '~/types';

export default defineComponent({
  name: 'MtvPlaylistPicker',

  props: {
    playlists: { type: Array as PropType<MtvPlaylist[]>, required: true },
    loading: { type: Boolean, default: false },
    /** Mensagem de erro legível (null = sem erro). */
    error: { type: String as PropType<string | null>, default: null },
  },

  emits: {
    select: (playlist: MtvPlaylist): boolean => !!playlist,
    retry: (): boolean => true,
  },

  setup(_props, { emit }) {
    /** Rótulo da era — prefere 2000s se houver, senão 1990s→90. */
    function eraLabel(name: string): string {
      // Busca todos os números de 1-4 dígitos
      const matches = name.match(/\d{1,4}/g);
      if (!matches) return name;
      // Converte e filtra anos válidos (1900-2009)
      const years = matches.map((m) => Number(m)).filter((n) => n >= 1900 && n <= 2009);
      if (!years.length) return String(matches[0]);
      // Prefere 2000-2009; caso contrário o maior (ex.: 1990 > 90)
      const pref = years.find((n) => n >= 2000 && n <= 2009);
      const n = pref ?? Math.max(...years);
      if (n >= 1900 && n <= 1999) return String(n % 100); // 1990 → 90
      if (n >= 2000 && n <= 2009) return '2000';
      return String(n);
    }

    return { emit, eraLabel };
  },
});
