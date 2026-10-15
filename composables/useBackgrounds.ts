import { usePreferencesStore } from '~/stores/preferences';

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
  gremio: 'Grêmio',
  inter: 'Inter',
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
 * Opção fixa — fundo padrão: montanha ao amanhecer (`public/img/mountain.jpg`).
 * O AppBackground não a estica na tela inteira: compõe a imagem no canto
 * superior direito, escurecida e dissolvendo no azul-marinho (ver AppBackground).
 */
const AMBIENT_OPTION: BackgroundOption = {
  id: 'none',
  label: 'Padrão',
  url: '/img/mountain.jpg',
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

  const selectedId = computed(() => {
    if (!preferences.backgroundHydrated) return AMBIENT_OPTION.id;
    return VALID_IDS.has(preferences.backgroundId)
      ? preferences.backgroundId
      : AMBIENT_OPTION.id;
  });

  const selectedUrl = computed(() => {
    const id = selectedId.value;
    if (!id) return '';
    return OPTIONS.find((option) => option.id === id)?.url ?? '';
  });

  function select(id: string): void {
    if (!VALID_IDS.has(id)) return;
    preferences.setBackground(id);
  }

  return { options, selectedId, selectedUrl, select };
}
