import type { Config } from 'tailwindcss';

/** Alias "~" aponta para a raiz do projeto. */
const root = new URL('.', import.meta.url).pathname;
const src = (p: string) => `${root}${p}`;

/**
 * O Nuxt 3.21 expõe `nuxt.options.pages` como objeto, e o @nuxtjs/tailwindcss
 * (que só trata `true`/`undefined`) deixa de escanear `pages/`. Declarar os
 * globais aqui garante que as utilities usadas nas páginas sejam geradas.
 */
const content: Partial<Config>['content'] = {
  files: [
    src('app.vue'),
    src('error.vue'),
    src('layouts/**/*.{vue,js,ts}'),
    src('pages/**/*.{vue,js,ts}'),
    src('components/**/*.{vue,js,ts}'),
    src('composables/**/*.{js,ts}'),
    src('utils/**/*.{js,ts}'),
    src('plugins/**/*.{js,ts}'),
  ],
};

/** Estende o preset padrão do @nuxtjs/tailwindcss com os tokens preto/dourado. */
export default <Partial<Config>>{
  content,
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-surface-elevated)',
        line: 'var(--color-border)',
        blue: {
          DEFAULT: 'var(--color-blue)',
          light: 'var(--color-blue-light)',
          dark: 'var(--color-blue-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
        },
        ink: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        danger: 'var(--color-danger)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        focus: 'var(--focus-ring)',
        card: '0 12px 32px rgba(0, 0, 0, 0.5)',
        stage: '0 24px 80px rgba(0, 0, 0, 0.65)',
      },
      transitionDuration: {
        fast: '160ms',
        normal: '260ms',
        slow: '420ms',
      },
      transitionTimingFunction: {
        stage: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Avenir Next',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
};
