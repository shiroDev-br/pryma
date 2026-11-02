import { createKeyRepeatGate } from '~/utils/keyRepeatGate';

export interface UseLiveNavOptions {
  /** Elemento raiz da tela — âncora das queries `[data-nav]`. */
  root: Ref<HTMLElement | null>;
  /** Id do canal selecionado — alvo da seta ← saindo da prévia. */
  selectedId: () => string | null;
  /** Slug do grupo aberto — alvo da seta ← saindo da lista do meio. */
  activeGroup: () => string;
}

export interface UseLiveNavReturn {
  /** Handler de `keydown` da raiz (setas do teclado / controle remoto). */
  onKeydown: (event: KeyboardEvent) => void;
}

/**
 * Navegação espacial por setas da tela de TV ao vivo (3 colunas).
 * Mapeia o DOM por `data-nav` (back|search|sidebar|row|quality|preview),
 * ignora elementos ocultos e consome a seta mesmo sem destino — assim o foco
 * não vaza pro motor espacial global da página.
 *
 *   esquerda:  [← voltar] [busca]   meio:  canais do grupo   direita:  prévia
 *              grupos                                                 [FHD][HD][SD]
 *                                                                     ações · programação
 */
export function useLiveNav(options: UseLiveNavOptions): UseLiveNavReturn {
  const { root, selectedId, activeGroup } = options;
  /** Seta segurada na lista: um passo por quadro, sem fila de teclas. */
  const repeatGate = createKeyRepeatGate();

  function navList(kind: string): HTMLElement[] {
    const nodes = Array.from(root.value?.querySelectorAll<HTMLElement>(`[data-nav="${kind}"]`) ?? []);
    // Itens ocultos (display:none) ficam no DOM sem retângulo — não são destino.
    return nodes.filter((el) => el.getClientRects().length > 0);
  }

  /** Linha do canal selecionado (ou a primeira). */
  function rowFor(id: string | null): HTMLElement | undefined {
    const list = navList('row');
    return (id ? list.find((element) => element.dataset.channelId === id) : undefined) ?? list[0];
  }

  /** Botão do grupo aberto (ou o primeiro da coluna). */
  function groupButton(): HTMLElement | undefined {
    const list = navList('sidebar');
    const slug = activeGroup();
    return list.find((element) => element.dataset.group === slug) ?? list[0];
  }

  /** Versão atual da prévia (ou a primeira). */
  function currentQuality(): HTMLElement | undefined {
    const list = navList('quality');
    return list.find((element) => element.getAttribute('aria-pressed') === 'true') ?? list[0];
  }

  /** Rolagem instantânea — suavidade em chip fraco parece trava. */
  function focusEl(element: HTMLElement | null | undefined): void {
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-nav]');
    const kind = target?.dataset.nav;
    if (!target || !kind) return;

    // Campo de busca: ←→ são do cursor — a trava só vale fora dele.
    if (kind !== 'search' && repeatGate.shouldDrop(event)) {
      event.preventDefault();
      return;
    }

    const move = (element: HTMLElement | null | undefined): void => {
      event.preventDefault();
      if (!element) return;
      focusEl(element);
      repeatGate.mark();
    };

    const step = (kindName: string, delta: 1 | -1): HTMLElement | undefined => {
      const list = navList(kindName);
      return list[list.indexOf(target) + delta];
    };

    /** Coluna do meio, ou a prévia quando o grupo está vazio. */
    const middleOrPreview = (): HTMLElement | undefined => rowFor(selectedId()) ?? navList('preview')[0];

    switch (kind) {
      case 'back':
        if (key === 'ArrowRight') move(navList('search')[0]);
        else if (key === 'ArrowDown') move(navList('sidebar')[0]);
        else move(null);
        break;

      case 'search': {
        // Campo de texto: ←→ movem o cursor, só saem nas pontas.
        const input = target as HTMLInputElement;
        const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
        const atEnd = input.selectionStart === input.value.length;
        if (key === 'ArrowDown') move(navList('sidebar')[0]);
        else if (key === 'ArrowUp') move(navList('back')[0]);
        else if (key === 'ArrowLeft' && atStart) move(navList('back')[0]);
        else if (key === 'ArrowRight' && atEnd) move(middleOrPreview());
        break;
      }

      case 'sidebar':
        // ↓ no último grupo volta pro primeiro (wrap-around).
        if (key === 'ArrowDown') move(step('sidebar', 1) ?? navList('sidebar')[0]);
        else if (key === 'ArrowUp') move(step('sidebar', -1) ?? navList('search')[0]);
        else if (key === 'ArrowRight') move(middleOrPreview());
        else move(null);
        break;

      case 'row':
        if (key === 'ArrowDown') move(step('row', 1));
        else if (key === 'ArrowUp') move(step('row', -1));
        else if (key === 'ArrowLeft') move(groupButton());
        else move(navList('preview')[0]);
        break;

      case 'quality':
        if (key === 'ArrowRight') move(step('quality', 1));
        else if (key === 'ArrowLeft') move(step('quality', -1) ?? middleOrPreview() ?? groupButton());
        else if (key === 'ArrowUp') move(navList('preview')[0]);
        else move(navList('preview')[1]);
        break;

      case 'preview': {
        const index = navList('preview').indexOf(target);
        const quality = currentQuality();
        // As versões ficam entre a prévia (0) e as ações (1).
        // Vizinho na mesma linha (ex.: Assistir ↔ Favoritar) — ←/→ andam entre eles.
        const top = (element: HTMLElement): number => element.getBoundingClientRect().top;
        const sideways = (delta: 1 | -1): HTMLElement | undefined => {
          const next = step('preview', delta);
          if (!next) return undefined;
          return Math.abs(top(next) - top(target)) < 4 ? next : undefined;
        };
        /** ↑/↓ trocam de LINHA (Assistir ↓ ia pro Favoritar, ao lado): na linha
         *  vizinha, o item mais perto na horizontal. */
        const vertical = (delta: 1 | -1): HTMLElement | undefined => {
          const list = navList('preview');
          const own = top(target);
          const others = list.filter((element) => (top(element) - own) * delta > 4);
          if (others.length === 0) return undefined;
          const rowTop = delta > 0
            ? Math.min(...others.map(top))
            : Math.max(...others.map(top));
          const left = target.getBoundingClientRect().left;
          return others
            .filter((element) => Math.abs(top(element) - rowTop) < 4)
            .sort((a, b) => Math.abs(a.getBoundingClientRect().left - left) - Math.abs(b.getBoundingClientRect().left - left))[0];
        };
        const first = navList('preview')[0];
        if (key === 'ArrowDown') move(index === 0 && quality ? quality : vertical(1));
        else if (key === 'ArrowUp') {
          const up = vertical(-1);
          move(up === first && quality ? quality : up);
        }
        else if (key === 'ArrowLeft') move(sideways(-1) ?? rowFor(selectedId()) ?? groupButton());
        else move(sideways(1));
        break;
      }
    }
  }

  return { onKeydown };
}
