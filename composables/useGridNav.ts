/**
 * D-pad em grade de cards (busca, recentes): navegação por linha/coluna.
 *
 * O motor espacial global escolhe pelo retângulo mais perto — numa grade
 * densa isso desce em zigue-zague e, nas bordas, salta pra coisas longe no
 * eixo cruzado (campo de busca, ícones do topo). Aqui:
 *  - ←/→ andam na fileira e PARAM na borda;
 *  - ↓ desce na mesma coluna (fileira final incompleta → último card);
 *  - ↑ sobe na mesma coluna; da primeira fileira, solta pro motor global
 *    (sobe pro campo de busca), assim como ↓ da última (botão "Carregar mais").
 *
 * Uso: `@keydown="onGridKeydown"` no contêiner com os cards `[data-media-card]`.
 * `preventDefault` faz o motor global ignorar a tecla.
 */
export function useGridNav(): { onGridKeydown: (event: KeyboardEvent) => void } {
  function onGridKeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return;

    const grid = event.currentTarget as HTMLElement | null;
    const cards = Array.from(grid?.querySelectorAll<HTMLElement>('[data-media-card]') ?? []);
    const index = cards.indexOf(event.target as HTMLElement);
    if (index < 0) return;

    // Colunas = cards na mesma fileira do primeiro (lido do layout: vale pra
    // qualquer breakpoint sem duplicar o grid-cols do template).
    const firstTop = cards[0].offsetTop;
    let columns = 0;
    while (columns < cards.length && cards[columns].offsetTop === firstTop) columns += 1;
    columns = Math.max(columns, 1);

    const column = index % columns;
    let target: number | null = null;

    if (key === 'ArrowLeft') target = column > 0 ? index - 1 : index;
    else if (key === 'ArrowRight') target = column < columns - 1 && index + 1 < cards.length ? index + 1 : index;
    else if (key === 'ArrowUp') target = index - columns >= 0 ? index - columns : null;
    else {
      const rowStart = index - column;
      if (index + columns < cards.length) target = index + columns;
      else if (rowStart + columns < cards.length) target = cards.length - 1; // última fileira incompleta
    }

    // null = borda vertical: deixa o motor global levar pro que vem antes/depois.
    if (target === null) return;
    event.preventDefault();
    if (target === index) return;

    const card = cards[target];
    card.focus({ preventScroll: true });
    // Primeira fileira: volta ao topo — o que fica acima da grade (campo de
    // busca, voltar) precisa estar na tela pro próximo ↑ achar ele, e não o
    // logo do cabeçalho fixo.
    if (target < columns) window.scrollTo({ top: 0, behavior: 'auto' });
    else revealBetweenBars(card);
  }

  /** Respiro entre o card e o cabeçalho/barra inferior. */
  const BAR_GAP = 12;

  /**
   * Rola só o necessário pro card ficar entre o cabeçalho fixo e a barra
   * inferior (`--header-h`/`--footer-h`, publicados em px pelo viewport-scale).
   * Na mão: scrollIntoView ignora as barras fixas, e `scroll-margin` não existe
   * na WebView antiga da TV — a fileira parava escondida atrás delas.
   */
  function revealBetweenBars(card: HTMLElement): void {
    const style = getComputedStyle(document.documentElement);
    const header = parseFloat(style.getPropertyValue('--header-h')) || 0;
    const footer = parseFloat(style.getPropertyValue('--footer-h')) || 0;
    if (!header && !footer) {
      card.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      return;
    }
    const rect = card.getBoundingClientRect();
    const top = header + BAR_GAP;
    const bottom = window.innerHeight - footer - BAR_GAP;
    if (rect.top < top) window.scrollBy(0, rect.top - top);
    else if (rect.bottom > bottom) window.scrollBy(0, rect.bottom - bottom);
  }

  return { onGridKeydown };
}
