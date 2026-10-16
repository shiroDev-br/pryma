export interface UseLiveNavOptions {
  /** Elemento raiz da tela — âncora das queries `[data-nav]`. */
  root: Ref<HTMLElement | null>;
  /** Lista principal (coluna 2) — scroll container e queries de linha. */
  listEl: Ref<HTMLElement | null>;
  /** Id do canal selecionado — alvo inicial e das setas verticais. */
  selectedId: () => string | null;
}

export interface UseLiveNavReturn {
  /** Handler de `keydown` da raiz (setas do teclado / controle remoto). */
  onKeydown: (event: KeyboardEvent) => void;
  /** Linha da lista principal correspondente a um canal. */
  rowFor: (id: string) => HTMLElement | null;
  /** Rola a lista até o topo e foca a primeira linha. */
  focusFirstRow: () => void;
  /** Foco inicial na primeira linha (uma única vez). */
  focusInitialRow: () => void;
}

/**
 * Navegação espacial por setas da tela de canais.
 * Mapeia o DOM por `data-nav` (search|back|sort|tab|row|sidebar|preview),
 * ignora elementos ocultos via `v-show` e consome a seta mesmo sem destino —
 * assim o foco não vaza pro motor espacial global da página.
 */
export function useLiveNav(options: UseLiveNavOptions): UseLiveNavReturn {
  const { root, listEl, selectedId } = options;

  function navList(kind: string): HTMLElement[] {
    const nodes = Array.from(root.value?.querySelectorAll<HTMLElement>(`[data-nav="${kind}"]`) ?? []);
    // Ignora itens ocultos via v-show (display:none), que ficam no DOM mas têm
    // retângulo zero — isso evita que a seta "pule" para um item escondido.
    return nodes.filter((el) => el.getClientRects().length > 0);
  }

  function activeTabEl(): HTMLElement | undefined {
    const list = navList('tab');
    return list.find((element) => element.getAttribute('aria-selected') === 'true') ?? list[0];
  }

  function selectedRowEl(): HTMLElement | undefined {
    const id = selectedId();
    return (id ? (rowFor(id) ?? undefined) : undefined) ?? navList('row')[0];
  }

  function sidebarFor(id: string | undefined): HTMLElement | undefined {
    const list = navList('sidebar');
    return list.find((element) => element.dataset.channelId === id) ?? list[1] ?? list[0];
  }

  function rowFor(id: string): HTMLElement | null {
    return listEl.value?.querySelector<HTMLElement>(`[data-nav="row"][data-channel-id="${id}"]`) ?? null;
  }

  function focusEl(element: HTMLElement | null | undefined): void {
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-nav]');
    const kind = target?.dataset.nav;
    if (!target || !kind) return;

    // Consome a seta mesmo sem destino (borda da lista mantém o foco no lugar).
    // Sem preventDefault o evento vaza pro motor espacial global, que puxa o
    // foco pra outra região — é o "salto pra o meio" ao chegar no fim da sidebar.
    const move = (element: HTMLElement | null | undefined): void => {
      event.preventDefault();
      if (element) focusEl(element);
    };

    const step = (kindName: string, delta: 1 | -1): HTMLElement | undefined => {
      const list = navList(kindName);
      return list[list.indexOf(target) + delta];
    };

    switch (kind) {
      case 'search':
        // Campo de texto: só ↓ sai dele (←→ movem o cursor).
        if (key === 'ArrowDown') move(navList('sidebar')[0]);
        break;

      case 'back':
        if (key === 'ArrowRight') move(navList('sort')[0] ?? activeTabEl());
        else if (key === 'ArrowDown') move(activeTabEl());
        break;

      case 'sidebar':
        // ↓ na última categoria/canal volta pro primeiro (wrap-around).
        if (key === 'ArrowDown') move(step('sidebar', 1) ?? navList('sidebar')[0]);
        else if (key === 'ArrowUp') move(step('sidebar', -1) ?? navList('search')[0]);
        else if (key === 'ArrowRight') move(rowFor(target.dataset.channelId ?? '') ?? selectedRowEl());
        break;

      case 'row':
        if (key === 'ArrowDown') move(step('row', 1));
        else if (key === 'ArrowUp') move(step('row', -1) ?? activeTabEl());
        else if (key === 'ArrowLeft') move(sidebarFor(target.dataset.channelId));
        else if (key === 'ArrowRight') move(navList('preview')[0]);
        break;

      case 'tab':
        if (key === 'ArrowRight') move(step('tab', 1));
        else if (key === 'ArrowLeft') move(step('tab', -1) ?? sidebarFor(selectedId() ?? undefined));
        else if (key === 'ArrowDown') move(selectedRowEl());
        else if (key === 'ArrowUp') move(navList('sort')[0]);
        break;

      case 'sort':
        if (key === 'ArrowDown') move(activeTabEl());
        else if (key === 'ArrowLeft') move(navList('back')[0] ?? navList('search')[0] ?? sidebarFor(undefined));
        break;

      case 'preview':
        if (key === 'ArrowDown') move(step('preview', 1));
        else if (key === 'ArrowUp') move(step('preview', -1));
        else if (key === 'ArrowLeft') move(selectedRowEl());
        break;
    }
  }

  let focusedOnce = false;

  function focusInitialRow(): void {
    if (focusedOnce) return;
    const first = listEl.value?.querySelector<HTMLElement>('[data-nav="row"]');
    if (!first) return;
    focusedOnce = true;
    first.focus({ preventScroll: true });
  }

  /** Clique num atalho da coluna 1: leva a lista até o topo e foca a primeira linha. */
  function focusFirstRow(): void {
    listEl.value?.scrollTo({ top: 0, behavior: 'smooth' });
    focusEl(listEl.value?.querySelector<HTMLElement>('[data-nav="row"]'));
  }

  return { onKeydown, rowFor, focusFirstRow, focusInitialRow };
}
