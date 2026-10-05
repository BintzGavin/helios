#!/usr/bin/env node
// Does an SVG foreignObject image taint a VideoFrame? Checked outside any host, so the answer
// is about Chromium, not the MCP Apps sandbox. Prints one JSON line per browser and source.
//   node tests/spikes/in-view-export/taint-check.mjs
import http from 'http';
import { chromium } from 'playwright';

const srv = http.createServer((_q, r) => r.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><p>x</p></body>'));
await new Promise((r) => srv.listen(0, r));
const url = `http://localhost:${srv.address().port}/`;

const probe = async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="width:64px;height:64px;background:red">hi</div></foreignObject></svg>';
  const plain = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="red"/></svg>';
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load failed')); i.src = src; });
  const out = {};
  // dom-capture writes each fetched stylesheet as <style>/* <href> */ ...; a Google Fonts href has '&'.
  const amp = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml"><style>/* https://fonts.googleapis.com/css2?family=A&display=swap */</style>hi</div></foreignObject></svg>';
  for (const [name, s, how] of [
    ['foreignObject with & in a <style> comment, data: URL', amp, 'data'],
    ['foreignObject via blob: URL', svg, 'blob'],
    ['foreignObject via data: URL', svg, 'data'],
    ['plain SVG via blob: URL', plain, 'blob'],
  ]) {
    const src = how === 'blob' ? URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })) : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    const r = {};
    try {
      const img = await load(src);
      const bmp = await createImageBitmap(img);
      try { new VideoFrame(bmp, { timestamp: 0 }).close(); r.videoFrameFromBitmap = 'ok'; } catch (e) { r.videoFrameFromBitmap = e.message; }
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      c.getContext('2d').drawImage(img, 0, 0);
      try { c.getContext('2d').getImageData(0, 0, 1, 1); r.canvasReadback = 'ok'; } catch (e) { r.canvasReadback = e.message; }
      try { new VideoFrame(c, { timestamp: 0 }).close(); r.videoFrameFromCanvas = 'ok'; } catch (e) { r.videoFrameFromCanvas = e.message; }
      const c2 = document.createElement('canvas'); c2.width = 64; c2.height = 64;
      c2.getContext('2d').drawImage(bmp, 0, 0);
      try { new VideoFrame(c2, { timestamp: 0 }).close(); r.videoFrameFromCanvasOfBitmap = 'ok'; } catch (e) { r.videoFrameFromCanvasOfBitmap = e.message; }
    } catch (e) { r.error = e.message; }
    out[name] = r;
  }
  return out;
};

for (const channel of [undefined, 'chromium', 'chrome']) {
  const b = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const p = await b.newPage();
  await p.goto(url);
  console.log(JSON.stringify({ browser: (channel || 'chromium-headless-shell') + ' ' + b.version(), ...(await p.evaluate(probe)) }));
  await b.close();
}
srv.close();
