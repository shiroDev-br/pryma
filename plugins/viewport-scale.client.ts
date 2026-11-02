/**
 * Escala global do app pela viewport.
 *
 * Tudo no projeto é rem (Tailwind) → o font-size do <html> acompanha a tela e
 * TODO o layout escala junto: igual em MacBook, TV 1080p, TV 720p e TV em
 * modo compat (viewport ~760px). Sem breakpoint de largura/altura.
 *
 * Também publica em px (WebView antiga não resolve calc(vh) com segurança):
 *   --app-vh    altura útil da tela
 *   --header-h  11% (faixa do header)
 *   --footer-h  11% (faixa da barra inferior)
 * e a classe `tv-scale` no <html> (landscape).
 *
 * O painel de staff (/admin) fica de fora: é ferramenta web (desktop/celular),
 * com layout responsivo próprio — a escala de TV o deixava gigante em monitor
 * grande e ilegível em celular deitado.
 */
export default defineNuxtPlugin(() => {
  const root = document.documentElement;
  const router = useRouter();

  const apply = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!isLandscape(w, h) || isAdminPath(router.currentRoute.value.path)) {
      // Retrato = celular (e o painel): rem normal + fallbacks de CSS.
      root.style.fontSize = '';
      root.style.removeProperty('--app-vh');
      root.style.removeProperty('--header-h');
      root.style.removeProperty('--footer-h');
      root.classList.remove('tv-scale');
      return;
    }

    const scale = getViewportScale(w, h);
    root.style.fontSize = `${(BASE_FONT * scale).toFixed(3)}px`;
    root.style.setProperty('--app-vh', `${h}px`);
    root.style.setProperty('--header-h', `${Math.round(h * 0.11)}px`);
    root.style.setProperty('--footer-h', `${Math.round(h * 0.11)}px`);
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
