import { computed } from 'vue';
import { SECTIONS } from '~/constants';
import type { SectionKey } from '~/constants';

/** Item do menu principal da home — destinos que existem de fato no app. */
export interface HomeMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Rota de destino — ausente = card sem redirecionamento (ainda em construção). */
  to?: string;
  /** Imagem de fundo do card (asset em `public/img/cards/`). */
  image?: string;
  /** Logo em imagem (PNG transparente) — substitui o ícone quando presente. */
  logoUrl?: string;
  /** Contagem exibida como badge — só quando o dado existe. */
  meta?: string;
  /** Texto mais longo mostrado quando o card está em foco (cai em `description` se ausente). */
  longDescription?: string;
  /** Oculta o título — útil para cards só com logo (ex.: MTV). */
  hideTitle?: boolean;
}

/** Cards extras — alguns sem rota por enquanto (entram no carrossel, mas não navegam). */
const EXTRA_ITEMS: HomeMenuItem[] = [
  {
    id: 'mtv',
    title: 'MTV',
    description: 'Clipes e playlists em modo aleatório.',
    icon: 'prysma:mtv',
    logoUrl: '/img/cards/mtv-logo.png',
    to: '/mtv',
    hideTitle: true,
  },
  {
    id: 'musica',
    title: 'Música',
    description: 'Ouvir seus artistas e playlists favoritos.',
    icon: 'material-symbols:music-note-rounded',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Vídeos e canais direto da web.',
    icon: 'logos:youtube',
  },
  {
    id: 'sobre',
    title: 'Sobre',
    description: 'Versão, créditos e informações do app.',
    icon: 'material-symbols:info-outline-rounded',
    to: '/about',
  },
  {
    id: 'cache',
    title: 'Limpeza de cache',
    description: 'Libere espaço limpando dados temporários.',
    longDescription: 'Escolha o que limpar e veja quanto espaço libera no aparelho.',
    icon: 'material-symbols:cleaning-services-outline',
    to: '/cache',
  },
];

/** Card de seção (Filmes/Séries/TV) com rota de destino. */
function sectionItem(key: SectionKey): HomeMenuItem {
  const section = SECTIONS[key];
  return {
    id: key,
    title: section.label,
    description: section.description,
    icon: section.icon,
    image: section.image,
    to: `/browse/${key}`,
  };
}

/** Card extra sem rota — busca por id (ordem definida no carrossel). */
function extraItem(id: string): HomeMenuItem {
  const item = EXTRA_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Card extra da home desconhecido: ${id}`);
  return item;
}

export interface HomeMenu {
  items: ComputedRef<HomeMenuItem[]>;
}

/**
 * Menu da home — oito cards, foco inicial no meio.
 * Ordem (esquerda → direita): Música, YouTube, MTV, Séries, TV ao Vivo, Filmes,
 * Sobre, Limpeza de cache — centro = TV ao Vivo, vizinhos = Séries/Filmes e MTV.
 * Nenhum dado é buscado: a API só é tocada ao abrir uma seção (categorias)
 * e depois ao escolher a categoria (listagem).
 */
export function useHomeMenu(): HomeMenu {
  const items = computed<HomeMenuItem[]>(() => [
    extraItem('musica'),
    extraItem('youtube'),
    extraItem('mtv'),
    sectionItem('series'),
    sectionItem('tv'),
    sectionItem('filmes'),
    extraItem('sobre'),
    extraItem('cache'),
  ]);

  return { items };
}
