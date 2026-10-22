/**
 * readPageAssets() lists what a page asked for and did not get: broken <img> elements,
 * @font-face files that failed, and requests answered with HTTP 400 or above, including
 * ones made only after a seek.
 */
import { readPageAssets } from '../src/index';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AddressInfo } from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

async function main() {
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    console.log(`${ok ? '✅' : '❌'} ${message}`);
    if (!ok) failures.push(message);
  };

  const server = http.createServer((req, res) => {
    const file = path.join(fixtures, path.basename(new URL(req.url ?? '/', 'http://x').pathname));
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const early = await readPageAssets(`${base}/page-assets.html`, [0, 0.5], { width: 320, height: 180 });
    const names = (urls: string[]) => urls.map((u) => path.basename(u)).sort();
    check(JSON.stringify(names(early.brokenImages)) === JSON.stringify(['missing-logo.png']), `broken <img> found, the data URI image is not (${names(early.brokenImages)})`);
    check(JSON.stringify(early.failedFonts) === JSON.stringify(['Missing Sans']), `failed @font-face found (${early.failedFonts})`);
    const statuses = early.failedRequests.map((r) => `${path.basename(r.url)} ${r.status}`).sort();
    check(statuses.includes('missing-logo.png 404') && statuses.includes('missing-font.woff2 404'), `404 requests found (${statuses})`);
    check(!statuses.some((s) => s.startsWith('page-assets.html')), 'the page itself loads and is not reported');

    const late = await readPageAssets(`${base}/page-assets.html`, [0, 1.5], { width: 320, height: 180 });
    check(names(late.brokenImages).includes('missing-late.png'), `an image added after a seek is found (${names(late.brokenImages)})`);
    check(late.failedRequests.filter((r) => path.basename(r.url) === 'missing-logo.png').length === 1, 'each failed request is listed once across frames');

    const missing = await readPageAssets(`${base}/no-such-page.html`, [0], { width: 320, height: 180 });
    check(missing.failedRequests.some((r) => path.basename(r.url) === 'no-such-page.html' && r.status === 404), 'a page that is itself missing is reported');
  } finally {
    server.close();
  }

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} page asset check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ Broken images, failed fonts and failed requests are reported.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
