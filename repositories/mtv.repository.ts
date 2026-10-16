import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import type { MtvRepository } from '~/repositories/contracts';
import type { MtvClip, MtvPlaylist, Paginated } from '~/types';

/** Lê o primeiro campo string encontrado — o backend real pode usar aliases. */
function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = raw[key];
    if (typeof val === 'string' && val) return val;
  }
  return '';
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = raw[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
  }
  return 0;
}

function mapPlaylist(raw: Record<string, unknown>): MtvPlaylist {
  const id = pickString(raw, 'id', 'playlistId', 'slug');
  return {
    id,
    name: pickString(raw, 'name', 'label', 'title', 'era', 'displayName'),
    description: pickString(raw, 'description', 'subtitle', 'summary', 'tagline'),
    clipCount: pickNumber(raw, 'clipCount', 'clips', 'total', 'count'),
  };
}

function mapClip(raw: Record<string, unknown>): MtvClip {
  const id = pickString(raw, 'id', 'videoId', 'youtubeId', 'ytId', 'yt_id');
  return {
    id,
    title: pickString(raw, 'title', 'name', 'song'),
    artist: pickString(raw, 'artist', 'channel', 'author', 'uploader'),
    playlistId: pickString(raw, 'playlistId', 'playlist'),
    durationSec: pickNumber(raw, 'durationSec', 'duration', 'length'),
    thumbnailUrl:
      pickString(raw, 'thumbnailUrl', 'thumbnail', 'image', 'cover') ||
      (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
  };
}

/** Implementação HTTP do contrato MTV — normaliza o shape real do backend. */
export function createHttpMtvRepository(client: HttpClient): MtvRepository {
  return {
    async listPlaylists(options) {
      const raw = await client.get<unknown>(ENDPOINTS.mtvPlaylists, undefined, options);
      // Aceita tanto { items: [...] } quanto array plano
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { items?: unknown[] })?.items)
          ? ((raw as { items: unknown[] }).items)
          : [];
      return { items: list.map((item) => mapPlaylist(item as Record<string, unknown>)) };
    },

    async listClips(params, options) {
      const raw = await client.get<unknown>(
        ENDPOINTS.mtvClips,
        { playlist: params.playlist, limit: params.limit, cursor: params.cursor },
        options,
      );
      // Aceita Paginated<T> ou array plano
      if (Array.isArray(raw)) {
        return { items: raw.map((item) => mapClip(item as Record<string, unknown>)), nextCursor: null, total: raw.length };
      }
      const paginated = (raw ?? {}) as { items?: unknown[]; nextCursor?: string | null; total?: number };
      const items = Array.isArray(paginated.items) ? paginated.items : [];
      return {
        items: items.map((item) => mapClip(item as Record<string, unknown>)),
        nextCursor: paginated.nextCursor ?? null,
        total: typeof paginated.total === 'number' ? paginated.total : items.length,
      };
    },
  };
}
