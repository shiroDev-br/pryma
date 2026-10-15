import { normalizeText, sanitizeSlug } from '~/utils/sanitize';
import type { MediaDetail, MediaQuality, MediaSummary, MediaType, Category } from '~/types';

/** Tamanho do catálogo sintético — espelha a escala real do M3U (300k+). */
export const MOCK_CATALOG_SIZE = 302_417;

const ADDED_AT_BASE = Date.UTC(2026, 0, 1);

const CATEGORY_NAMES = [
  'Ação',
  'Animação',
  'Aventura',
  'Cinema HD',
  'Clássicos',
  'Comédia',
  'Culinária',
  'Documentários',
  'Drama',
  'Esportes',
  'Esportes 24h',
  'Faroeste',
  'Ficção Científica',
  'Filmes Nacionais',
  'Infantil',
  'Infantil Premium',
  'Lançamentos',
  'Música',
  'Musicais',
  'Notícias',
  'Premium',
  'Reality Shows',
  'Religioso',
  'Romance',
  'Séries',
  'Suspense',
  'Terror',
  'Viagem',
];

const BRANDS = [
  'Globo',
  'Band',
  'Canal',
  'Disney',
  'ESPN',
  'Fox',
  'GNT',
  'HBO',
  'Discovery',
  'Max',
  'Multishow',
  'National Geographic',
  'Paramount',
  'Sony',
  'Telecine',
  'Warner',
];

const LIVE_TOPICS = ['News', 'Sports', 'Cinema', 'Series', 'Kids', 'Music', 'Docs', 'Premium', 'Action', 'Comedy'];
const LIVE_SUFFIXES = ['', ' HD', ' HD', ' 4K', ' SD'];

const ADJECTIVES = [
  'Burning',
  'Crimson',
  'Electric',
  'Eternal',
  'Frozen',
  'Golden',
  'Hidden',
  'Iron',
  'Last',
  'Lost',
  'Neon',
  'Northern',
  'Quiet',
  'Rapid',
  'Sacred',
  'Shadow',
  'Silent',
  'Silver',
  'Solar',
  'Stolen',
  'Broken',
  'Cobalt',
  'Distant',
  'Final',
  'Midnight',
  'Velvet',
];

const NOUNS = [
  'Circuit',
  'Empire',
  'Frontier',
  'Harbor',
  'Horizon',
  'Kingdom',
  'Legacy',
  'Mirage',
  'Odyssey',
  'Outpost',
  'Protocol',
  'River',
  'Seal',
  'Signal',
  'Summit',
  'Tide',
  'Trial',
  'Valley',
  'Voyage',
  'Witness',
  'Beacon',
  'Cipher',
  'Dynasty',
  'Echo',
  'Forge',
  'Gambit',
  'Ledger',
  'Reef',
];

const GENRES = [
  'Ação',
  'Aventura',
  'Comédia',
  'Crime',
  'Documentário',
  'Drama',
  'Família',
  'Ficção Científica',
  'Nacional',
  'Policial',
  'Romance',
  'Suspense',
  'Terror',
  'Thriller',
];

const ACTORS = [
  'Ana Martins',
  'Bruno Costa',
  'Camila Rocha',
  'Diego Alves',
  'Elisa Prado',
  'Felipe Nunes',
  'Gabriela Lima',
  'Henrique Melo',
  'Isabela Torres',
  'João Ventura',
  'Karina Dias',
  'Lucas Ferraz',
  'Mariana Reis',
  'Nuno Barros',
  'Olívia Campos',
  'Paulo Tavares',
  'Queila Moraes',
  'Rafael Bittencourt',
];

const DESCRIPTION_TEMPLATES = [
  'Uma história intensa sobre {noun} e as escolhas que mudam tudo. Direção premiada e elenco de peso.',
  'Quando {noun} entra em cena, nenhum plano sai como o esperado. Suspense do começo ao fim.',
  'Narra os eventos em torno de {noun}, com reviravoltas e personagens inesquecíveis.',
];

const QUALITIES: MediaQuality[] = ['4K', '1080p', '1080p', '720p', '720p', '480p'];

/** PRNG determinístico — mesmo índice sempre gera o mesmo item. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** id <-> índice global: mapeamento bijectivo, O(1) nos dois sentidos. */
export function mediaIdAt(index: number): string {
  return `m${index.toString(36)}`;
}

export function parseMediaIndex(id: string): number | null {
  if (!/^m[0-9a-z]+$/.test(id)) return null;
  const index = Number.parseInt(id.slice(1), 36);
  return index >= 0 && index < MOCK_CATALOG_SIZE ? index : null;
}

export function mediaTypeAt(index: number): MediaType {
  // Coletâneas: corridas de 8 itens seguidos são episódios da mesma série
  // (a ingestão real agrupa o padrão SxxEyy do M3U).
  if (index % 100 < 8) return 'series';

  const roll = createRandom(index * 7 + 3)();
  if (roll < 0.1) return 'live';
  return roll < 0.85 ? 'vod' : 'series';
}

/**
 * Derivação mock de coletânea: os8 primeiros índices de cada bloco de 100 são
 * `serie-<bloco>` (S01E01–S01E08). Episódios sorteados fora da corrida formam
 * séries de um episódio (`serie-s-<índice>`).
 */
export function seriesInfoAt(index: number): {
  seriesId: string | null;
  season: number | null;
  episode: number | null;
} {
  if (mediaTypeAt(index) !== 'series') return { seriesId: null, season: null, episode: null };

  const offset = index % 100;
  if (offset < 8) {
    return { seriesId: `serie-${Math.floor(index / 100)}`, season: 1, episode: offset + 1 };
  }
  return { seriesId: `serie-s-${index}`, season: 1, episode: 1 };
}

interface MockMediaFields {
  type: MediaType;
  title: string;
  year: number | null;
  quality: MediaQuality | null;
  durationSec: number | null;
  genres: string[];
  actors: string[];
  description: string;
  streamCount: number;
  categoryIndex: number;
}

function generateFields(index: number): MockMediaFields {
  const random = createRandom(index * 2654435761 + 1);
  const type = mediaTypeAt(index);
  const categoryIndex = index % CATEGORY_NAMES.length;

  if (type === 'live') {
    const title = `${pick(random, BRANDS)} ${pick(random, LIVE_TOPICS)}${pick(random, LIVE_SUFFIXES)}`;
    return {
      type,
      title,
      year: null,
      quality: pick(random, QUALITIES),
      durationSec: null,
      genres: [pick(random, GENRES)],
      actors: [],
      description: '',
      streamCount: 1 + Math.floor(random() * 3),
      categoryIndex,
    };
  }

  const noun = pick(random, NOUNS);
  const baseTitle = `${random() > 0.5 ? 'The ' : ''}${pick(random, ADJECTIVES)} ${noun}`;
  const seriesInfo = seriesInfoAt(index);
  // Título de episódio carrega o token SxxEyy — igual à ingestão real do M3U.
  const title =
    type === 'series' && seriesInfo.season != null && seriesInfo.episode != null
      ? `${baseTitle} S${String(seriesInfo.season).padStart(2, '0')}E${String(seriesInfo.episode).padStart(2, '0')}`
      : baseTitle;
  const year = 1980 + Math.floor(random() * 47);
  const genreCount = 2 + Math.floor(random() * 2);
  const genres = Array.from({ length: genreCount }, () => pick(random, GENRES)).filter(
    (genre, position, all) => all.indexOf(genre) === position,
  );
  const actorCount = 2 + Math.floor(random() * 3);
  const actors = Array.from({ length: actorCount }, () => pick(random, ACTORS)).filter(
    (actor, position, all) => all.indexOf(actor) === position,
  );
  const template = pick(random, DESCRIPTION_TEMPLATES);

  return {
    type,
    title,
    year,
    quality: pick(random, QUALITIES),
    durationSec: type === 'series' ? 1500 + Math.floor(random() * 2700) : 5400 + Math.floor(random() * 7200),
    genres,
    actors,
    description: template.replace('{noun}', noun.toLowerCase()),
    streamCount: 1 + Math.floor(random() * 3),
    categoryIndex,
  };
}

export function generateMediaSummary(index: number): MediaSummary {
  const fields = generateFields(index);
  const id = mediaIdAt(index);
  const seriesInfo = seriesInfoAt(index);

  return {
    id,
    title: fields.title,
    slug: `${sanitizeSlug(fields.title)}-${id}`,
    type: fields.type,
    categoryId: categoryIdAt(fields.categoryIndex),
    categoryName: CATEGORY_NAMES[fields.categoryIndex],
    logoUrl: null,
    thumbnailUrl: `https://picsum.photos/seed/${id}/300/450`,
    year: fields.year,
    quality: fields.quality,
    durationSec: fields.durationSec,
    isLive: fields.type === 'live',
    seriesId: seriesInfo.seriesId,
    season: seriesInfo.season,
    episode: seriesInfo.episode,
  };
}

export function generateMediaDetail(index: number): MediaDetail {
  const fields = generateFields(index);

  return {
    ...generateMediaSummary(index),
    description: fields.description || null,
    genres: fields.genres,
    actors: fields.actors,
    addedAt: new Date(ADDED_AT_BASE - index * 60_000).toISOString(),
    streamCount: fields.streamCount,
    guide: null,
  };
}

/** Haystack normalizado (mesma regra do backend): título + categoria + gêneros + atores. */
export function generateSearchText(index: number): string {
  const fields = generateFields(index);
  return normalizeText(
    `${fields.title} ${CATEGORY_NAMES[fields.categoryIndex]} ${fields.genres.join(' ')} ${fields.actors.join(' ')}`,
  );
}

function categoryIdAt(categoryIndex: number): string {
  return `cat_${sanitizeSlug(CATEGORY_NAMES[categoryIndex])}`;
}

interface MockCategoryRef extends Category {
  /** Posição na sequência de atribuição `index % n` — não confundir com a ordem de exibição. */
  position: number;
}

let rawCategoriesCache: MockCategoryRef[] | null = null;

/** Distribuição exata: item i pertence à categoria (i % n) — contagem sem varrer o catálogo. */
function itemCountFor(categoryIndex: number): number {
  if (categoryIndex >= MOCK_CATALOG_SIZE) return 0;
  return Math.floor((MOCK_CATALOG_SIZE - 1 - categoryIndex) / CATEGORY_NAMES.length) + 1;
}

function getRawCategories(): MockCategoryRef[] {
  if (!rawCategoriesCache) {
    rawCategoriesCache = CATEGORY_NAMES.map((name, position) => ({
      id: categoryIdAt(position),
      name,
      slug: sanitizeSlug(name),
      itemCount: itemCountFor(position),
      position,
    }));
  }
  return rawCategoriesCache;
}

let categoriesCache: Category[] | null = null;

/** Categorias ordenadas por popularidade — para exibição. */
export function getMockCategories(): Category[] {
  if (!categoriesCache) {
    categoriesCache = getRawCategories()
      .map(({ position: _position, ...category }) => category)
      .sort((a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name));
  }
  return categoriesCache;
}

export function findMockCategoryBySlug(slug: string): MockCategoryRef | null {
  return getRawCategories().find((category) => category.slug === slug) ?? null;
}

let searchIndexCache: string[] | null = null;

/**
 * Índice de busca do mock — construído UMA vez, sob demanda, cedendo o event loop.
 * Custo único aceitável só porque é modo dev; em produção a busca é FTS no backend.
 */
export async function getMockSearchIndex(): Promise<string[]> {
  if (searchIndexCache) return searchIndexCache;

  const index: string[] = new Array(MOCK_CATALOG_SIZE);
  for (let i = 0; i < MOCK_CATALOG_SIZE; i += 1) {
    index[i] = generateSearchText(i);
    if (i % 25_000 === 0) await Promise.resolve();
  }

  searchIndexCache = index;
  return index;
}
