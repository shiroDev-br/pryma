/**
 * Geometria de navegação espacial (D-pad: setas do remote/teclado).
 *
 * Compartilhada pelo motor global (`plugins/spatial-navigation.client.ts`)
 * e por regiões com lógica própria (trilho de categorias), para o algoritmo
 * de "vizinho na direção" ser idêntico em todas as telas.
 */

export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export const SPATIAL_VECTORS: Record<SpatialDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Folga no eixo cruzado para contar como "mesma fileira/coluna" (alturas diferentes). */
const ALIGN_GAP = 32;

/** Retângulo mínimo — `DOMRect` satisfaz estruturalmente. */
export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SpatialCandidate {
  element: HTMLElement;
  rect: RectLike;
}

/** Retângulo zero centrado num ponto — usado como origem na primeira seta. */
export function rectFromPoint(x: number, y: number): RectLike {
  return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 };
}

/**
 * Melhor candidato na direção pressionada.
 *
 * Escore = distância no eixo da seta (`main`), com penalidade forte no eixo
 * cruzado quando NÃO há alinhamento — cards alinhados (mesma fileira/coluna,
 * mesmo com alturas levemente diferentes) ganham dos que estão na diagonal.
 * Retorna `null` quando não há nada na direção (borda da região).
 */
export function pickSpatialBest(
  current: RectLike,
  candidates: SpatialCandidate[],
  direction: SpatialDirection,
): HTMLElement | null {
  const vector = SPATIAL_VECTORS[direction];
  const currentCenterX = current.left + current.width / 2;
  const currentCenterY = current.top + current.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const { rect } = candidate;

    const deltaX = rect.left + rect.width / 2 - currentCenterX;
    const deltaY = rect.top + rect.height / 2 - currentCenterY;

    // Componente no eixo da seta — positivo significa "na direção certa".
    const main = deltaX * vector.x + deltaY * vector.y;
    if (main <= 2) continue;

    const cross = Math.abs(deltaX * -vector.y + deltaY * vector.x);

    // Alinhado: sobrepõe no eixo cruzado ou a folga entre eles é pequena.
    const overlap =
      vector.x !== 0
        ? Math.min(current.bottom, rect.bottom) > Math.max(current.top, rect.top)
        : Math.min(current.right, rect.right) > Math.max(current.left, rect.left);
    const gap =
      vector.x !== 0
        ? Math.max(0, current.top - rect.bottom, rect.top - current.bottom)
        : Math.max(0, current.left - rect.right, rect.left - current.right);
    const aligned = overlap || gap <= ALIGN_GAP;

    const score = main + (aligned ? 0 : cross * 3);
    if (score < bestScore) {
      bestScore = score;
      best = candidate.element;
    }
  }

  return best;
}
