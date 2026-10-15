/** Destino visual da navegação principal da home. */
export interface HomeMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  to: string;
  /** Classe de arte usada no card cinematográfico. */
  art: 'live' | 'movies' | 'plans' | 'series' | 'animation';
}

/**
 * A home não deve listar todas as categorias do catálogo.
 * Categorias continuam acessíveis dentro do catálogo; aqui ficam apenas os
 * cinco destinos principais do produto, no mesmo papel visual da referência.
 */
const HOME_ITEMS: HomeMenuItem[] = [
  {
    id: 'live',
    title: 'Canais',
    description: 'Todos os canais em um só lugar.',
    icon: 'material-symbols:grid-view',
    to: '/medias?type=live',
    art: 'live',
  },
  {
    id: 'movies',
    title: 'Filmes',
    description: 'Lançamentos, clássicos e muito mais.',
    icon: 'material-symbols:movie',
    to: '/medias?type=vod',
    art: 'movies',
  },
  {
    id: 'plans',
    title: 'Planos',
    description: 'Escolha o plano ideal para você.',
    icon: 'material-symbols:workspace-premium',
    to: '/pricing',
    art: 'plans',
  },
  {
    id: 'series',
    title: 'Séries',
    description: 'Suas séries favoritas, sempre disponíveis.',
    icon: 'material-symbols:live-tv',
    to: '/medias?type=series',
    art: 'series',
  },
  {
    id: 'animation',
    title: 'Animação',
    description: 'O melhor da animação para todas as idades.',
    icon: 'material-symbols:toys',
    to: '/medias?category=animacao',
    art: 'animation',
  },
];

export interface HomeMenu {
  items: ComputedRef<HomeMenuItem[]>;
  isLoading: ComputedRef<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

export function useHomeMenu(): HomeMenu {
  const items = computed(() => HOME_ITEMS);
  const isLoading = computed(() => false);
  const error = ref<Error | null>(null);

  return {
    items,
    isLoading,
    error,
    refresh: async () => undefined,
  };
}
