import { simulateLatency } from './latency';
import type { YoutubeRepository } from '~/repositories/contracts';
import type { YoutubeVideo } from '~/types';

/** Mock do feed — alguns vídeos reais (embed liberado), sem paginação. */
const VIDEOS: YoutubeVideo[] = [
  ['Aeud0QG2wu4', 'Desenhos antigos', 'RÁDIOLOKA 715FM'],
  ['OwPUIkoQ2BU', 'Yogui e Mini Polegar', 'Quatro Artes Animações'],
  ['-96fOdbdgLI', 'Changeman — Episódio 1', 'Urbs Fluminensis'],
  ['2P0NbeULPHU', 'Power Rangers Galáxia Perdida — Ep. 1', 'My Playlists BR'],
  ['QgMcA7jJ2J0', 'Bom Dia & Cia — Abertura', 'Gibis da Ana'],
].map(([videoId, title, channelTitle]) => ({
  videoId,
  title,
  channelTitle,
  thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  durationSec: 600,
  viewCount: 1000,
  publishedAt: '2026-10-01T12:00:00Z',
}));

export const mockYoutubeRepository: YoutubeRepository = {
  async trending() {
    await simulateLatency();
    return { items: VIDEOS, nextCursor: null, total: VIDEOS.length };
  },
  async search(params) {
    await simulateLatency();
    const q = params.q.toLowerCase();
    const items = VIDEOS.filter((video) => video.title.toLowerCase().includes(q));
    return { items, nextCursor: null, total: items.length };
  },
};
