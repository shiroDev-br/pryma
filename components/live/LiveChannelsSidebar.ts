import { computed, defineComponent, ref, type PropType } from 'vue';
import type { Category } from '~/types';
import { FAVORITES_SLUG, GAMES_SLUG } from '~/utils/live';

interface SidebarGroup {
  name: string;
  slug: string;
  icon: string;
  /** Total real do grupo (API / favoritos guardados); null = ainda não se sabe. */
  total: number | null;
}

/** Métodos expostos pro pai controlar foco e rolagem. */
interface SidebarExposed {
  focusFirst: () => void;
  focusGroup: (slug: string) => boolean;
}

/**
 * Grupos de atalho por nome de canal (Premiere/ESPN/SporTV) — slugs que o pai
 * busca por termo. Só aparecem quando o provedor NÃO tem categoria da marca:
 * com "Canal SporTV" na lista, o atalho "SporTV" duplicava o grupo.
 */
const SPECIAL_GROUPS: { name: string; slug: string; brand: RegExp }[] = [
  { name: 'Premiere', slug: '__premiere__', brand: /premiere/ },
  { name: 'ESPN', slug: '__espn__', brand: /\bespn\b/ },
  { name: 'SporTV', slug: '__sportv__', brand: /spor ?tv|sporttv/ },
];

function normalizeName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ordem dos grupos depois de Favoritos / Todos / Jogos do dia: abertos (Globo,
 * SBT, Band), esportes (ESPN, Premiere, SporTV), 24h — o resto em ordem alfabética.
 * Por palavra no nome (os nomes das categorias vêm do provedor e variam).
 */
const GROUP_ORDER: RegExp[] = [
  /abert/,
  /globo/,
  /\bsbt\b/,
  /\bband\b/,
  /esporte/,
  /\bespn\b/,
  /premiere/,
  /spor ?tv|sporttv/,
  /24 ?h|24 horas/,
];

function groupRank(name: string): number {
  const normalized = normalizeName(name);
  const index = GROUP_ORDER.findIndex((pattern) => pattern.test(normalized));
  return index === -1 ? GROUP_ORDER.length : index;
}

export default defineComponent({
  name: 'LiveChannelsSidebar',

  props: {
    /** Categorias TV — viram os grupos da coluna. */
    categories: { type: Array as PropType<Category[]>, required: true },
    /** Grupo ativo ('' = todos os canais). */
    activeSlug: { type: String, required: true },
    /** Total de canais de "Todos os canais". */
    allCount: { type: Number, required: true },
    /** Quantos favoritos de TV ao vivo existem. */
    favoritesCount: { type: Number, required: true },
    /** Canais com jogo hoje — null até o grupo ser aberto (a busca é pesada). */
    gamesCount: { type: Number as PropType<number | null>, default: null },
    /** Totais dos grupos especiais (Premiere/ESPN/SportTV), por slug. */
    specialTotals: { type: Object as PropType<Record<string, number>>, required: true },
    /** Texto da busca (v-model). */
    query: { type: String, required: true },
  },

  emits: {
    'update:query': (_value: string): boolean => true,
    clear: (): boolean => true,
    /** Usuário abriu um grupo — o pai troca a lista do meio. */
    select: (slug: string): boolean => typeof slug === 'string',
    /** Botão voltar do topo da coluna. */
    back: (): boolean => true,
  },

  setup(props, { emit, expose }) {
    const sideEl = ref<HTMLElement | null>(null);
    const rootEl = ref<HTMLElement | null>(null);

    /** Foco no primeiro item navegável da coluna ("Todos os canais", logo abaixo da busca). */
    function focusFirst(): void {
      rootEl.value?.querySelector<HTMLElement>('[data-nav="sidebar"]')?.focus({ preventScroll: true });
    }

    /** Foco no botão de um grupo (volta do player / ← da lista do meio). */
    function focusGroup(slug: string): boolean {
      const element = rootEl.value?.querySelector<HTMLElement>(`[data-group="${CSS.escape(slug)}"]`);
      if (!element) return false;
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      return true;
    }

    const exposed: SidebarExposed = { focusFirst, focusGroup };
    expose(exposed);

    const countFormatter = new Intl.NumberFormat('pt-BR');

    /** Favoritos, Todos e Jogos do dia fixos no topo; depois abertos, esportes, 24h e o resto (A–Z). */
    const groups = computed<SidebarGroup[]>(() => {
      const names = props.categories.map((category) => normalizeName(category.name));
      const shortcuts = SPECIAL_GROUPS.filter((group) => !names.some((name) => group.brand.test(name)));
      const ranked: SidebarGroup[] = [
        ...shortcuts.map((group) => ({
          name: group.name,
          slug: group.slug,
          icon: 'material-symbols:sports-soccer-rounded',
          total: props.specialTotals[group.slug] ?? 0,
        })),
        ...props.categories.map((category) => ({
          name: category.name,
          slug: category.slug,
          icon: 'material-symbols:live-tv',
          total: category.itemCount,
        })),
      ].sort(
        (a, b) => groupRank(a.name) - groupRank(b.name) || a.name.localeCompare(b.name, 'pt-BR'),
      );

      return [
        { name: 'Favoritos', slug: FAVORITES_SLUG, icon: 'material-symbols:star-rounded', total: props.favoritesCount },
        { name: 'Todos os canais', slug: '', icon: 'material-symbols:tv-gen-outline-rounded', total: props.allCount },
        { name: 'Jogos do dia', slug: GAMES_SLUG, icon: 'material-symbols:scoreboard-outline-rounded', total: props.gamesCount },
        ...ranked,
      ];
    });

    function onQueryInput(event: Event): void {
      emit('update:query', (event.target as HTMLInputElement).value);
    }

    return {
      emit,
      sideEl,
      rootEl,
      countFormatter,
      groups,
      onQueryInput,
      FAVORITES_SLUG,
      // Também no retorno do setup: só assim o pai enxerga os métodos no tipo da instância.
      focusFirst,
      focusGroup,
    };
  },
});
