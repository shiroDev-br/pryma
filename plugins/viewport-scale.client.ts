/**
 * Escala global do app pela viewport.
 *
 * Tudo no projeto é rem (Tailwind) → o font-size do <html> acompanha a tela e
 * TODO o layout escala junto: igual em MacBook, TV 1080p, TV 720p e TV em
 * modo compat (viewport ~760px). Sem breakpoint de largura/altura em landscape.
 * Celular deitado tem piso de fonte (ver utils/viewportScale).
 *
 * Também publica em px (WebView antiga não resolve calc(vh) com segurança):
 *   --app-vh    altura útil da tela
 *   --header-h  faixa do header: 11% da tela, nunca menos que os 5rem dele
 *   --footer-h  faixa da barra inferior: 11% da tela, nunca menos que o conteúdo
 * e a classe `tv-scale` no <html> (landscape).
 *
 * O painel de staff (/admin) fica de fora: é ferramenta web (desktop/celular),
 * com layout responsivo próprio — a escala de TV o deixava gigante em monitor
 * grande e ilegível em celular deitado.
 */
const HEADER_MIN_REM = 5;
const FOOTER_MIN_REM = 4.5;

export default defineNuxtPlugin(() => {
  const root = document.documentElement;
  const router = useRouter();
  /** Última medida aplicada: o settle chama isto dezenas de vezes no boot. */
  let applied = '';

  const apply = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scaled = isLandscape(w, h) && !isAdminPath(router.currentRoute.value.path);
    const signature = `${w}x${h}:${scaled}`;
    if (signature === applied) return;
    applied = signature;

    if (!scaled) {
      // Retrato = celular (e o painel): rem normal + fallbacks de CSS.
      root.style.fontSize = '';
      root.style.removeProperty('--app-vh');
      root.style.removeProperty('--header-h');
      root.style.removeProperty('--footer-h');
      root.classList.remove('tv-scale');
      return;
    }

    const font = BASE_FONT * getViewportScale(w, h);
    root.style.fontSize = `${font.toFixed(3)}px`;
    root.style.setProperty('--app-vh', `${h}px`);
    root.style.setProperty('--header-h', `${Math.round(Math.max(h * 0.11, HEADER_MIN_REM * font))}px`);
    root.style.setProperty('--footer-h', `${Math.round(Math.max(h * 0.11, FOOTER_MIN_REM * font))}px`);
    root.classList.add('tv-scale');
  };

  apply();
  // Entrar/sair do painel troca o modo de escala.
  router.afterEach(() => apply());
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  // TVs que só aplicam a viewport real depois do boot (sem `resize` confiável):
  // reaplica a escala nos primeiros frames/segundos até estabilizar.
  onViewportSettle(() => apply());
});
