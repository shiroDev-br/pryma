import type { MediaQuality } from '~/types';

/** Posição na lista -> "001", "012", "891". */
export function channelNumber(position: number): string {
  return String(position).padStart(3, '0');
}

const QUALITY_BADGES: Record<MediaQuality, string> = {
  '4K': '4K',
  '1080p': 'FHD',
  '720p': 'HD',
  '480p': 'SD',
};

/** Selo de qualidade do canal (HD, FHD, 4K…). Sem dado: null. */
export function qualityBadge(quality: MediaQuality | null | undefined): string | null {
  return quality ? QUALITY_BADGES[quality] : null;
}

/** "Globo News HD" -> "GN" — fallback quando o canal não tem logo. */
export function channelInitials(title: string): string {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'TV'
  );
}

/** Epoch ms -> "20:22" (fuso do aparelho). */
export function formatHourMinute(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(timestamp),
  );
}

/** ISO 8601 string -> "20:22" (fuso do aparelho). */
export function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(isoString),
  );
}

/* ── Variantes de qualidade (FHD/HD/SD…) do mesmo canal ───────────────────── */

const VARIANT_QUALITY_TOKENS = ['4k', 'fhd', 'hd', 'sd'] as const;
const VARIANT_CODEC_TOKENS = ['h265', 'h.265', 'hevc', 'h264'] as const;
const VARIANT_SUFFIX_TOKENS: readonly string[] = [...VARIANT_QUALITY_TOKENS, ...VARIANT_CODEC_TOKENS];

/**
 * "SPORTV 2 FHD" -> { base: "SPORTV 2", tokens: ["FHD"] }.
 * Remove sufixos de qualidade/codec repetidamente ("X HD H265" -> base "X").
 */
export function splitQualitySuffix(title: string): { base: string; tokens: string[] } {
  let base = title.trim();
  const tokens: string[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    const lower = base.toLowerCase();
    for (const token of VARIANT_SUFFIX_TOKENS) {
      if (lower.endsWith(` ${token}`)) {
        base = base.slice(0, base.length - token.length - 1).trimEnd();
        tokens.push(token.toUpperCase());
        changed = true;
        break;
      }
    }
  }

  return { base, tokens };
}

/** Rótulo da variante: resolução > codec > selo do campo `quality` > SD. */
export function variantLabel(title: string, quality: MediaQuality | null | undefined): string {
  const { tokens } = splitQualitySuffix(title);
  const qualityTokens = new Set(VARIANT_QUALITY_TOKENS.map((token) => token.toUpperCase()));

  const resolution = tokens.find((token) => qualityTokens.has(token));
  if (resolution) return resolution;
  if (tokens[0]) return tokens[0];
  return qualityBadge(quality) ?? 'SD';
}

/** Ordem de exibição das variantes: 4K > FHD > HD > SD > codec/desconhecido. */
export function qualityLabelRank(label: string): number {
  const ranks: Record<string, number> = { '4K': 0, FHD: 1, HD: 2, SD: 3 };
  return ranks[label] ?? 4;
}
