/**
 * Voltar devolve o foco ao card de onde o usuário saiu.
 *
 * Sem isto, voltar do detalhe de um filme para a lista restaurava a rolagem,
 * mas cada tela focava o PRIMEIRO card (fora da tela): o próximo toque no
 * D-pad pulava pro topo e a pessoa perdia o lugar na lista.
 *
 * Ao sair de uma rota, guarda qual card estava focado (pelo link/canal) e a
 * rolagem. Ao voltar (popstate — Voltar do controle ou do navegador), espera
 * a tela montar e foca esse card de novo. Se ele estava numa página que a
 * lista ainda não recarregou, rola até a posição salva: o sentinela da
 * rolagem infinita carrega as páginas seguintes até o card aparecer.
 *
 * Só cards marcados entram (`[data-media-card]`, `[data-category-card]`,
 * `[data-channel-id]`, `[data-focus-restore]`) — o carrossel da home e
 * telas com foco próprio ficam de fora.
 */
const RESTORABLE = '[data-media-card], [data-category-card], [data-channel-id], [data-focus-restore]';
const MAX_ENTRIES = 40;
const POLL_MS = 100;
const GIVE_UP_MS = 5000;

interface SavedFocus {
  selector: string;
  scrollY: number;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function selectorFor(element: Element | null): string | null {
  const target = element?.closest<HTMLElement>(RESTORABLE);
  if (!target) return null;
  const channel = target.getAttribute('data-channel-id');
  if (channel) return `[data-channel-id=${quote(channel)}]`;
  const key = target.getAttribute('data-focus-restore');
  if (key) return `[data-focus-restore=${quote(key)}]`;
  const href = target.getAttribute('href');
  if (href) return `${target.tagName.toLowerCase()}[href=${quote(href)}]`;
  return null;
}

function inViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

export default defineNuxtPlugin(() => {
  const router = useRouter();
  const saved = new Map<string, SavedFocus>();
  let popped = false;
  let run = 0;

  window.addEventListener('popstate', () => {
    popped = true;
  });

  router.beforeEach((_to, from) => {
    const selector = selectorFor(document.activeElement);
    saved.delete(from.fullPath);
    if (!selector) return;
    saved.set(from.fullPath, { selector, scrollY: window.scrollY });
    if (saved.size > MAX_ENTRIES) saved.delete(saved.keys().next().value as string);
  });

  router.afterEach((to) => {
    const wasPop = popped;
    popped = false;
    const entry = wasPop ? saved.get(to.fullPath) : undefined;
    const id = ++run;
    if (!entry) return;

    const startedAt = Date.now();
    const tick = (): void => {
      if (id !== run) return; // outra navegação começou
      const element = document.querySelector<HTMLElement>(entry.selector);
      if (element && element.getClientRects().length > 0) {
        element.focus({ preventScroll: true });
        // A rolagem salva do router chega junto; confere depois dela.
        setTimeout(() => {
          if (id === run && document.activeElement === element && !inViewport(element)) {
            element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          }
        }, 250);
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) return;
      // Card além da 1ª página: rola até onde estava — o sentinela carrega mais.
      if (Date.now() - startedAt > 600 && entry.scrollY > 0) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (window.scrollY < Math.min(entry.scrollY, max) - 1) {
          window.scrollTo(0, Math.min(entry.scrollY, max));
        }
      }
      setTimeout(tick, POLL_MS);
    };
    setTimeout(tick, POLL_MS);
  });
});
