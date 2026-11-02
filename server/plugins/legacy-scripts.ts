/**
 * Mesma correção do scripts/fix-legacy-html.mjs, mas para o HTML renderizado
 * pelo servidor (deploy na VPS): o Nuxt imprime os bundles do
 * @vitejs/plugin-legacy como `<script type="module">`, então navegador moderno
 * executava o bundle legado ("System is not defined") e baixava ~1.3 MB de
 * código morto. Vira `nomodule` (só WebView antiga roda) e some o preload.
 */
const LEGACY_SCRIPT = /<script type="module"([^>]*?)-legacy\.js([^>]*?)><\/script>/g;
const LEGACY_LINK = /\s*<link[^>]*-legacy\.js[^>]*>/g;

function fix(chunks: string[]): string[] {
  return chunks.map((chunk) =>
    chunk.replace(LEGACY_SCRIPT, '<script nomodule$1-legacy.js$2></script>').replace(LEGACY_LINK, ''),
  );
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    html.head = fix(html.head);
    html.bodyPrepend = fix(html.bodyPrepend);
    html.body = fix(html.body);
    html.bodyAppend = fix(html.bodyAppend);
  });
});
