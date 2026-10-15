import type { SectionKey } from '~/constants';

/**
 * Classifica uma categoria (slug do `group-title` do M3U) nas seções da home:
 * `filmes` (VOD), `series` ou `tv` (ao vivo).
 *
 * O catálogo vem de uma playlist com `group-title`s arbitrários e sem metadado
 * de tipo, então a resolução é por palavra-chave no slug — mesmo padrão de
 * `categoryVisuals.ts`. Ordem das regras importa: a primeira que casar vence.
 *
 * Objetivo: cada seção só mostra as categorias que fazem sentido nela
 * (Filmes → filmes, Séries → séries, TV → canais ao vivo), com exceção das
 * plataformas de streaming, que têm catálogo misto e aparecem em Filmes e Séries.
 */

const FILMES: readonly SectionKey[] = ['filmes'];
const SERIES: readonly SectionKey[] = ['series'];
const TV: readonly SectionKey[] = ['tv'];

/**
 * Plataformas de streaming (Netflix, Prime, HBO…) — o catálogo delas nesta
 * playlist é de séries, então aparecem só em Séries. Canais de TV que citam a
 * mesma marca (REDE HBO, REDE TELECINE, EVENTOS DISNEY…) NÃO entram aqui: são
 * classificados pelas regras de `tv` abaixo.
 */
const STREAMING_SLUGS = new Set<string>([
  'netflix',
  'hbo-max',
  'amazon-prime-video',
  'disney-plus',
  'paramount-plus',
  'globoplay',
  'apple-tv',
  'amc-plus',
]);

/** Casos pontuais que as palavras-chave não resolvem sozinhas. */
const OVERRIDES = new Map<string, readonly SectionKey[]>([
  ['filmes-e-series', TV], // na verdade são canais ao vivo
  ['series-24h', TV], // grade de canais 24h, não catálogo de séries
  ['amazon-prime', TV], // canal ao vivo (o VOD é `amazon-prime-video`)
  ['disney-hbo-max', TV], // combo de canais, não plataformas sob demanda
  ['xxx-adultos-xxx', TV], // canais adultos ao vivo (o `xxx-adultos` é VOD)
]);

interface Rule {
  /** Qualquer palavra presente no slug ativa a regra. */
  match: string[];
  sections: readonly SectionKey[];
}

/**
 * Ordem importa:
 * 1. `tv` primeiro — canais ao vivo reaproveitam nomes de marca (REDE HBO,
 *    EVENTOS DISNEY, AMAZON PRIME…) e precisam vencer as regras de streaming
 *    e de gênero.
 * 2. Depois o prefixo `series-` e os gêneros de série.
 * 3. Por fim o prefixo `filmes-` e os gêneros de filme.
 */
const RULES: Rule[] = [
  // ── TV ao vivo ────────────────────────────────────────────────────────────
  {
    match: ['24h', 'futebol', 'esporte', 'esportes', 'nba', 'libertadores', 'ppv'],
    sections: TV,
  },
  {
    match: ['rede-', 'canais', 'abertos', 'eventos-', 'premieres', 'cine-sky'],
    sections: TV,
  },
  {
    match: [
      'noticias',
      'musicas',
      'globos',
      'record',
      'sbt',
      'discovery',
      'infantil',
      'variedades',
      'reality',
    ],
    sections: TV,
  },

  // ── Séries ────────────────────────────────────────────────────────────────
  { match: ['series-'], sections: SERIES }, // prefixo "Series - …"
  {
    match: ['novelas', 'dorama', 'turcas', 'legendadas', 'diversos', 'brasil-paralelo'],
    sections: SERIES,
  },

  // ── Filmes ────────────────────────────────────────────────────────────────
  { match: ['filmes-'], sections: FILMES }, // prefixo "Filmes - …"
  {
    match: [
      'lancamento',
      'drama',
      'comedia',
      'romance',
      'documentar',
      'terror',
      'acao',
      'crime',
      'ficcao',
      'aventura',
      'fantasia',
      'familia',
      'animacao',
      'cinema',
      'guerra',
      'faroeste',
      'legendados',
      'adulto',
      'xxx',
      'misterio',
      'musica',
      'historia',
      'thriller',
    ],
    sections: FILMES,
  },
];

/** Seções em que a categoria deve aparecer. */
export function categorySections(slug: string): readonly SectionKey[] {
  const override = OVERRIDES.get(slug);
  if (override) return override;
  if (STREAMING_SLUGS.has(slug)) return SERIES;

  const rule = RULES.find((candidate) => candidate.match.some((word) => slug.includes(word)));
  // Fallback: a maioria do catálogo é VOD, então uma categoria desconhecida
  // aparece em Filmes em vez de sumir (ou vazar para as outras seções).
  return rule?.sections ?? FILMES;
}

/** Se a categoria deve aparecer na seção informada. */
export function categoryBelongsToSection(slug: string, section: SectionKey): boolean {
  return categorySections(slug).includes(section);
}
