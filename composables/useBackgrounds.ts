import { usePreferencesStore } from '~/stores/preferences';
import type { BackgroundMedia } from '~/stores/preferences';
import type { Wallpaper } from '~/types';

export interface BackgroundOption {
  /** Id persistido no localStorage — para `'none'` é o fundo padrão do app. */
  id: string;
  label: string;
  /**
   * URL já resolvida (asset público ou arquivo do catálogo de fundos).
   * `''` = sem imagem, usa só o gradiente ambiente do AppBackground.
   */
  url: string;
}

/** Rótulos amigáveis — cobre os arquivos atuais; fallback capitaliza o filename. */
const LABELS: Record<string, string> = {
  atleticom: 'Atlético-MG',
  bahia: 'Bahia',
  barcelona: 'Barcelona',
  corinthians: 'Corinthians',
  cruzeiro: 'Cruzeiro',
  flamengo: 'Flamengo',
  gremio: 'Grêmio',
  inter: 'Inter',
  palmeiras: 'Palmeiras',
  realmadrid: 'Real Madrid',
  santos: 'Santos',
  saopaulo: 'São Paulo',
  vasco: 'Vasco',
};

/**
 * Descobre os planos de fundo em tempo de build. Cada arquivo vira uma URL
 * emitida pelo bundler (nunca base64 no JS) e o download só acontece quando
 * a imagem entra na tela.
 */
const modules = import.meta.glob<string>('../assets/backgrounds/*.{gif,jpeg,jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function labelFor(id: string): string {
  const known = LABELS[id];
  if (known) return known;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Opção fixa — fundo padrão: montanha ao amanhecer (`public/img/mountain.webp`).
 * O AppBackground não a estica na tela inteira: compõe a imagem no canto
 * superior direito, escurecida e dissolvendo no azul-marinho (ver AppBackground).
 */
const AMBIENT_OPTION: BackgroundOption = {
  id: 'none',
  label: 'Padrão',
  url: '/img/mountain.webp',
};

const FILE_OPTIONS: BackgroundOption[] = Object.entries(modules)
  .map(([path, url]) => {
    const file = path.split('/').pop() ?? path;
    const id = file.replace(/\.[^.]+$/, '');
    return { id, label: labelFor(id), url };
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const OPTIONS: BackgroundOption[] = [AMBIENT_OPTION, ...FILE_OPTIONS];

/** Ids válidos — um id salvo cujo arquivo sumiu cai de volta no Padrão. */
const VALID_IDS = new Set(OPTIONS.map((option) => option.id));

/**
 * Catálogo + seleção do plano de fundo.
 *
 * performance: a lista é resolvida uma única vez no build (custo zero por
 * render); a URL ativa é um `computed` — trocar de tema não re-renderiza a
 * lista nem dispara refetch, só troca o `src` de uma `<img>` já existente.
 * O agradecimento vai para a prévia da tela de escolha, que usa
 * `loading="lazy"` e baixa só o que entra na viewport.
 */
export function useBackgrounds() {
  const preferences = usePreferencesStore();

  const options = OPTIONS;

  /** Wallpaper animado ativo (da API) — `null` quando o fundo é local. */
  const selectedMedia = computed<BackgroundMedia | null>(() => {
    if (!preferences.backgroundHydrated) return null;
    const media = preferences.backgroundMedia;
    return media && media.id === preferences.backgroundId ? media : null;
  });

  const selectedId = computed(() => {
    if (!preferences.backgroundHydrated) return AMBIENT_OPTION.id;
    if (selectedMedia.value) return selectedMedia.value.id;
    return VALID_IDS.has(preferences.backgroundId)
      ? preferences.backgroundId
      : AMBIENT_OPTION.id;
  });

  /** Imagem do fundo: arquivo local ou o pôster (1º quadro) do wallpaper animado. */
  const selectedUrl = computed(() => {
    if (selectedMedia.value) return selectedMedia.value.posterUrl;
    const id = selectedId.value;
    if (!id) return '';
    return OPTIONS.find((option) => option.id === id)?.url ?? '';
  });

  function select(id: string): void {
    if (!VALID_IDS.has(id)) return;
    preferences.setBackground(id);
  }

  function selectRemote(wallpaper: Wallpaper): void {
    preferences.setRemoteBackground(wallpaper);
  }

  /** Arquivo do wallpaper sumiu (excluído no painel): volta ao Padrão. */
  function resetMissing(): void {
    if (selectedMedia.value) preferences.setBackground(AMBIENT_OPTION.id);
  }

  return { options, selectedId, selectedUrl, selectedMedia, select, selectRemote, resetMissing };
}
