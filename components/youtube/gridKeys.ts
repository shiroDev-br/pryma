import { directionOf } from '~/utils/remoteKeys';

/**
 * ←/→ numa grade de cards: anda pro card vizinho da mesma fileira e, no fim
 * dela, a seta para ali.
 *
 * O motor espacial global não serve aqui: um elemento largo logo acima (campo
 * de busca) conta como "mesma linha" e rouba a seta, e sem vizinho ele cai no
 * cabeçalho fixo (`data-spatial-chrome`) — o foco pulava pro botão Home.
 */
export function stopAtRowEdge(event: KeyboardEvent): void {
  const direction = directionOf(event);
  const step = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  if (!step || event.defaultPrevented) return;
  const grid = event.currentTarget as HTMLElement;
  const current = document.activeElement as HTMLElement | null;
  if (!current || current.parentElement !== grid) return;
  event.preventDefault();
  const cards = Array.from(grid.children) as HTMLElement[];
  const neighbor = cards[cards.indexOf(current) + step];
  // Mesma fileira = mesmo topo (o vizinho no DOM pode já estar na linha seguinte).
  if (!neighbor || Math.abs(neighbor.getBoundingClientRect().top - current.getBoundingClientRect().top) >= 4) return;
  neighbor.focus({ preventScroll: true });
  neighbor.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
}
