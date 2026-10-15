import { defineStore } from 'pinia';
import { MAX_RECENT_SEARCHES, STORAGE_KEYS } from '~/constants';

interface PreferencesState {
  recentSearches: string[];
  favorites: string[];
  /** Id do plano de fundo ativo (arquivo em `assets/backgrounds`). Vazio até hidratar. */
  backgroundId: string;
  backgroundHydrated: boolean;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota cheia ou storage indisponível — preferências são descartáveis.
  }
}

/** Preferências do usuário (buscas recentes e favoritos) — persistidas em localStorage. */
export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    recentSearches: readStorage<string[]>(STORAGE_KEYS.recentSearches, []),
    favorites: readStorage<string[]>(STORAGE_KEYS.favorites, []),
    // Lido só na hidratação do cliente — SSR nunca tem localStorage e isso
    // evita mismatch de hidratação (e o duplo download da imagem).
    backgroundId: '',
    backgroundHydrated: false,
  }),

  getters: {
    isFavorite: (state) => (mediaId: string) => state.favorites.includes(mediaId),
  },

  actions: {
    /** Carrega o plano de fundo salvo — uma única vez, só no cliente pós-mount. */
    hydrateBackground() {
      if (this.backgroundHydrated || import.meta.server) return;

      const saved = readStorage<string>(STORAGE_KEYS.background, '');
      this.backgroundId = typeof saved === 'string' ? saved : '';
      this.backgroundHydrated = true;
    },

    setBackground(id: string) {
      const normalized = id.trim();
      if (!normalized) return;

      this.backgroundId = normalized;
      this.backgroundHydrated = true;
      writeStorage(STORAGE_KEYS.background, normalized);
    },

    addRecentSearch(query: string) {
      const normalized = query.trim();
      if (!normalized) return;

      this.recentSearches = [
        normalized,
        ...this.recentSearches.filter((item) => item !== normalized),
      ].slice(0, MAX_RECENT_SEARCHES);

      writeStorage(STORAGE_KEYS.recentSearches, this.recentSearches);
    },

    removeRecentSearch(query: string) {
      this.recentSearches = this.recentSearches.filter((item) => item !== query);
      writeStorage(STORAGE_KEYS.recentSearches, this.recentSearches);
    },

    clearRecentSearches() {
      this.recentSearches = [];
      writeStorage(STORAGE_KEYS.recentSearches, []);
    },

    toggleFavorite(mediaId: string) {
      this.favorites = this.favorites.includes(mediaId)
        ? this.favorites.filter((id) => id !== mediaId)
        : [...this.favorites, mediaId];

      writeStorage(STORAGE_KEYS.favorites, this.favorites);
    },
  },
});
