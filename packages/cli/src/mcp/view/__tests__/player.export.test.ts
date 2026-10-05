import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Frame, type Page } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { buildPageShim } from '@helios-project/renderer';
import { createHeliosMcpServer, PLAYER_URI } from '../../server.js';

// In-view export end to end: the built view (with the page exporter bundled in), the real seek
// shim and the real helios MCP server, inside a fake MCP Apps host that serves the view with a
// CSP built from the view's _meta.ui.csp, as basic-host does. The exported MP4s are checked with
// FFmpeg: frame count, size, and pixels against the page itself.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, '../../../..');
const FONT_FILE = path.resolve(cliRoot, '../portable/tests/fixtures/fonts/NotoSans-Regular.ttf');
const HOST_URL = 'https://host.test/';
const VIEW_URL = 'https://view.test/player.html';
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Test&display=swap';
const FONT_URL = 'https://fonts.gstatic.com/s/notosans/v1/notosans.ttf';

const W = 320;
const H = 180;
const FPS = 30;
const DURATION = 2;

const CANVAS_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100vw;height:100vh}
</style></head><body><canvas width="${W}" height="${H}"></canvas><script>
window.helios = { duration: ${DURATION}, fps: ${FPS} };
const ctx = document.querySelector('canvas').getContext('2d');
window.renderAt = (t) => { ctx.fillStyle = 'rgb(' + Math.round(t * 100) + ',60,200)'; ctx.fillRect(0, 0, ${W}, ${H}); };
</script></body></html>`;

// A Google Font through <link>, a CSS animation, and text set in renderAt.
const FONT_PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONT_CSS_URL.replace(/&/g, '&amp;')}">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101828;color:#fff}
h1{position:absolute;left:10px;top:8px;margin:0;font:48px 'Noto Test',serif;letter-spacing:2px}
.box{position:absolute;left:0;top:120px;width:40px;height:40px;background:#e33;animation:slide 2s linear both}
@keyframes slide{from{transform:translateX(0)}to{transform:translateX(280px)}}
#n{position:absolute;right:10px;top:70px;font:32px 'Noto Test',serif}
</style></head><body><h1>HELIOS</h1><div class="box"></div><div id="n">0</div><script>
window.helios = { duration: ${DURATION}, fps: ${FPS} };
window.renderAt = (t) => { document.getElementById('n').textContent = (t * 10).toFixed(1); };
</script></body></html>`;

const FONT_CSS = `@font-face { font-family: 'Noto Test'; font-style: normal; font-weight: 400; font-display: swap; src: url(${FONT_URL}) format('truetype'); }`;

const HOST_PAGE = `<!doctype html><html><body style="margin:0"><script>
window.__sent = [];
const f = document.createElement('iframe');
f.src = ${JSON.stringify(VIEW_URL)};
f.style.cssText = 'width:700px;height:400px;border:0;display:block';
document.body.appendChild(f);
const send = (m) => f.contentWindow.postMessage(m, '*');
window.addEventListener('message', async (e) => {
  if (e.source !== f.contentWindow) return;
  const m = e.data;
  window.__sent.push(m.method === 'tools/call' ? { method: m.method, id: m.id, params: { name: m.params.name, arguments: { ...m.params.arguments, data: undefined } } } : m);
  const sc = await window.__scenario();
  if (m.method === 'ui/initialize') {
    send({ jsonrpc: '2.0', id: m.id, result: {
      protocolVersion: '2026-01-26', hostInfo: { name: 'fake-host', version: '0.0.0' },
      hostCapabilities: sc.hostCapabilities, hostContext: { theme: 'light', displayMode: 'inline' },
    } });
  } else if (m.method === 'ui/notifications/initialized') {
    send({ jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: sc.toolInput } });
    send({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: sc.toolResult });
  } else if (m.method === 'tools/call') {
    send({ jsonrpc: '2.0', id: m.id, result: await window.__tool(m.params.name, m.params.arguments) });
  } else if (m.method === 'ui/download-file') {
    await window.__download(m.params);
    send({ jsonrpc: '2.0', id: m.id, result: {} });
  } else if (m.method && m.id !== undefined) {
    send({ jsonrpc: '2.0', id: m.id, result: {} });
  }
});
</script></body></html>`;

let browser: Browser;
let tmp: string;
let root: string;
let client: Client;
let view: { html: string; csp: string };

function cspFrom(meta: any): string {
  const res = (meta?.ui?.csp?.resourceDomains ?? []).join(' ');
  const connect = (meta?.ui?.csp?.connectDomains ?? []).join(' ');
  return [
    "default-src 'none'",
    `script-src 'self' 'unsafe-inline' ${res}`,
    `style-src 'self' 'unsafe-inline' ${res}`,
    `font-src 'self' data: ${res}`,
    `img-src 'self' data: blob: ${res}`,
    `media-src 'self' data: blob: ${res}`,
    `connect-src 'self' ${connect}`,
    "frame-src 'none'",
  ].join('; ');
}

function run(args: string[], input?: Buffer) {
  const r = spawnSync(ffmpeg.path, args, { input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr.toString().slice(-500)}`);
  return r;
}
function probe(file: string): { frames: number; width: number; height: number } {
  const err = run(['-hide_banner', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-']).stderr.toString();
  const frames = [...err.matchAll(/frame=\s*(\d+)/g)].pop();
  const size = /Video: .*?(\d{2,5})x(\d{2,5})/.exec(err);
  return { frames: frames ? Number(frames[1]) : -1, width: size ? Number(size[1]) : -1, height: size ? Number(size[2]) : -1 };
}
/** One decoded frame as RGB24. */
function frameRgb(file: string, n: number): Buffer {
  return run(['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${n})`, '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']).stdout;
}
function pngRgb(png: Buffer): Buffer {
  return run(['-v', 'error', '-f', 'png_pipe', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], png).stdout;
}
function psnr(a: Buffer, b: Buffer): number {
  expect(a.length).toBe(b.length);
  let se = 0;
  for (let i = 0; i < a.length; i++) se += (a[i] - b[i]) ** 2;
  const mse = se / a.length;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}
function pixel(rgb: Buffer, x: number, y: number): [number, number, number] {
  const i = (y * W + x) * 3;
  return [rgb[i], rgb[i + 1], rgb[i + 2]];
}

async function waitFor<T>(fn: () => Promise<T | undefined | false> | T | undefined | false, what: string, ms = 60_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function routeFonts(page: Page) {
  await page.route('https://fonts.googleapis.com/**', (route) => {
    return route.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: FONT_CSS });
  });
  await page.route('https://fonts.gstatic.com/**', (route) => {
    return route.fulfill({ status: 200, contentType: 'font/ttf', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(FONT_FILE) });
  });
}

async function openHost(pagePath: string, hostCapabilities: Record<string, unknown>) {
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  const calls: Array<{ name: string; args: any }> = [];
  const downloads: any[] = [];
  await page.exposeFunction('__scenario', () => ({
    hostCapabilities,
    toolInput: { path: pagePath },
    toolResult: { content: [], structuredContent: { mode: 'player', path: pagePath, duration: DURATION, width: W, height: H, fps: FPS } },
  }));
  await page.exposeFunction('__tool', async (name: string, args: any) => {
    calls.push({ name, args: { ...args, data: args.data === undefined ? undefined : `${args.data.length} chars` } });
    return client.callTool({ name, arguments: args });
  });
  await page.exposeFunction('__download', (params: any) => { downloads.push(params); });
  await page.route('https://host.test/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: HOST_PAGE }));
  await page.route('https://view.test/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html', headers: { 'content-security-policy': view.csp }, body: view.html,
  }));
  await routeFonts(page);
  await page.goto(HOST_URL);
  const frame = await waitFor(() => page.frames().find((f) => f.url() === VIEW_URL), 'view frame');
  await waitFor(() => frame.evaluate(() => !(document.getElementById('export') as HTMLButtonElement).disabled), 'Export MP4 enabled');
  return { page, frame, calls, downloads };
}

async function exportAndWait(frame: Frame): Promise<string> {
  expect(await frame.isVisible('#export')).toBe(true);
  await frame.click('#export');
  return waitFor(async () => {
    const cls = await frame.getAttribute('#rstat', 'class');
    const text = (await frame.textContent('#rstat')) || '';
    if (cls === 'err') throw new Error(`export failed: ${text}`);
    return cls === 'ok' && text;
  }, 'export finished', 120_000);
}

beforeAll(async () => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'helios-export-e2e-')));
  root = path.join(tmp, 'project');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'canvas.html'), CANVAS_PAGE);
  fs.writeFileSync(path.join(root, 'font.html'), FONT_PAGE);

  const copyView = await import(pathToFileURL(path.join(cliRoot, 'scripts/copy-view.js')).href);
  const viewPath = path.join(tmp, 'player.html');
  fs.writeFileSync(viewPath, await copyView.buildViewHtml());

  const helios = createHeliosMcpServer({ root, viewPath, buildShim: () => buildPageShim() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'fake-host', version: '1.0.0' });
  await Promise.all([helios.server.connect(serverTransport), client.connect(clientTransport)]);
  const { contents } = await client.readResource({ uri: PLAYER_URI });
  view = { html: (contents[0] as any).text, csp: cspFrom((contents[0] as any)._meta) };

  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await client?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

describe('Export MP4 in the player view', { timeout: 180_000 }, () => {
  it('exports a canvas page frame-exactly and saves it through save_export', async () => {
    const { page, frame, calls } = await openHost('canvas.html', { serverTools: {}, updateModelContext: { text: {} } });
    try {
      const done = await exportAndWait(frame);
      expect(done).toMatch(/^Exported exports\/canvas\.mp4 \(\d+\.\d MB\)$/);
      const file = path.join(root, 'exports', 'canvas.mp4');
      expect(await frame.textContent('#rpath')).toBe(file);
      expect(await frame.isVisible('#rreveal')).toBe(true);

      const saves = calls.filter((c) => c.name === 'save_export');
      expect(saves.length).toBeGreaterThan(0);
      expect(saves[0].args).toMatchObject({ name: 'canvas.mp4', index: 0, total: saves.length });
      expect(calls.some((c) => c.name === 'render_video')).toBe(false);

      const bytes = fs.readFileSync(file);
      expect(bytes.toString('latin1', 4, 8)).toBe('ftyp');
      expect(probe(file)).toEqual({ frames: DURATION * FPS, width: W, height: H });
      // Each frame is the page at its own time: red = round(t * 100).
      for (const n of [0, 15, 30, 59]) {
        const [r, g, b] = pixel(frameRgb(file, n), W / 2, H / 2);
        expect(Math.abs(r - Math.round((n / FPS) * 100)), `frame ${n} red ${r}`).toBeLessThanOrEqual(4);
        expect(Math.abs(g - 60)).toBeLessThanOrEqual(4);
        expect(Math.abs(b - 200)).toBeLessThanOrEqual(4);
      }
    } finally {
      await page.close();
    }
  });

  it('exports a DOM page with a Google Font and a CSS animation, and hands it to a host that advertises downloadFile', async () => {
    const { page, frame, calls, downloads } = await openHost('font.html', { serverTools: {}, downloadFile: {} });
    try {
      const done = await exportAndWait(frame);
      expect(done).toMatch(/^Exported font\.mp4 \(\d+\.\d MB\) and passed it to the host to save\.$/);
      // The host took the file; the server was not asked to save it.
      expect(calls.some((c) => c.name === 'save_export')).toBe(false);
      expect(downloads).toHaveLength(1);
      const resource = downloads[0].contents[0];
      expect(downloads[0].contents[0].type).toBe('resource');
      expect(resource.resource).toMatchObject({ uri: 'file:///font.mp4', mimeType: 'video/mp4' });
      const file = path.join(tmp, 'font.mp4');
      fs.writeFileSync(file, Buffer.from(resource.resource.blob, 'base64'));
      expect(probe(file)).toEqual({ frames: DURATION * FPS, width: W, height: H });

      // Frame 30 (t = 1 s) matches the page at t = 1 s, web font and animation included.
      const ref = await browser.newPage({ viewport: { width: W, height: H } });
      try {
        await routeFonts(ref);
        await ref.addInitScript({ content: buildPageShim() });
        await ref.route('https://page.test/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: FONT_PAGE }));
        await ref.goto('https://page.test/font.html');
        await ref.evaluate(async () => { await document.fonts.ready; await (window as any).__helios_seek(1, 3000); });
        // The reference really uses the web font (a fallback font would match a failed export).
        expect(await ref.evaluate(() => document.fonts.check("48px 'Noto Test'"))).toBe(true);
        const expected = pngRgb(await ref.screenshot());
        const actual = frameRgb(file, 30);
        // The box has moved 140 px by t = 1 s; in a clone whose animation restarted it would be at 0.
        const [r, g, b] = pixel(actual, 160, 140);
        expect(r).toBeGreaterThan(180);
        expect(g).toBeLessThan(90);
        expect(b).toBeLessThan(90);
        // About 40 dB with the font inlined; about 13 dB when it can't be fetched and text falls back.
        expect(psnr(actual, expected)).toBeGreaterThan(30);
      } finally {
        await ref.close();
      }
    } finally {
      await page.close();
    }
  });

  it('falls back to Render MP4 and says so when the host has no downloadFile and the server no save_export', async () => {
    const { page, frame, calls } = await openHost('canvas.html', { serverTools: {} });
    // A server without save_export: unknown tool, as the MCP SDK answers it.
    const real = client.callTool.bind(client);
    (client as any).callTool = async (req: any, ...rest: any[]) =>
      req.name === 'save_export'
        ? { isError: true, content: [{ type: 'text', text: 'MCP error -32602: Tool save_export not found' }] }
        : req.name === 'render_video'
          ? { content: [], structuredContent: { jobId: 'job-1', status: 'completed', output: 'canvas.mp4', absoluteOutput: path.join(root, 'canvas.mp4'), progress: 1, elapsedSeconds: 1, bytes: 1000 } }
          : real(req, ...rest);
    try {
      await frame.click('#export');
      await waitFor(() => frame.evaluate(() => /can't receive files from the player, so the MP4 is being made with Render MP4 instead/.test(document.getElementById('msg')!.textContent || '')), 'fallback message');
      await waitFor(() => calls.find((c) => c.name === 'render_video'), 'render_video call');
      await waitFor(() => frame.evaluate(() => /Rendered canvas\.mp4/.test(document.getElementById('rstat')!.textContent || '')), 'render shown');
      expect(calls.filter((c) => c.name === 'save_export')).toHaveLength(1);

      // The next export goes straight to Render MP4, without encoding again.
      const before = calls.length;
      await waitFor(() => frame.evaluate(() => !(document.getElementById('export') as HTMLButtonElement).disabled), 'export enabled');
      await frame.click('#export');
      await waitFor(() => calls.slice(before).find((c) => c.name === 'render_video'), 'second render_video');
      expect(calls.slice(before).some((c) => c.name === 'save_export')).toBe(false);
    } finally {
      (client as any).callTool = real;
      await page.close();
    }
  });

  it('cancels an export', async () => {
    const { page, frame, calls } = await openHost('font.html', { serverTools: {} });
    try {
      await frame.click('#export');
      await waitFor(() => frame.isVisible('#rcancel'), 'cancel button');
      await frame.click('#rcancel');
      await waitFor(() => frame.evaluate(() => document.getElementById('rstat')!.textContent === 'Export cancelled.'), 'cancelled');
      expect(calls.some((c) => c.name === 'save_export')).toBe(false);
      // Playback controls come back.
      await waitFor(() => frame.evaluate(() => !(document.getElementById('play') as HTMLButtonElement).disabled), 'controls enabled');
    } finally {
      await page.close();
    }
  });
});
