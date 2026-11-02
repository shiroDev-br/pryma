import type { Config } from 'tailwindcss';

/** Cor do tema que aceita opacidade: `bg-surface/80` → rgba(var(--color-surface-rgb), 0.8). */
const themeColor = (name: string): string => `rgba(var(--color-${name}-rgb), <alpha-value>)`;

/** Opacidade própria da borda (--color-border no main.css). */
const BORDER_ALPHA = 0.14;

/**
 * A borda já é translúcida: `border-line` continua exatamente --color-border e
 * `border-line/70` vira 70% dessa opacidade (não 70% de branco-azulado opaco).
 */
const lineColor = ({ opacityValue }: { opacityValue?: string }): string => {
  const ratio = Number(opacityValue);
  if (opacityValue === undefined || !Number.isFinite(ratio)) return 'var(--color-border)';
  return `rgba(var(--color-border-rgb), ${+(ratio * BORDER_ALPHA).toFixed(3)})`;
};

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
    /**
     * Breakpoints neutralizados: o app escala via rem (plugin
     * viewport-scale), então TODA tela landscape é o canvas 1440×810 —
     * o mesmo estado do `xl` no notebook. Com sm..xl em 0px as variantes
     * `sm: md: lg: xl:` sempre valem (a última vence) e `2xl:` nunca.
     */
    screens: {
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '99999px',
    },
    extend: {
      // Cores com <alpha-value> (via --*-rgb do main.css): só assim o Tailwind
      // gera as variantes com opacidade (bg-surface/80, border-blue/50…).
      colors: {
        bg: themeColor('bg'),
        surface: themeColor('surface'),
        elevated: themeColor('surface-elevated'),
        // Cor em função é suportada pelo Tailwind 3, mas não pelos tipos dele.
        line: lineColor as unknown as string,
        blue: {
          DEFAULT: themeColor('blue'),
          light: themeColor('blue-light'),
          dark: themeColor('blue-dark'),
        },
        accent: {
          DEFAULT: themeColor('accent'),
          light: themeColor('accent-light'),
        },
        ink: {
          DEFAULT: themeColor('text'),
          muted: themeColor('text-muted'),
        },
        danger: themeColor('danger'),
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
