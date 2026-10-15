import { usePreferencesStore } from '~/stores/preferences';

export interface BackgroundOption {
  id: string;
  label: string;
  url: string;
}

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

const modules = import.meta.glob<string>('../assets/backgrounds/*.{gif,jpeg,jpg,png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function labelFor(id: string): string {
  const known = LABELS[id];
  if (known) return known;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

const ambientModule = import.meta.glob<string>('../assets/backgrounds/default-home.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const defaultUrl = Object.values(ambientModule)[0] ?? '';
const AMBIENT_OPTION: BackgroundOption = { id: 'none', label: 'Padrão', url: defaultUrl };

const FILE_OPTIONS: BackgroundOption[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/default-home.svg'))
  .map(([path, url]) => {
    const file = path.split('/').pop() ?? path;
    const id = file.replace(/\.[^.]+$/, '');
    return { id, label: labelFor(id), url };
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const OPTIONS: BackgroundOption[] = [AMBIENT_OPTION, ...FILE_OPTIONS];
const VALID_IDS = new Set(OPTIONS.map((option) => option.id));

export function useBackgrounds() {
  const preferences = usePreferencesStore();
  const options = OPTIONS;

  const selectedId = computed(() => {
    if (!preferences.backgroundHydrated) return AMBIENT_OPTION.id;
    return VALID_IDS.has(preferences.backgroundId) ? preferences.backgroundId : AMBIENT_OPTION.id;
  });

  const selectedUrl = computed(() =>
    OPTIONS.find((option) => option.id === selectedId.value)?.url ?? '',
  );

  function select(id: string): void {
    if (!VALID_IDS.has(id)) return;
    preferences.setBackground(id);
  }

  return { options, selectedId, selectedUrl, select };
}
