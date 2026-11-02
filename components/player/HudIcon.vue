<template>
  <!-- SVG inline de propósito: o HUD aparece sobre o vídeo e não pode depender de
       nada além do próprio bundle (ver `icon.mode` no nuxt.config). -->
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    :fill="icon.solid ? 'currentColor' : 'none'"
    :stroke="icon.solid ? undefined : 'currentColor'"
    :stroke-width="icon.solid ? undefined : icon.weight ?? 2"
    :stroke-linecap="icon.solid ? undefined : 'round'"
    :stroke-linejoin="icon.solid ? undefined : 'round'"
  >
    <path v-for="d in icon.paths" :key="d" :d="d" />
  </svg>
</template>

<script setup lang="ts">
interface HudGlyph {
  paths: string[];
  /** Preenchido (play/pausa) em vez de só contorno. */
  solid?: boolean;
  weight?: number;
}

const GLYPHS = {
  back: { paths: ['M19 12H5M12 19l-7-7 7-7'] },
  check: { paths: ['M20 6 9 17l-5-5'], weight: 2.5 },
  chevronDown: { paths: ['m6 9 6 6 6-6'], weight: 2.5 },
  chevronRight: { paths: ['m9 18 6-6-6-6'] },
  bookmark: { paths: ['M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z'], weight: 1.8 },
  bookmarkFilled: {
    paths: ['M6 3h12a2 2 0 0 1 2 2v17.2a1 1 0 0 1-1.45.9L12 18.1l-6.55 3A1 1 0 0 1 4 20.2V5a2 2 0 0 1 2-2Z'],
    solid: true,
  },
  play: { paths: ['M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z'], solid: true },
  pause: {
    paths: [
      'M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-1A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h1A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z',
    ],
    solid: true,
  },
  rewindBurst: {
    paths: ['M11 6.5v11a1 1 0 0 1-1.6.8l-7.3-5.5a1 1 0 0 1 0-1.6l7.3-5.5a1 1 0 0 1 1.6.8Zm10 0v11a1 1 0 0 1-1.6.8l-7.3-5.5a1 1 0 0 1 0-1.6l7.3-5.5a1 1 0 0 1 1.6.8Z'],
    solid: true,
  },
  forwardBurst: {
    paths: ['M13 6.5v11a1 1 0 0 0 1.6.8l7.3-5.5a1 1 0 0 0 0-1.6l-7.3-5.5a1 1 0 0 0-1.6.8Zm-10 0v11a1 1 0 0 0 1.6.8l7.3-5.5a1 1 0 0 0 0-1.6L4.6 5.7A1 1 0 0 0 3 6.5Z'],
    solid: true,
  },
  replay: { paths: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5'], weight: 1.8 },
  forward: { paths: ['M21 12a9 9 0 1 1-3-6.7', 'M21 4v5h-5'], weight: 1.8 },
  volume: { paths: ['M11 5 6 9H2v6h4l5 4V5Z', 'M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13'], weight: 1.8 },
  muted: { paths: ['M11 5 6 9H2v6h4l5 4V5Z', 'm22 9-6 6m0-6 6 6'], weight: 1.8 },
  captions: { paths: ['M4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5v-9A2.5 2.5 0 0 1 4.5 5Z', 'M10 10.5a2.5 2.5 0 1 0 0 3M17.5 10.5a2.5 2.5 0 1 0 0 3'], weight: 1.8 },
  fill: { paths: ['M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3'] },
  fit: { paths: ['M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3'] },
} satisfies Record<string, HudGlyph>;

export type HudIconName = keyof typeof GLYPHS;

const props = defineProps<{ name: HudIconName }>();

const icon = computed<HudGlyph>(() => GLYPHS[props.name]);
</script>
