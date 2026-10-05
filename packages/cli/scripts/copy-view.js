import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// tsc doesn't copy .html: put the MCP App view next to the compiled server (dist/mcp/view/),
// with the player's page exporter bundled into it for in-view MP4 export.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '../src/mcp/view/player.html');
const dest = path.resolve(__dirname, '../dist/mcp/view/player.html');

/** The literal in player.html that becomes the page exporter's source. */
export const EXPORTER_TOKEN = '"__HELIOS_PAGE_EXPORTER__"';
/** Installs window.__helios_export in the page; built from packages/player in this repository. */
export const EXPORTER_ENTRY = path.resolve(__dirname, '../../player/src/features/page-exporter-entry.ts');

/** The page exporter as one minified IIFE (mediabunny included), for injecting into the page's frame. */
export async function bundlePageExporter() {
  const { build } = await import('vite');
  const result = await build({
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    root: path.dirname(EXPORTER_ENTRY),
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      lib: { entry: EXPORTER_ENTRY, formats: ['iife'], name: 'HeliosPageExporter', fileName: () => 'page-exporter.js' },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
  const chunk = outputs.find((o) => o.type === 'chunk');
  if (!chunk) throw new Error('copy-view: bundling the page exporter produced no code');
  return chunk.code;
}

/** The view with the exporter written in as a JS string literal that is safe inside <script>. */
export function injectExporter(viewHtml, bundle) {
  const parts = viewHtml.split(EXPORTER_TOKEN);
  if (parts.length !== 2) throw new Error(`copy-view: expected exactly one ${EXPORTER_TOKEN} in player.html, found ${parts.length - 1}`);
  const literal = JSON.stringify(bundle).replace(/</g, '\\u003c');
  return parts[0] + literal + parts[1];
}

export async function buildViewHtml() {
  return injectExporter(fs.readFileSync(source, 'utf8'), await bundlePageExporter());
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error(`MCP view not found: ${source}`);
    process.exit(1);
  }
  const html = await buildViewHtml();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log(`Built the MCP view to ${path.relative(process.cwd(), dest)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
