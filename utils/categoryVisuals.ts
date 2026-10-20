/**
 * Identidade visual por categoria (arte de fundo + ícone) para a tela de listagem.
 *
 * O catálogo real traz categorias arbitrárias (Netflix, HBO Max, Novelas, "Series - Animes"…),
 * então a resolução é por palavra-chave no slug. Quando nenhuma regra tem arte própria,
 * o card usa um degradê cinematográfico gerado a partir de um matiz (fixo por marca ou
 * derivado do slug) — cada categoria fica com cor própria e nada quebra.
 *
 * Para trocar a arte por imagens reais, aponte `art` para outro arquivo em /public.
 */
export interface CategoryVisual {
  /** Imagem de fundo em /public. `null` = degradê gerado a partir de `hue`. */
  art: string | null;
  /** Ícone (Iconify) do bloco de vidro. */
  icon: string;
  /** Matiz (0–360) do degradê gerado. */
  hue: number;
  /** Esconde o tile do ícone — usado quando a arte já traz o logo da marca. */
  hideIcon?: boolean;
}

interface Rule {
  /** Qualquer uma das palavras presente no slug ativa a regra. */
  match: string[];
  art?: string;
  icon: string;
  hue?: number;
  /** Esconde o tile do ícone no card (arte já contém o logo). */
  hideIcon?: boolean;
}

const art = (name: string) => `/img/categories/${name}.jpg`;
/** Arte vetorial das plataformas — SVG escala para qualquer resolução (4K+). */
const artSvg = (name: string) => `/img/categories/${name}.svg`;
const PLAY = 'material-symbols:play-circle-outline-rounded';

/** Ordem importa: regras mais específicas primeiro. */
const RULES: Rule[] = [
  // Gêneros com arte própria
  { match: ['documentar'], art: art('documentarios'), icon: 'material-symbols:description-outline-rounded' },
  { match: ['infantil', 'kids', 'animacao', 'anime', 'desenho'], art: art('infantil'), icon: 'material-symbols:mood-outline-rounded' },
  { match: ['terror'], art: art('terror'), icon: 'material-symbols:skull-outline' },
  { match: ['thriller', 'suspense'], art: art('suspense'), icon: 'material-symbols:search-rounded' },
  { match: ['romance', 'novela', 'dorama'], art: art('romance'), icon: 'material-symbols:favorite-outline-rounded' },
  { match: ['comedia'], art: art('comedia'), icon: 'material-symbols:sentiment-very-satisfied-outline-rounded' },
  { match: ['acao'], art: art('acao'), icon: 'material-symbols:my-location-outline-rounded' },
  { match: ['faroeste'], art: art('faroeste'), icon: 'mdi:cowboy' },
  { match: ['ficcao'], art: art('ficcao'), icon: 'mdi:planet' },
  { match: ['fantasia'], art: art('fantasia'), icon: 'material-symbols:auto-awesome-outline-rounded' },
  { match: ['familia'], art: art('familia'), icon: 'material-symbols:group-outline' },
  { match: ['aventura'], art: art('aventura'), icon: 'material-symbols:explore-outline-rounded' },
  { match: ['crime'], art: art('crime'), icon: 'mdi:fingerprint' },
  { match: ['misterio'], art: art('misterio'), icon: 'material-symbols:help-outline' },
  { match: ['guerra'], art: art('guerra'), icon: 'material-symbols:military-tech-outline-rounded' },
  { match: ['historia'], art: art('historia'), icon: 'material-symbols:account-balance-outline' },
  { match: ['musica', 'musical', 'show'], art: art('musical'), icon: 'material-symbols:music-note-rounded' },
  { match: ['esporte', 'futebol', 'ppv', 'nba', 'libertadores'], art: art('esportes'), icon: 'material-symbols:sports-soccer' },
  { match: ['noticia'], art: art('noticias'), icon: 'material-symbols:newspaper' },
  { match: ['culinaria'], art: art('culinaria'), icon: 'material-symbols:restaurant-outline-rounded' },
  { match: ['viagem'], art: art('viagem'), icon: 'material-symbols:flight-outline' },
  { match: ['religio', 'gospel'], art: art('religioso'), icon: 'material-symbols:church-outline' },
  { match: ['drama', 'turca', 'classico'], art: art('drama'), icon: 'material-symbols:theater-comedy-outline-rounded' },
  { match: ['cinema'], art: art('cinema'), icon: 'material-symbols:theaters-outline-rounded' },
  { match: ['premium'], art: art('premium'), icon: 'material-symbols:workspace-premium-outline-rounded' },
  { match: ['lancamento'], art: art('lancamento'), icon: 'material-symbols:release-alert-outline-rounded' },
  { match: ['legenda', 'dublad'], art: art('legendado'), icon: 'material-symbols:subtitles-outline-rounded' },
  { match: ['4k', 'uhd'], art: art('quatrok'), icon: 'material-symbols:4k-outline-rounded' },
  {
    match: ['vari', 'diversos', 'brasil-paralelo', 'abertos', 'cine-sky', 'premieres', 'programas', 'reality', 'record', 'sbt', 'filmes-e-series', 'series-24h'],
    art: art('variados'),
    icon: 'material-symbols:bento-outline',
  },

// Plataformas — arte vetorial SVG (escala 4K) na cor da marca; sem tile de ícone
  { match: ['netflix'], art: artSvg('netflix'), icon: PLAY, hue: 355, hideIcon: true },
  { match: ['amazon', 'prime'], art: artSvg('prime-video'), icon: PLAY, hue: 200, hideIcon: true },
  { match: ['hbo'], art: artSvg('hbo-max'), icon: PLAY, hue: 272, hideIcon: true },
  { match: ['disney'], art: artSvg('disney'), icon: PLAY, hue: 222, hideIcon: true },
  { match: ['paramount'], art: artSvg('paramount'), icon: PLAY, hue: 212, hideIcon: true },
  { match: ['globoplay', 'globo'], art: artSvg('globoplay'), icon: PLAY, hue: 18, hideIcon: true },
  { match: ['apple'], art: artSvg('apple-tv'), icon: PLAY, hue: 240, hideIcon: true },
  { match: ['telecine'], art: art('telecine'), icon: PLAY, hue: 340, hideIcon: true },
  { match: ['amc'], art: artSvg('amc'), icon: PLAY, hue: 210, hideIcon: true },
  { match: ['crunchyroll'], art: artSvg('crunchyroll'), icon: PLAY, hue: 30, hideIcon: true },
  { match: ['discovery'], art: art('discovery'), icon: PLAY, hue: 190, hideIcon: true },
  { match: ['pluto'], art: artSvg('pluto'), icon: PLAY, hue: 190, hideIcon: true },
  { match: ['star'], art: artSvg('star'), icon: PLAY, hue: 265, hideIcon: true },
  { match: ['max'], art: artSvg('max'), icon: PLAY, hue: 258, hideIcon: true },

  // Adulto — degradê vermelho com cadeado (conteúdo sensível, sem foto)
  { match: ['adulto', 'xxx'], icon: 'material-symbols:lock-outline', hue: 0 },
];

const DEFAULT_ICON = 'material-symbols:movie-outline-rounded';

function hueFromSlug(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  // Faixa 195–300: azuis/violetas, coerentes com a identidade do app.
  return 195 + (hash % 105);
}

export function getCategoryVisual(slug: string): CategoryVisual {
  const rule = RULES.find((candidate) => candidate.match.some((word) => slug.includes(word)));
  return {
    art: rule?.art ?? null,
    icon: rule?.icon ?? DEFAULT_ICON,
    hue: rule?.hue ?? hueFromSlug(slug),
    hideIcon: rule?.hideIcon,
  };
}

/** Degradê cinematográfico para categorias sem arte própria. */
export function gradientForHue(hue: number): string {
  const h2 = (hue + 38) % 360;
  return [
    `radial-gradient(46% 52% at 82% 22%, hsl(${hue} 78% 52% / 0.8), transparent 72%)`,
    `radial-gradient(60% 70% at 12% 100%, hsl(${h2} 70% 38% / 0.65), transparent 72%)`,
    `radial-gradient(18% 24% at 62% 62%, hsl(${hue} 85% 70% / 0.28), transparent 100%)`,
    `radial-gradient(10% 14% at 90% 78%, hsl(${h2} 85% 72% / 0.3), transparent 100%)`,
    `linear-gradient(160deg, hsl(${hue} 55% 16%) 0%, #03060f 100%)`,
  ].join(', ');
}
