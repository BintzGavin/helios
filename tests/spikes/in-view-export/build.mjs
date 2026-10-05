#!/usr/bin/env node
// Builds the spike-only player view: the production view plus an Export MP4 button.
// The production view (packages/cli/src/mcp/view/player.html) is read, never written.
//   node tests/spikes/in-view-export/build.mjs  ->  tests/spikes/in-view-export/out/player-export.html
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });

const bundled = await build({
  entryPoints: [path.join(here, 'src/page-exporter.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  logLevel: 'warning',
});
const bundle = bundled.outputFiles[0].text;
fs.writeFileSync(path.join(out, 'page-exporter.js'), bundle);

const view = fs.readFileSync(path.join(repo, 'packages/cli/src/mcp/view/player.html'), 'utf8');
const literal = JSON.stringify(bundle).replace(/</g, '\\u003c');
const viewScript = fs.readFileSync(path.join(here, 'src/view-export.js'), 'utf8')
  .split('"__HELIOS_SPIKE_EXPORT_BUNDLE__"').join(literal);

function replaceOnce(s, find, repl) {
  const i = s.indexOf(find);
  if (i < 0 || s.indexOf(find, i + 1) >= 0) throw new Error(`build.mjs: expected exactly one "${find}" in player.html`);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

let html = view;
html = replaceOnce(html, '<button id="render" type="button" disabled>Render MP4</button>',
  '<button id="render" type="button" disabled>Render MP4</button>\n    <button id="export" type="button" disabled title="Spike: encode in this browser">Export MP4</button>');
html = replaceOnce(html, '\ninit();\n})();',
  '\nwindow.__heliosSpike = { S, host, request, callTool, flash, pause, requestSeek };\ninit();\n})();');
html = replaceOnce(html, '</body>', `<script>\n${viewScript.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);

const target = path.join(out, 'player-export.html');
fs.writeFileSync(target, html);
console.log(`Wrote ${path.relative(repo, target)} (${(html.length / 1024).toFixed(0)} KB; page exporter ${(bundle.length / 1024).toFixed(0)} KB)`);
