import { defineStore } from 'pinia';
import { MAX_RECENT_SEARCHES, STORAGE_KEYS } from '~/constants';
import type { MediaSummary, Wallpaper } from '~/types';

/** Fundo animado escolhido — só o necessário para desenhar sem ir à API. */
export type BackgroundMedia = Pick<Wallpaper, 'id' | 'title' | 'posterUrl' | 'video720Url' | 'video1080Url'>;

interface PreferencesState {
  recentSearches: string[];
  favorites: string[];
  /** Resumo de cada favorito, por id (só os marcados com os dados em mãos). */
  favoriteItems: Record<string, MediaSummary>;
  /** Id do plano de fundo ativo (arquivo em `assets/backgrounds` ou id do wallpaper da API). Vazio até hidratar. */
  backgroundId: string;
  /** Preenchido quando o fundo ativo é um wallpaper animado da API. */
  backgroundMedia: BackgroundMedia | null;
  /** Fundo animado em movimento (desligado = só o pôster). */
  backgroundMotion: boolean;
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

function isBackgroundMedia(value: unknown): value is BackgroundMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as Record<string, unknown>;
  return ['id', 'posterUrl', 'video720Url', 'video1080Url'].every(
    (key) => typeof media[key] === 'string' && media[key],
  );
}

/** Só os campos do resumo — um MediaDetail traria descrição/EPG pro localStorage. */
function toSummary(media: MediaSummary): MediaSummary {
  const { id, title, slug, type, categoryId, categoryName, logoUrl, thumbnailUrl, year, quality, durationSec, isLive, seriesId, season, episode } = media;
  return { id, title, slug, type, categoryId, categoryName, logoUrl, thumbnailUrl, year, quality, durationSec, isLive, seriesId, season, episode };
}

/** Preferências do usuário (buscas recentes e favoritos) — persistidas em localStorage. */
export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    recentSearches: readStorage<string[]>(STORAGE_KEYS.recentSearches, []),
    favorites: readStorage<string[]>(STORAGE_KEYS.favorites, []),
    favoriteItems: readStorage<Record<string, MediaSummary>>(STORAGE_KEYS.favoriteItems, {}),
    // Lido só na hidratação do cliente — SSR nunca tem localStorage e isso
    // evita mismatch de hidratação (e o duplo download da imagem).
    backgroundId: '',
    backgroundMedia: null,
    backgroundMotion: true,
    backgroundHydrated: false,
  }),

  getters: {
    isFavorite: (state) => (mediaId: string) => state.favorites.includes(mediaId),
  },

  actions: {
    /** Relê os favoritos do localStorage — com SSR o estado chega do servidor sem eles. */
    hydrateFavorites() {
      if (import.meta.server) return;
      this.favorites = readStorage<string[]>(STORAGE_KEYS.favorites, []);
      this.favoriteItems = readStorage<Record<string, MediaSummary>>(STORAGE_KEYS.favoriteItems, {});
    },

    /** Carrega o plano de fundo salvo — uma única vez, só no cliente pós-mount. */
    hydrateBackground() {
      if (this.backgroundHydrated || import.meta.server) return;

      const saved = readStorage<string>(STORAGE_KEYS.background, '');
      this.backgroundId = typeof saved === 'string' ? saved : '';
      const media = readStorage<BackgroundMedia | null>(STORAGE_KEYS.backgroundMedia, null);
      this.backgroundMedia = isBackgroundMedia(media) ? media : null;
      this.backgroundMotion = readStorage<boolean>(STORAGE_KEYS.backgroundMotion, true) !== false;
      this.backgroundHydrated = true;
    },

    /** Fundo local (`assets/backgrounds`) ou o Padrão. */
    setBackground(id: string) {
      const normalized = id.trim();
      if (!normalized) return;

      this.backgroundId = normalized;
      this.backgroundMedia = null;
      this.backgroundHydrated = true;
      writeStorage(STORAGE_KEYS.background, normalized);
      writeStorage(STORAGE_KEYS.backgroundMedia, null);
    },

    /** Wallpaper animado da API — guarda as URLs junto para a próxima abertura. */
    setRemoteBackground(wallpaper: Wallpaper) {
      const media: BackgroundMedia = {
        id: wallpaper.id,
        title: wallpaper.title,
        posterUrl: wallpaper.posterUrl,
        video720Url: wallpaper.video720Url,
        video1080Url: wallpaper.video1080Url,
      };
      this.backgroundId = media.id;
      this.backgroundMedia = media;
      this.backgroundHydrated = true;
      writeStorage(STORAGE_KEYS.background, media.id);
      writeStorage(STORAGE_KEYS.backgroundMedia, media);
    },

    setBackgroundMotion(enabled: boolean) {
      this.backgroundMotion = enabled;
      writeStorage(STORAGE_KEYS.backgroundMotion, enabled);
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

    /** `media` guarda o resumo junto — sem ele o favorito não aparece na aba da TV ao vivo. */
    toggleFavorite(mediaId: string, media?: MediaSummary) {
      const removing = this.favorites.includes(mediaId);
      this.favorites = removing
        ? this.favorites.filter((id) => id !== mediaId)
        : [...this.favorites, mediaId];

      if (removing) delete this.favoriteItems[mediaId];
      else if (media) this.favoriteItems[mediaId] = toSummary(media);

      writeStorage(STORAGE_KEYS.favorites, this.favorites);
      writeStorage(STORAGE_KEYS.favoriteItems, this.favoriteItems);
    },
  },
});
