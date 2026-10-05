#!/usr/bin/env node
// Long exports: wall time, file size and the view's JS heap for 60 s at 1080p.
//   node tests/spikes/in-view-export/long.mjs [--seconds 60]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch, openView, runExport } from './host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const seconds = Number(arg('--seconds', '60'));
const out = path.join(here, 'out', 'long');
fs.mkdirSync(out, { recursive: true });

const browser = await launch();
const results = [];
for (const [page, mode, opts] of [['canvas', 'canvas', {}], ['gsap', 'dom', { inline: true, bake: true }], ['dom-font', 'dom', { inline: true, bake: true }]]) {
  const { ctx, page: host, view } = await openView(browser, { path: `pages/${page}.html`, duration: seconds, width: 1920, height: 1080, fps: 30 });
  const cdp = await ctx.newCDPSession(host);
  await cdp.send('Performance.enable');
  let peak = 0;
  const timer = setInterval(async () => {
    try {
      const m = await cdp.send('Performance.getMetrics');
      const used = m.metrics.find((x) => x.name === 'JSHeapUsedSize');
      if (used && used.value > peak) peak = used.value;
    } catch { /* closing */ }
  }, 250);
  const r = await runExport(view, { mode, ...opts, deliver: ['save_export'], chunkBytes: 4 * 1024 * 1024 });
  clearInterval(timer);
  const row = {
    page, seconds, exportSeconds: r.totalMs / 1000, secondsPerVideoSecond: r.totalMs / 1000 / seconds,
    bytes: r.bytes, mbPerMinute: r.bytes / 1e6 / (seconds / 60), saveExportSeconds: r.delivery.saveExport.ms / 1000,
    peakHostJsHeapMB: +(peak / 1e6).toFixed(1),
  };
  results.push(row);
  console.error(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
