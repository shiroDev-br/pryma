import { clampLimit } from '~/utils/pagination';
import { createApiError } from '~/utils/errors';
import { simulateLatency } from './latency';
import type { MtvRepository } from '~/repositories/contracts';
import type { MtvClip, MtvPlaylist, Paginated } from '~/types';

/**
 * Mocks do MTV — implementam MtvRepository com dados reais de vídeo.
 * Cursor é base64 de `o:<offset>` — opaco pro cliente (igual ao backend).
 */

const PLAYLISTS: MtvPlaylist[] = [
  {
    id: 'PL_MTV_80S',
    name: 'Anos 80',
    description: 'Synth-pop, new wave e os clipes que fizeram a geração.',
    clipCount: 9,
  },
  {
    id: 'PL_MTV_90S',
    name: 'Anos 90',
    description: 'Grunge, Britpop e o auge da era MTV.',
    clipCount: 6,
  },
  {
    id: 'PL_MTV_2000S',
    name: 'Anos 2000',
    description: 'Pop, R&B e os hits que dominaram o novo milênio.',
    clipCount: 7,
  },
];

function thumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

const CLIPS: Record<string, MtvClip[]> = {
  PL_MTV_80S: [
    { id: 'djV11Xbc914', title: 'Take On Me', artist: 'a-ha', playlistId: 'PL_MTV_80S', durationSec: 226, thumbnailUrl: thumb('djV11Xbc914') },
    { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', playlistId: 'PL_MTV_80S', durationSec: 213, thumbnailUrl: thumb('dQw4w9WgXcQ') },
    { id: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson', playlistId: 'PL_MTV_80S', durationSec: 297, thumbnailUrl: thumb('Zi_XLOBDo_Y') },
    { id: 'qeMFqkcPYcg', title: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', playlistId: 'PL_MTV_80S', durationSec: 216, thumbnailUrl: thumb('qeMFqkcPYcg') },
    { id: 'PIb6AZdTr-A', title: 'Girls Just Want to Have Fun', artist: 'Cyndi Lauper', playlistId: 'PL_MTV_80S', durationSec: 238, thumbnailUrl: thumb('PIb6AZdTr-A') },
    { id: 'lMGaiSqOp58', title: "Livin' on a Prayer", artist: 'Bon Jovi', playlistId: 'PL_MTV_80S', durationSec: 249, thumbnailUrl: thumb('lMGaiSqOp58') },
    { id: 'FTQbiNvZqaY', title: 'Africa', artist: 'Toto', playlistId: 'PL_MTV_80S', durationSec: 295, thumbnailUrl: thumb('FTQbiNvZqaY') },
    { id: 'pIgZ7gMze7A', title: 'Wake Me Up Before You Go-Go', artist: 'Wham!', playlistId: 'PL_MTV_80S', durationSec: 227, thumbnailUrl: thumb('pIgZ7gMze7A') },
    { id: 'OMOGaugKpzs', title: 'Every Breath You Take', artist: 'The Police', playlistId: 'PL_MTV_80S', durationSec: 253, thumbnailUrl: thumb('OMOGaugKpzs') },
  ],
  PL_MTV_90S: [
    { id: 'oZ3J_awTYPI', title: 'Wonderwall', artist: 'Oasis', playlistId: 'PL_MTV_90S', durationSec: 258, thumbnailUrl: thumb('oZ3J_awTYPI') },
    { id: 'gJLIiF15wjQ', title: 'Wannabe', artist: 'Spice Girls', playlistId: 'PL_MTV_90S', durationSec: 173, thumbnailUrl: thumb('gJLIiF15wjQ') },
    { id: 'zFSHPVIfmIY', title: 'Smells Like Teen Spirit', artist: 'Nirvana', playlistId: 'PL_MTV_90S', durationSec: 301, thumbnailUrl: thumb('zFSHPVIfmIY') },
    { id: '4JkIs37a2JE', title: 'Virtual Insanity', artist: 'Jamiroquai', playlistId: 'PL_MTV_90S', durationSec: 227, thumbnailUrl: thumb('4JkIs37a2JE') },
    { id: 'C-u5WLJ9Yk4', title: '...Baby One More Time', artist: 'Britney Spears', playlistId: 'PL_MTV_90S', durationSec: 211, thumbnailUrl: thumb('C-u5WLJ9Yk4') },
    { id: 'oKOtzIo-uYw', title: 'Killing Me Softly with His Song', artist: 'Fugees', playlistId: 'PL_MTV_90S', durationSec: 297, thumbnailUrl: thumb('oKOtzIo-uYw') },
  ],
  PL_MTV_2000S: [
    { id: 'PWgvGjAhvIw', title: 'Hey Ya!', artist: 'OutKast', playlistId: 'PL_MTV_2000S', durationSec: 235, thumbnailUrl: thumb('PWgvGjAhvIw') },
    { id: 'ZtUD3Y7JWzI', title: 'Crazy in Love', artist: 'Beyoncé feat. Jay-Z', playlistId: 'PL_MTV_2000S', durationSec: 236, thumbnailUrl: thumb('ZtUD3Y7JWzI') },
    { id: 'gGdGFtwCNBE', title: 'Mr. Brightside', artist: 'The Killers', playlistId: 'PL_MTV_2000S', durationSec: 228, thumbnailUrl: thumb('gGdGFtwCNBE') },
    { id: 'LOZuxwVk7TU', title: 'Toxic', artist: 'Britney Spears', playlistId: 'PL_MTV_2000S', durationSec: 200, thumbnailUrl: thumb('LOZuxwVk7TU') },
    { id: 'bESGLojNYSo', title: 'Poker Face', artist: 'Lady Gaga', playlistId: 'PL_MTV_2000S', durationSec: 214, thumbnailUrl: thumb('bESGLojNYSo') },
    { id: 'HyHNuVaZJ-k', title: 'Feel Good Inc.', artist: 'Gorillaz', playlistId: 'PL_MTV_2000S', durationSec: 222, thumbnailUrl: thumb('HyHNuVaZJ-k') },
    { id: '4m1EFMoRFvY', title: 'Single Ladies (Put a Ring on It)', artist: 'Beyoncé', playlistId: 'PL_MTV_2000S', durationSec: 196, thumbnailUrl: thumb('4m1EFMoRFvY') },
  ],
};

function encodeCursor(index: number): string {
  return btoa(`o:${index}`);
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const match = /^o:(\d+)$/.exec(atob(cursor));
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

export const mockMtvRepository: MtvRepository = {
  async listPlaylists() {
    await simulateLatency();
    return { items: PLAYLISTS };
  },

  async listClips(params): Promise<Paginated<MtvClip>> {
    await simulateLatency();
    const clips = CLIPS[params.playlist];
    if (!clips) {
      throw createApiError(404, 'not_found', `Playlist "${params.playlist}" não encontrada.`);
    }
    const limit = clampLimit(params.limit);
    const start = decodeCursor(params.cursor);
    const page = clips.slice(start, start + limit);
    const nextStart = start + limit;
    return {
      items: page,
      nextCursor: nextStart < clips.length ? encodeCursor(nextStart) : null,
      total: clips.length,
    };
  },
};
