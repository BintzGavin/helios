#!/usr/bin/env node
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parsePlan, RenderError } from './plan.js';
import { prepareScene, renderFrame, renderVideo, probeVideo, RenderOptions } from './render.js';
import { writeFile } from 'node:fs/promises';
import { NativeBackend } from './backend.js';
import { FileStore } from './storage.js';
import { RenderService } from './jobs.js';
import { createRenderServer, runWorker, HandlerOptions } from './server.js';

const help = `helios-portable (experimental)
  render PLAN.json --assets DIRECTORY --output VIDEO.mp4
  frame PLAN.json --assets DIRECTORY --frame 0 --output IMAGE.png
  inspect PLAN.json --assets DIRECTORY
  serve --data DIRECTORY --host 127.0.0.1 --port 8787

Assets are files named by their SHA-256 digest in DIRECTORY.
Render flags: --rasterizer native|wasm|skia|gpu --ffmpeg PATH --ffprobe PATH
Serve flags: --auth-module PATH | --trusted-network; --chunk-frames 60
A public listener requires an authorization module or an explicitly trusted network.
The Wasm option replaces rasterization only; codecs still run as native processes.`;

export async function runCli(argv: string[]): Promise<void> {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === 'help') { console.log(help); return; }
  if (!['render', 'frame', 'inspect', 'serve'].includes(command)) throw new RenderError('INVALID_ARGUMENT', 'Unknown command; use --help');
  const flags = new Map<string, string>(), positional: string[] = [];
  const allowed = command === 'serve' ? ['data', 'host', 'port', 'auth-module', 'trusted-network', 'chunk-frames', 'ffmpeg', 'ffprobe', 'rasterizer'] : ['assets', 'output', 'frame', 'ffmpeg', 'ffprobe', 'rasterizer'];
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { positional.push(args[i]); continue; }
    const name = args[i].slice(2);
    if (!allowed.includes(name) || flags.has(name)) throw new RenderError('INVALID_ARGUMENT', 'Unknown or repeated option');
    if (name === 'trusted-network') { flags.set(name, 'true'); continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new RenderError('INVALID_ARGUMENT', `Missing value for ${name}`);
    flags.set(name, args[++i]);
  }
  const rasterizer = flags.get('rasterizer') ?? 'native';
  if (rasterizer !== 'native' && rasterizer !== 'wasm' && rasterizer !== 'skia' && rasterizer !== 'gpu') throw new RenderError('INVALID_ARGUMENT', 'Rasterizer must be native, wasm, skia or gpu');
  const options: RenderOptions = { rasterizer, ffmpeg: flags.get('ffmpeg'), ffprobe: flags.get('ffprobe') };
  if (command === 'serve') {
    if (positional.length) throw new RenderError('INVALID_ARGUMENT', 'Unexpected argument');
    const host = flags.get('host') ?? '127.0.0.1', port = Number(flags.get('port') ?? 8787);
    const local = ['127.0.0.1', '::1', 'localhost'].includes(host);
    if (!local && !flags.has('auth-module') && !flags.has('trusted-network')) throw new RenderError('AUTH_REQUIRED', 'A public listener requires --auth-module or --trusted-network');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RenderError('INVALID_ARGUMENT', 'Port must be within 1..65535');
    let authorize: HandlerOptions['authorize'] = async () => 'private';
    if (flags.has('auth-module')) {
      const module = await import(pathToFileURL(resolve(flags.get('auth-module')!)).href);
      if (typeof module.authorize !== 'function') throw new RenderError('INVALID_ARGUMENT', 'Auth module must export authorize(request)');
      authorize = module.authorize;
    }
    const root = resolve(flags.get('data') ?? './portable-data');
    const service = new RenderService(new FileStore(root), new NativeBackend(options), { workspace: join(root, 'work'), chunkFrames: Number(flags.get('chunk-frames') ?? 60) });
    const server = createRenderServer(service, { authorize }), stop = new AbortController();
    await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, host, () => { server.removeListener('error', reject); done(); }); });
    console.log(`Portable renderer listening on ${host}:${port}; experimental qualification`);
    const shutdown = () => { stop.abort(); service.shutdown(); server.close(); };
    process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
    try { await runWorker(service, stop.signal); }
    finally { shutdown(); process.removeListener('SIGINT', shutdown); process.removeListener('SIGTERM', shutdown); await new Promise<void>(done => server.close(() => done())); }
    return;
  }
  if (positional.length !== 1) throw new RenderError('INVALID_ARGUMENT', 'Supply one plan JSON file');
  const plan = parsePlan(JSON.parse(await readFile(resolve(positional[0]), 'utf8')));
  const assets = new Map(Object.entries(plan.assets).map(([id, asset]) => [id, join(resolve(flags.get('assets') ?? dirname(positional[0])), asset.sha256)]));
  const prepared = await prepareScene(plan, assets, options, true);
  if (command === 'inspect') { console.log(JSON.stringify({ profile: plan.version, qualification: 'experimental', frames: plan.frameCount, assets: assets.size, rasterizer })); return; }
  if (!flags.has('output')) throw new RenderError('INVALID_ARGUMENT', 'Supply --output');
  const output = resolve(flags.get('output')!); await mkdir(dirname(output), { recursive: true });
  if (command === 'frame') await writeFile(output, (await renderFrame(plan, Number(flags.get('frame') ?? 0), assets, { ...options, prepared })).png);
  else { await renderVideo(plan, assets, output, { ...options, prepared }); console.log(JSON.stringify(await probeVideo(output, options))); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli(process.argv.slice(2)).catch(error => { console.error(error instanceof RenderError ? `${error.code}: ${error.message}` : 'Portable rendering failed; check inputs and installed tools'); process.exitCode = 1; });
}
