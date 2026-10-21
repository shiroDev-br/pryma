import { computed, defineComponent, ref, type PropType } from 'vue';
import type { Category, MediaSummary } from '~/types';
import ChannelGuide from './ChannelGuide.vue';

interface SidebarGroup {
  name: string;
  channels: MediaSummary[];
  slug: string;
}

export default defineComponent({
  name: 'LiveChannelsSidebar',

  components: { ChannelGuide },

  props: {
    /** Canais candidatos da coluna — vindo do pai (listagem + abas especiais, já filtrados). */
    pool: { type: Array as PropType<MediaSummary[]>, required: true },
    /** Categorias TV — pra mapear nome de grupo → slug de aba. */
    categories: { type: Array as PropType<Category[]>, required: true },
    /** Aba/slug ativa (destaque dos grupos). */
    activeSlug: { type: String, required: true },
    /** Rótulo do grupo atual (topo da coluna). */
    label: { type: String, required: true },
    /** Total de canais exibido no topo. */
    count: { type: Number, required: true },
    /** Texto da busca (v-model). */
    query: { type: String, required: true },
    /** Canal selecionado na lista principal (destaque). */
    selectedId: { type: String as PropType<string | null>, default: null },
  },

  emits: {
    'update:query': (_value: string): boolean => true,
    clear: (): boolean => true,
    /** Usuário escolheu um grupo — o pai troca a aba. */
    select: (slug: string): boolean => typeof slug === 'string',
    /** Guia escolheu um canal — o pai seleciona e rola a lista até ele. */
    pick: (channel: MediaSummary): boolean => !!channel,
    /** Botão "grupo atual" — o pai rola a lista principal pro primeiro canal. */
    'focus-first': (): boolean => true,
  },

  setup(props, { emit, expose }) {
    const sideEl = ref<HTMLElement | null>(null);
    const sideSentinel = ref<HTMLElement | null>(null);

    /** Superfície pro pai: rolagem/reset e sentinela do infinite scroll da coluna. */
    function resetScroll(): void {
      sideEl.value?.scrollTo({ top: 0 });
    }

    function revealChannel(id: string): void {
      sideEl.value
        ?.querySelector<HTMLElement>(`[data-channel-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }

    function sentinel(): HTMLElement | null {
      return sideSentinel.value;
    }

    expose({ resetScroll, revealChannel, sentinel });

    const countFormatter = new Intl.NumberFormat('pt-BR');

    /* ── Grupos expansíveis ─────────────────────────────────────────────── */

    const expanded = ref<Set<string>>(new Set());
    const expandedGuides = ref<Set<string>>(new Set());

    /** Mapa nome → slug pra filtrar a lista principal ao clicar no grupo. */
    const slugByName = computed(() => {
      const map = new Map<string, string>();
      for (const category of props.categories) {
        map.set(category.name, category.slug);
      }
      // Canais com slug especial
      map.set('Premiere', '__premiere__');
      map.set('ESPN', '__espn__');
      map.set('SportTV', '__sportv__');
      return map;
    });

    /** Nome do grupo de um canal — separa ESPN e SportTV das demais. */
    function groupFor(channel: MediaSummary): string {
      const title = channel.title.toLowerCase();
      if (title.includes('premiere') || title.includes('premiére')) return 'Premiere';
      if (title.includes('espn')) return 'ESPN';
      if (title.includes('sportv') || title.includes('spor tv')) return 'SportTV';
      return channel.categoryName || 'Outros';
    }

    const PRIORITY = [
      'Premiere', 'ESPN', 'SportTV', 'Aberto', 'Esportes', 'Desenhos 24h', 'Notícias',
      'Variedades', 'Filmes', 'Séries', 'Infantil', 'Documentários', 'Música', 'Religioso', 'Outros',
    ];

    /** Agrupa o pool e ordena por prioridade fixa (o resto em ordem alfabética). */
    const groups = computed<SidebarGroup[]>(() => {
      const map = new Map<string, MediaSummary[]>();

      for (const channel of props.pool) {
        const name = groupFor(channel);
        const existing = map.get(name);
        if (existing) {
          existing.push(channel);
        } else {
          map.set(name, [channel]);
        }
      }

      return [...map.entries()]
        .map(([name, channels]) => ({
          name,
          // Ordem alfabética dentro do grupo (o pool vem em ordem do servidor
          // + abas especiais anexadas no fim — a coluna da esquerda ficava
          // embaralhada enquanto a lista do meio estava em A–Z).
          channels: [...channels].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
          slug: slugByName.value.get(name) ?? '',
        }))
        .sort((a, b) => {
          const idxA = PRIORITY.indexOf(a.name);
          const idxB = PRIORITY.indexOf(b.name);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
    });

    function isExpanded(name: string): boolean {
      return expanded.value.has(name);
    }

    /** Clica no grupo: filtra a lista (evento pro pai) e expande pra mostrar os canais. */
    function selectGroup(group: SidebarGroup): void {
      emit('select', group.slug);
      expanded.value.add(group.name);
    }

    function isGuideExpanded(channelId: string): boolean {
      return expandedGuides.value.has(channelId);
    }

    function toggleGuide(channelId: string): void {
      if (expandedGuides.value.has(channelId)) {
        expandedGuides.value.delete(channelId);
      } else {
        expandedGuides.value.add(channelId);
      }
    }

    function onQueryInput(event: Event): void {
      emit('update:query', (event.target as HTMLInputElement).value);
    }

    return {
      emit,
      sideEl,
      sideSentinel,
      countFormatter,
      groups,
      isExpanded,
      selectGroup,
      isGuideExpanded,
      toggleGuide,
      onQueryInput,
      resetScroll,
      revealChannel,
      sentinel,
    };
  },
});
