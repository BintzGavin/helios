/** Real local workflow smoke: never reads credentials or publishes a listener. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { createServer } from 'vite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { studioApiPlugin } from '../../packages/studio/src/server/plugin';
import { createMcpHttpHandler } from '../../packages/studio/src/server/mcp-http';
import { createWorkflow } from './package/workflow.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { chromium } from 'playwright';
import { createApp } from './package/app-handler.js';

const output = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), 'helios-kody-demo.mp4'));
const repository = path.resolve(import.meta.dirname, '../..');
if (output.startsWith(repository + path.sep)) throw new Error('Save demo output outside the repository.');
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'helios-kody-demo-')));
const vite = await createServer({
  configFile: false, root, logLevel: 'error',
  resolve: { alias: { '@helios-project/core': path.join(repository, 'packages/core/dist/index.js') } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, path.join(repository, 'packages/core/dist')] } },
  plugins: [studioApiPlugin({ projectRoot: root })],
});
const client = new Client({ name: 'helios-kody-local-check', version: '1' });
const store = new Map();
let handler: ReturnType<typeof createMcpHttpHandler> | undefined;
let gateway: ReturnType<typeof createHttpServer> | undefined;
let playbackServer: ReturnType<typeof createHttpServer> | undefined;
try {
  await vite.listen();
  const port = (vite.httpServer!.address() as any).port;
  const malformedHost = await new Promise<number | undefined>((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path: '/api/renders/render-missing.mp4', headers: { host: '%' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.setTimeout(1000, () => req.destroy(new Error('Malformed Host request hung'))); req.end();
  });
  if (malformedHost !== 403) throw new Error('Malformed local output Host was not rejected.');
  // The test identity is supplied inside the process. Remote production uses
  // the OS secret-store authenticator; these are different validation scopes.
  handler = createMcpHttpHandler(() => port, {
    projectRoot: root, allowedHosts: ['127.0.0.1'], allowedOrigins: [],
    authenticate: async req => req.socket.remoteAddress === '127.0.0.1' ? 'local-fixture-owner' : undefined,
  });
  gateway = createHttpServer(handler.handle);
  await new Promise<void>(resolve => gateway!.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${(gateway.address() as any).port}`;
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint + '/mcp')));
  const mcp = new Proxy({}, { get: (_target, name) => async (args: any) => {
    const result = await client.callTool({ name: String(name), arguments: args });
    // Kody's documented downstream wrapping contract.
    return { __mcpContent: result.content, __mcpIsError: result.isError };
  } });
  const workflow = createWorkflow(mcp, { get: async (key: string) => store.get(key), set: async (key: string, value: unknown) => { store.set(key, value); } });
  const job = await workflow.start({ requestId: 'make-an-idea-move', template: 'title-explainer', title: 'Make an idea move.', subtitle: 'One brief. A composition. A finished film.', duration: 8 });
  console.log(`Created composition ${job.compositionId}; render ${job.jobId}`);
  const deadline = Date.now() + 180000;
  let status;
  do {
    status = await workflow.status({ jobId: job.jobId, waitMs: 10000 });
    console.log(`Render ${status.status}: ${Math.round(status.progress * 100)}%`);
    if (Date.now() > deadline) { await workflow.cancel({ jobId: job.jobId }); throw new Error('Real render exceeded 180 seconds.'); }
  } while (['queued', 'rendering'].includes(status.status));
  if (status.status !== 'completed') throw new Error(`Render ${status.status}: ${status.error ?? ''}`);
  const response = await workflow.video(new Request('https://local-check.invalid/video/' + job.jobId), job.jobId);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, bytes);
  // Verify the direct output route returns the same actual bytes as the package.
  const direct = await fetch(`${endpoint}/mcp/outputs/${job.jobId}`);
  if (!bytes.equals(Buffer.from(await direct.arrayBuffer()))) throw new Error('MCP and HTTP output differ.');
  // Decode actual video frames: black/frozen output must fail this smoke even
  // when the renderer and byte transfer both report success.
  const run = promisify(execFile);
  const probe = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,nb_frames,avg_frame_rate', '-of', 'json', output])).stdout);
  if (Number(probe.format.duration) !== 8 || probe.streams[0].nb_frames !== '192' || probe.streams[0].avg_frame_rate !== '24/1') throw new Error('Unexpected video duration or frame rate.');
  const { stdout: pixels } = await run('ffmpeg', ['-v', 'error', '-i', output, '-vf', 'select=eq(n\\,0)+eq(n\\,96),crop=1000:330:70:100,scale=100:33', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', maxBuffer: 1024 * 1024 });
  const frameBytes = 100 * 33 * 3;
  const lightPixels = (frame: Buffer) => { let count = 0; for (let i = 0; i < frame.length; i += 3) if (frame[i] > 170 && frame[i + 1] > 170 && frame[i + 2] > 150) count++; return count; };
  if (pixels.length !== frameBytes * 2 || lightPixels(pixels.subarray(frameBytes)) <= lightPixels(pixels.subarray(0, frameBytes)) + 80) throw new Error('Decoded title frames are black, frozen, or start at the wrong time.');
  const app = createApp(() => workflow, () => ({ hostedUrl: 'https://local-check.invalid', appBasePath: '' }));
  playbackServer = createHttpServer(async (req, res) => {
    const response = await app.fetch(new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers as Record<string, string> }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body as any).pipe(res); else res.end();
  });
  await new Promise<void>(resolve => playbackServer!.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://127.0.0.1:${(playbackServer.address() as any).port}/watch/${job.jobId}`);
    await page.waitForFunction(() => { const video = document.querySelector('video')!; return video.readyState >= 2 && video.videoWidth === 1280; });
    await page.evaluate(async () => {
      const video = document.querySelector('video')!;
      video.muted = true;
      const sought = new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
      video.currentTime = 4; await sought; await video.play();
    });
    await page.waitForFunction(() => document.querySelector('video')!.currentTime > 4.2);
    await page.evaluate(() => document.querySelector('video')!.pause());
    await page.screenshot({ path: output.replace(/\.mp4$/, '-playback.png') });
    console.log('Browser playback and seeking passed through the package app and MCP chunk reads.');
  } finally { await browser.close(); }

  // Actual browser failure, then real cancellation through the same tool path.
  const tool = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    return JSON.parse((result.content as any[])[0].text);
  };
  const broken = await tool('create_composition', { name: 'broken-render-check', template: 'title-explainer', width: 160, height: 90, fps: 24, duration: .25 });
  const file = path.join(root, broken.id, 'composition.html');
  await fs.appendFile(file, '<script>throw new Error("Intentional render failure fixture")</script>');
  const failedJob = await tool('render_composition', { compositionId: broken.id, mode: 'dom' });
  let failure;
  do { failure = await tool('get_render_status', { jobId: failedJob.jobId, waitMs: 1000 }); }
  while (['queued', 'rendering'].includes(failure.status) && Date.now() < deadline);
  if (failure.status !== 'failed') throw new Error('Browser failure did not become a failed render job.');
  const cancelledJob = await tool('render_composition', { compositionId: job.compositionId, mode: 'dom' });
  const cancellation = await tool('cancel_render', { jobId: cancelledJob.jobId });
  if (cancellation.status !== 'cancelled') throw new Error('Render cancellation was not recorded.');
  console.log('Real browser failure and render cancellation passed through MCP.');
  console.log(`Verified ${bytes.length} bytes through package, MCP, and output route. Saved ${output}`);
} finally {
  await client.close();
  await handler?.close(); gateway?.closeAllConnections(); gateway?.close();
  playbackServer?.closeAllConnections(); playbackServer?.close();
  await vite.close();
  await fs.rm(root, { recursive: true, force: true });
}
