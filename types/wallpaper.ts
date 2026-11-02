/** Fundo animado convertido pela API — todas as URLs são cacheáveis para sempre. */
export interface Wallpaper {
  id: string;
  title: string;
  categories: string[];
  durationSec: number | null;
  posterUrl: string;
  thumbUrl: string;
  previewUrl: string;
  video720Url: string;
  video1080Url: string;
}

export interface WallpaperCategory {
  name: string;
  count: number;
}

export type WallpaperStatus = 'queued' | 'processing' | 'ready' | 'failed';

/** Painel — linha da fila/catálogo de wallpapers. */
export interface AdminWallpaper {
  id: string;
  title: string;
  source: string;
  sourceSlug: string;
  sourceUrl: string;
  categories: string[];
  status: WallpaperStatus;
  error: string | null;
  hidden: boolean;
  bytes: number;
  durationSec: number | null;
  thumbUrl: string | null;
  createdAt: string;
  readyAt: string | null;
}

export interface AdminWallpaperList {
  items: AdminWallpaper[];
  total: number;
  usedBytes: number;
  maxBytes: number;
}

export interface AdminWallpaperQuery {
  status?: WallpaperStatus;
  limit?: number;
  offset?: number;
}

/** Item da listagem do DesktopHut (origem) — `imported` = já está na nossa fila. */
export interface SourceWallpaper {
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  resolution: string | null;
  downloads: number;
  imported: boolean;
}

export interface SourceWallpaperPage {
  items: SourceWallpaper[];
  page: number;
  hasMore: boolean;
}

export type SourceSort = 'latest' | 'popular';

export interface WallpaperImportItem {
  slug: string;
  title?: string;
  thumbnailUrl?: string | null;
}

export interface WallpaperImportResult {
  queued: number;
  skipped: number;
}
