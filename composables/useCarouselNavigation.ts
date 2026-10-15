import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export interface CarouselNavigationOptions {
  /** Quantidade total de itens — monitorada para manter o índice válido. */
  count: MaybeRefOrGetter<number>;
  initialIndex?: number;
  /** Ao ultrapassar as bordas, volta ao outro extremo (padrão: trava nas pontas). */
  wrap?: boolean;
  onChange?: (index: number) => void;
}

export interface CarouselNavigation {
  activeIndex: Readonly<Ref<number>>;
  isFirst: Readonly<Ref<boolean>>;
  isLast: Readonly<Ref<boolean>>;
  next: () => void;
  prev: () => void;
  select: (index: number) => void;
  /** Handler de keydown pronto para bind (←/→, Home/End). Enter é responsabilidade do chamador. */
  onKeydown: (event: KeyboardEvent) => void;
}

/**
 * Navegação de carrossel horizontal por índice.
 * Encapsula seleção, limites e teclado; os componentes cuidam só da apresentação.
 */
export function useCarouselNavigation(options: CarouselNavigationOptions): CarouselNavigation {
  const { count, initialIndex = 0, wrap = false, onChange } = options;

  const activeIndex = ref(Math.max(0, initialIndex));

  const clamp = (value: number): number => {
    const total = toValue(count);
    if (total <= 0) return 0;
    return Math.min(Math.max(value, 0), total - 1);
  };

  watch(
    () => toValue(count),
    (total) => {
      if (total === 0) {
        if (activeIndex.value !== 0) {
          activeIndex.value = 0;
          onChange?.(0);
        }
        return;
      }
      const clamped = clamp(activeIndex.value);
      if (clamped !== activeIndex.value) {
        activeIndex.value = clamped;
        onChange?.(clamped);
      }
    },
  );

  function select(index: number): void {
    const total = toValue(count);
    if (total === 0) return;

    let next = index;
    if (wrap) {
      next = ((index % total) + total) % total;
    } else {
      next = clamp(index);
    }

    if (next !== activeIndex.value) {
      activeIndex.value = next;
      onChange?.(next);
    }
  }

  function next(): void {
    select(activeIndex.value + 1);
  }

  function prev(): void {
    select(activeIndex.value - 1);
  }

  function onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        prev();
        break;
      case 'Home':
        event.preventDefault();
        select(0);
        break;
      case 'End':
        event.preventDefault();
        select(toValue(count) - 1);
        break;
    }
  }

  const total = computed(() => toValue(count));
  const isFirst = computed(() => total.value === 0 || activeIndex.value <= 0);
  const isLast = computed(() => total.value === 0 || activeIndex.value >= total.value - 1);

  return {
    activeIndex,
    isFirst,
    isLast,
    next,
    prev,
    select,
    onKeydown,
  };
}
