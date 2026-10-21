/**
 * O Nuxt imprime todos os entries do client como `<script type="module">`,
 * sobrescrevendo o `nomodule` do @vitejs/plugin-legacy. Sem ele, WebViews
 * antigas (Chromium <61) ignoram todo o JavaScript e a tela fica preta.
 *
 * Roda logo após `nuxt generate` (ver script `apk` no package.json).
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '.output', 'public');

function* walkHtml(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walkHtml(path);
    else if (path.endsWith('.html')) yield path;
  }
}

let fixed = 0;
for (const file of walkHtml(root)) {
  let html = readFileSync(file, 'utf8');
  // <script type="module" src="...-legacy.js"> -> <script nomodule ...>
  html = html.replace(
    /<script type="module"([^>]*?)-legacy\.js([^>]*?)><\/script>/g,
    '<script nomodule$1-legacy.js$2></script>',
  );
  // Nuxt emite <link modulepreload/prefetch> pros bundles legacy também —
  // navegador moderno baixava ~1.3 MB de código morto por sessão (o legado
  // recebe os arquivos via <script nomodule> e pelo próprio runtime).
  html = html.replace(/\s*<link[^>]*-legacy\.js[^>]*>/g, '');
  // WebView de TV cacheava o index.html e servia bundles antigos mesmo com
  // APK novo instalado — no-store no HTML garante asset fresco.
  if (!html.includes('http-equiv="Cache-Control"')) {
    html = html.replace('<head>', '<head>\n    <meta http-equiv="Cache-Control" content="no-store" />');
  }
  writeFileSync(file, html);
  fixed++;
}
console.log(`[fix-legacy-html] ${fixed} HTML(s) corrigido(s)`);
