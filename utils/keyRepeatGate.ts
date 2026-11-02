/**
 * Trava de tecla segurada do D-pad: no máximo um passo por quadro pintado.
 *
 * Segurar uma seta no remote dispara ~30 keydown/s. Em chip de TV um passo
 * (foco + rolagem + re-render) pode levar mais que isso: os eventos
 * enfileiravam e o foco seguia andando depois de soltar o botão. Com a trava,
 * tecla segurada que chega antes do quadro do passo anterior — ou que já
 * chega atrasada (fila) — é descartada. Toques isolados passam sempre.
 *
 * "Segurada" não depende só de `event.repeat`: vários remotes de TV mandam a
 * tecla segurada como toques comuns em sequência (repeat sempre false).
 */
export interface KeyRepeatGate {
  /** true = descartar esta tecla (o chamador ainda deve dar preventDefault). */
  shouldDrop: (event: KeyboardEvent) => boolean;
  /** Registra que um passo foi dado agora. */
  mark: () => void;
}

/** Keydowns mais próximos que isso contam como tecla segurada. */
const HOLD_GAP_MS = 90;
/** Keydown processado com esse atraso já é fila (thread ocupada). */
const STALE_KEY_MS = 150;

export function createKeyRepeatGate(): KeyRepeatGate {
  let pending = false;
  let token = 0;
  let lastKeyAt = -Infinity;

  function release(owner: number): void {
    if (owner === token) pending = false;
  }

  return {
    shouldDrop: (event) => {
      const now = performance.now();
      const held = event.repeat || now - lastKeyAt < HOLD_GAP_MS;
      lastKeyAt = now;
      if (!held) return false;
      // `timeStamp` só é comparável com performance.now() em WebView 49+;
      // nas mais antigas vem em epoch e a diferença sai negativa.
      const age = now - event.timeStamp;
      if (age > STALE_KEY_MS && age < 60000) return true;
      return pending;
    },
    mark: () => {
      pending = true;
      const owner = ++token;
      requestAnimationFrame(() => release(owner));
      // WebView que estrangula rAF não pode travar a navegação.
      setTimeout(() => release(owner), 100);
    },
  };
}
