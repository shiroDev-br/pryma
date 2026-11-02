/**
 * Marca no <html> o que a WebView não suporta, para o CSS ter fallback.
 *
 * `no-flex-gap`: flex gap só existe a partir do Chrome 84 — e não dá pra
 * testar com `@supports` (o `gap` de grid já existia). Em Fire Stick/TV box
 * com WebView antiga os botões e chips ficavam colados. Mesmo teste do
 * diagnóstico em "Sobre" (components/about/DeviceDiagnostics.vue).
 */
export default defineNuxtPlugin(() => {
  const flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';
  flex.style.position = 'absolute';
  flex.style.visibility = 'hidden';
  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  const supported = flex.scrollHeight === 1;
  flex.remove();
  if (!supported) document.documentElement.classList.add('no-flex-gap');
});
