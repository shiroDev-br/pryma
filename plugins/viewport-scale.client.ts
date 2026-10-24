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
 */
export default defineNuxtPlugin(() => {
  const root = document.documentElement;

  const apply = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!isLandscape(w, h)) {
      // Retrato = celular: rem normal + fallbacks de CSS.
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
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
});
