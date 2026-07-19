/**
 * Builds the browser-playable Compass into a single self-contained HTML file.
 *
 * esbuild bundles web/main.ts — which imports the REAL engines (src/features/*)
 * and the REAL validated content (src/data/contentLoader) — into one IIFE, with
 * the content JSON inlined. So the web build can never drift from the native
 * app's logic or content.
 *
 * Outputs:
 *   web/compass.html          — full standalone document (open directly / commit)
 *   web/compass.artifact.html — head/body-less page body for the Artifact tool
 *
 * Run: npm run build:web
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const webDir = join(here, '..', 'web');

const result = await build({
  entryPoints: [join(webDir, 'main.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2019',
  write: false,
  minify: true,
  legalComments: 'none',
  loader: { '.json': 'json' },
});

const js = result.outputFiles[0].text;
const css = readFileSync(join(webDir, 'styles.css'), 'utf8');

const body = `<style>\n${css}\n</style>\n<div id="root"></div>\n<script>\n${js}\n</script>`;

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Compass — self-reflection coaching</title>
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(join(webDir, 'compass.html'), standalone);
writeFileSync(join(webDir, 'compass.artifact.html'), body + '\n');

console.log(`Built web/compass.html (${(standalone.length / 1024).toFixed(0)} KB) and web/compass.artifact.html`);
