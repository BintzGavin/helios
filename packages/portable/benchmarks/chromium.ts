import { createServer, type Server } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, type Browser, type Page, type CDPSession } from 'playwright';
import type { Plan } from '../src/plan.js';
import { prepareScene, renderFrame, probeVideo, videoEncoderArgs, type PreparedScene, type AssetFiles } from '../src/render.js';
import { NativeBackend, type RenderBackend } from '../src/backend.js';
import { startProcess, runProcess } from '../src/process.js';

/** Benchmark-only browser canvas + native media + lossless CDP capture.
 * Uses the same plan interpreter, pre-shaped glyph paths and software encoder.
 * This is not a benchmark of arbitrary HTML compositions or WebCodecs export.
 */
export class ChromiumBackend implements RenderBackend {
  readonly identity = 'benchmark/chromium-canvas-capture-v1';
  version = '';
  private browser?: Browser;
  private page?: Page;
  private cdp?: CDPSession;
  private server?: Server;
  private prepared?: PreparedScene;
  private base: NativeBackend;
  constructor(private executablePath: string, private tools: { ffmpeg?: string; ffprobe?: string } = {}) { this.base = new NativeBackend(tools); }
  async preflight(plan: Plan, assets: AssetFiles, signal: AbortSignal): Promise<void> {
    this.prepared = await prepareScene(plan, assets, { ...this.tools, signal }, true);
    await renderFrame(plan, 0, assets, { ...this.tools, signal, prepared: this.prepared });
    await runProcess(this.tools.ffmpeg ?? 'ffmpeg', ['-version'], { signal });
  }
  private async open(plan: Plan, assets: AssetFiles) {
    const prepared = this.prepared ??= await prepareScene(plan, assets, this.tools);
    const bundle = await build({ entryPoints: [fileURLToPath(new URL('./chromium-entry.ts', import.meta.url))], bundle: true, platform: 'browser', format: 'iife', write: false, plugins: [{
      name: 'browser-canvas-boundary', setup(builder) {
        builder.onResolve({ filter: /\/skia-binding\.js$/ }, () => ({ path: 'canvas', namespace: 'benchmark' }));
        builder.onLoad({ filter: /.*/, namespace: 'benchmark' }, () => ({ contents: `export const Path2D=window.Path2D, ImageData=window.ImageData; let first=true; export function createCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;if(first){first=false;document.body.append(c)}return c} export async function loadImage(bytes){const image=new Image();const url=URL.createObjectURL(new Blob([bytes]));image.src=url;await image.decode();URL.revokeObjectURL(url);return image}`, loader: 'js' }));
        builder.onResolve({ filter: /\/text\.js$/ }, () => ({ path: 'text', namespace: 'shaped' }));
        builder.onLoad({ filter: /.*/, namespace: 'shaped' }, () => ({ contents: `export function layoutText(){throw new Error('Benchmark requires the frozen pre-shaped text width')}`, loader: 'js' }));
      },
    }] });
    this.server = createServer(async (req, res) => {
      const id = (req.url ?? '').slice(1), path = assets.get(id);
      if (!path) { res.writeHead(404).end(); return; }
      const size = (await stat(path)).size, range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
      const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.writeHead(416).end(); return; }
      res.writeHead(range ? 206 : 200, { 'Content-Type': plan.assets[id].type === 'video' ? 'video/mp4' : 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
      createReadStream(path, { start, end }).pipe(res);
    });
    await new Promise<void>(done => this.server!.listen(0, '127.0.0.1', done));
    const port = (this.server.address() as { port: number }).port;
    this.browser = await chromium.launch({ executablePath: this.executablePath, headless: true, args: ['--force-color-profile=srgb'] });
    this.version = this.browser.version();
    this.page = await this.browser.newPage({ viewport: { width: plan.width, height: plan.height }, deviceScaleFactor: 1 });
    await this.page.setContent('<!doctype html><style>html,body{margin:0;overflow:hidden;background:black}canvas{display:block}</style>');
    await this.page.addScriptTag({ content: bundle.outputFiles[0].text });
    await this.page.evaluate(async (input) => (window as any).loadScene(input), {
      plan, base: `http://127.0.0.1:${port}`, text: [...prepared.text], videos: [...prepared.videos],
      images: [...prepared.images].map(([id, bytes]) => [id, bytes.toString('base64')]),
    });
    this.cdp = await this.page.context().newCDPSession(this.page);
  }
  async chunk(plan: Plan, assets: AssetFiles, output: string, start: number, end: number, signal: AbortSignal): Promise<void> {
    if (!this.page) await this.open(plan, assets);
    const encoder = startProcess(this.tools.ffmpeg ?? 'ffmpeg', videoEncoderArgs(plan, end - start, output, 'png'), { signal, timeoutMs: 300000 });
    encoder.child.stdout.resume();
    try {
      for (let index = start; index < end; index++) {
        signal.throwIfAborted();
        await this.page!.evaluate(async frame => (window as any).drawFrame(frame), index);
        const { data } = await this.cdp!.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
        if (!encoder.child.stdin.write(Buffer.from(data, 'base64'))) await Promise.race([once(encoder.child.stdin, 'drain'), encoder.done.then(() => { throw new Error('Chromium capture encoder exited early'); })]);
      }
      encoder.child.stdin.end(); await encoder.done;
    } catch (error) { encoder.kill(); await encoder.done.catch(() => {}); throw error; }
    const info = await probeVideo(output, this.tools);
    if (info.frameCount !== end - start) throw new Error('Chromium output frame count mismatch');
  }
  finalize: RenderBackend['finalize'] = (...args) => this.base.finalize(...args);
  async screenshot(index: number): Promise<Buffer> {
    await this.page!.evaluate(async frame => (window as any).drawFrame(frame), index);
    const { data } = await this.cdp!.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
    return Buffer.from(data, 'base64');
  }
  async close() { await this.browser?.close(); await new Promise<void>(done => this.server ? this.server.close(() => done()) : done()); }
}
