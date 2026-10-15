import { defineStore } from 'pinia';
import { getRepositories } from '~/repositories';
import type { MediaDetail } from '~/types';

/**
 * Cache de detalhes de mídia (sinopse, gêneros, elenco).
 *
 * A listagem leve (`MediaSummary`) nunca traz esses campos; cada tela garante
 * sob demanda o que precisa. Ids já resolvidos ou com falha não são
 * rebuscados — navegar pela lista não refaz requests.
 */
export const useMediaDetailsStore = defineStore('mediaDetails', {
  state: () => ({
    details: {} as Record<string, MediaDetail>,
    pending: {} as Record<string, boolean>,
    failed: {} as Record<string, boolean>,
  }),

  getters: {
    find: (state) => (id: string): MediaDetail | null => state.details[id] ?? null,
  },

  actions: {
    async ensure(id: string): Promise<void> {
      if (!id || this.pending[id] || this.details[id] || this.failed[id]) return;

      this.pending[id] = true;
      try {
        const detail = await getRepositories().media.getMedia(id);
        this.details = { ...this.details, [detail.id]: detail };
      } catch {
        // Sem retry automático — a falha evita rebuscar o mesmo id em loop.
        this.failed = { ...this.failed, [id]: true };
      } finally {
        delete this.pending[id];
      }
    },
  },
});
