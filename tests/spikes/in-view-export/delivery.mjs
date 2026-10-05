#!/usr/bin/env node
// How does an exported MP4 leave the view's sandbox in basic-host?
//   --phase stock    basic-host as published: <a download>, ui/download-file, save_export chunking
//   --phase patched  basic-host with basic-host-download-file.patch: ui/download-file end to end
// Needs basic-host (stock or patched) on :8080/:8081 and server.mjs on :3001.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch, openView, hostCaps, runExport } from './host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const phase = arg('--phase', 'stock');
const outDir = path.join(here, 'out', `delivery-${phase}`);
fs.mkdirSync(outDir, { recursive: true });
const MB = 1024 * 1024;

const browser = await launch();
const log = [];
const { ctx, page, view } = await openView(browser, { path: 'pages/canvas.html', duration: 5, width: 1920, height: 1080, fps: 30 }, { log });
const results = { phase, hostCaps: await hostCaps(view) };

const downloads = [];
page.on('download', async (d) => {
  const file = path.join(outDir, d.suggestedFilename());
  await d.saveAs(file).catch(() => {});
  downloads.push({ name: d.suggestedFilename(), bytes: fs.existsSync(file) ? fs.statSync(file).size : null });
});
const settle = () => page.waitForTimeout(1500);

// Synthetic MP4-shaped payloads (ftyp at byte 4) for sizes the 5 s test videos don't reach.
const synth = (n) => view.evaluate((n) => {
  const b = new Uint8Array(n);
  let x = 12345;
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; }
  b.set([0, 0, 0, 24, 102, 116, 121, 112], 0);
  window.__spikeBytes = b;
  return b.length;
}, n);

// A real export to deliver.
const exp = await runExport(view, { mode: 'canvas', deliver: [] });
results.export = { bytes: exp.bytes, seconds: exp.totalMs / 1000 };
await view.evaluate(() => { /* keep the bytes for the delivery calls */ });

if (phase === 'stock') {
  // 1. <a download> from inside the view (what ClientSideExporter does), and the same from the host page as a control.
  await view.evaluate(() => window.__heliosSpikeAnchor(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])));
  await settle();
  const fromView = downloads.length;
  await page.evaluate(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], { type: 'video/mp4' }));
    a.download = 'control.mp4';
    document.body.appendChild(a); a.click(); a.remove();
  });
  await settle();
  results.anchor = {
    downloadsFromView: fromView,
    downloadsFromHostPageControl: downloads.length - fromView,
    consoleBlocked: log.filter((l) => /download/i.test(l)).slice(0, 3),
  };

  // 2. ui/download-file when the host does not advertise it.
  await synth(1 * MB);
  results.downloadFileUnadvertised = await view.evaluate(() => window.__heliosSpikeDownloadFile(window.__spikeBytes, true));

  // 3. save_export: chunk sizes and payload sizes.
  results.saveExport = [];
  for (const total of [3 * MB, 25 * MB, 100 * MB]) {
    await synth(total);
    for (const chunk of [256 * 1024, 1 * MB, 4 * MB, 6 * MB, 8 * MB]) {
      if (total / chunk > 400) continue;
      const r = await view.evaluate((c) => window.__heliosSpikeSave(window.__spikeBytes, c), chunk);
      const row = { totalMB: total / MB, chunkKB: chunk / 1024, ok: r.ok, chunks: r.chunks, seconds: r.ms / 1000,
        mbPerSecond: r.ok ? +(total / MB / (r.ms / 1000)).toFixed(1) : null,
        maxArgChars: Math.max(0, ...r.calls.map((c) => c.chars)), error: r.error && r.error.slice(0, 200) };
      if (r.ok) row.savedBytesMatch = fs.statSync(r.absolutePath).size === total;
      results.saveExport.push(row);
      console.error(JSON.stringify(row));
    }
  }
  // Out-of-order and non-MP4 uploads are refused.
  results.saveExportRefusals = await view.evaluate(async () => {
    const X = window.__heliosSpike;
    const out = {};
    try { await X.callTool('save_export', { name: 'x.mp4', uploadId: 'spike-order-1', index: 1, total: 2, data: 'AAAA' }); out.outOfOrder = 'accepted'; } catch (e) { out.outOfOrder = e.message; }
    try { await X.callTool('save_export', { name: 'x.mp4', uploadId: 'spike-notmp4', index: 0, total: 1, data: btoa('hello world!') }); out.notMp4 = 'accepted'; } catch (e) { out.notMp4 = e.message; }
    try { await X.callTool('save_export', { name: '../escape.mp4', uploadId: 'spike-escape1', index: 0, total: 1, data: 'AAAA' }); out.pathEscape = 'accepted'; } catch (e) { out.pathEscape = e.message.slice(0, 160); }
    return out;
  });
} else {
  // ui/download-file advertised: the real export, then larger synthetic payloads.
  results.downloadFile = [];
  const before = downloads.length;
  const r1 = await view.evaluate(async () => {
    const r = await window.__heliosSpikeExport({ mode: 'canvas', deliver: ['download-file'] });
    return r.delivery.downloadFile;
  });
  await settle();
  results.downloadFile.push({ payload: 'export', ...r1, downloadsSeen: downloads.slice(before) });
  for (const total of [25 * MB, 100 * MB]) {
    await synth(total);
    const b = downloads.length;
    const r = await view.evaluate(() => window.__heliosSpikeDownloadFile(window.__spikeBytes, false));
    await page.waitForTimeout(3000);
    results.downloadFile.push({ payload: `${total / MB} MB synthetic`, ...r, downloadsSeen: downloads.slice(b) });
    console.error(JSON.stringify(results.downloadFile.at(-1)));
  }
}

await ctx.close();
await browser.close();
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
