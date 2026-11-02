/**
 * Escala de viewport compartilhada (plugin + carrossel da home).
 *
 * Canvas de referência 1440×810 (16:9) a 17px — o layout aprovado no
 * notebook. Em landscape, TODA tela (TV 1080p/720p/compat, notebook) é
 * esse mesmo canvas ampliado/reduzido por `scale`.
 */
export const BASE_W = 1440;
export const BASE_H = 810;
export const BASE_FONT = 17;

/** Retrato (celular/tablet em pé) não escala — volta ao layout phone. */
export function isLandscape(w: number, h: number): boolean {
  return w >= h;
}

export function getViewportScale(w: number, h: number): number {
  if (!isLandscape(w, h)) return 1;
  return Math.min(w / BASE_W, h / BASE_H);
}

/**
 * TVs com WebView antigo às vezes reportam a viewport errada no boot
 * (ex.: 1280×720 antes do Android aplicar o tamanho real da superfície) e
 * o evento `resize` nem sempre dispara depois. Isto dispara `callback`
 * várias vezes nos primeiros frames/segundos e para quando estabiliza —
 * computa na hora: barato e determinístico.
 */
export function onViewportSettle(callback: (w: number, h: number) => void, frames = 30): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  let stopped = false;
  let rafId = 0;
  const timers: number[] = [];

  const fire = (): void => {
    if (stopped) return;
    callback(window.innerWidth, window.innerHeight);
  };

  if (typeof requestAnimationFrame === 'function') {
    let fired = 0;
    const loop = (): void => {
      if (stopped || fired >= frames) return;
      fired += 1;
      fire();
      rafId = requestAnimationFrame(loop);
    };
    loop();
  } else {
    // WebView sem rAF: só os timers de baixo cobrem o settle.
    fire();
  }

  for (const delay of [250, 750, 1500, 3000, 5000]) {
    timers.push(window.setTimeout(fire, delay));
  }

  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    for (const timer of timers) clearTimeout(timer);
  };
}
