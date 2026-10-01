import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { parsePlan, frameTime } from '../src/plan.js';
import { prepareScene, frameSvg, videoEncoderArgs, probeVideo } from '../src/render.js';
import { VideoDecoder, activeVideos } from '../src/media.js';
import { SkiaRasterizer } from '../src/skia.js';
import { startProcess } from '../src/process.js';
import { once } from 'node:events';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const input = resolve(option('--assets', '/private/tmp/helios-portable-bench-final/assets'));
const output = resolve(option('--out', '/private/tmp/helios-portable-profile'));
await mkdir(output, { recursive: true });
const results = [];
const skia = option('--rasterizer', 'native') === 'skia';
for (const id of option('--cases', 'B01,B02,B03,B05,B08').split(',')) {
  const plan = parsePlan(JSON.parse(await readFile(join(input, `${id}.json`), 'utf8')));
  const assets = new Map(Object.entries(plan.assets).map(([key, asset]) => [key, join(input, asset.sha256)]));
  const started = performance.now(), prepared = await prepareScene(plan, assets);
  const phases: Record<string, number> = { prepare: performance.now() - started, decode: 0, evaluate: 0, parse: 0, resolve: 0, raster: 0, pixels: 0, encoderWrite: 0, encoderWait: 0, encoderTail: 0, verify: 0 };
  const retained = skia ? new SkiaRasterizer(plan, prepared) : undefined;
  if (retained) { const time = performance.now(); await retained.prepare(); phases.prepare += performance.now() - time; }
  const decoders = new Map<string, VideoDecoder>();
  const count = Math.min(Number(option('--frames', '90')), plan.frameCount);
  const video = join(output, `${id}-profile.mp4`);
  const encoder = args.includes('--encode') ? startProcess('ffmpeg', videoEncoderArgs(plan, count, video), { timeoutMs: 300000 }) : undefined;
  encoder?.child.stdout.resume();
  const feed = async (pixels: Buffer) => {
    if (!encoder) return;
    let time = performance.now(); const ready = encoder.child.stdin.write(pixels);
    phases.encoderWrite += performance.now() - time; time = performance.now();
    if (!ready) await Promise.race([once(encoder.child.stdin, 'drain'), encoder.done.then(() => { throw new Error('Profile encoder exited early'); })]);
    phases.encoderWait += performance.now() - time;
  };
  let completed = false;
  try {
    for (let index = 0; index < count; index++) {
      let time = performance.now();
      const active = activeVideos(plan, index), ids = new Set(active.map(node => node.id));
      retained?.retainVideos(ids);
      for (const [id, decoder] of decoders) if (!ids.has(id)) { await decoder.close(); decoders.delete(id); prepared.frames.delete(id); }
      for (const node of active) {
        const info = prepared.videos.get(node.asset!)!;
        const source = Math.floor(((node.sourceStart ?? 0) + frameTime(plan.fps, index - (node.start ?? 0))) * info.fps.num / info.fps.den + 1e-7);
        let decoder = decoders.get(node.id);
        if (!decoder) { decoder = new VideoDecoder(assets.get(node.asset!)!, source, info, { format: skia ? 'rgba' : 'png' }); decoders.set(node.id, decoder); }
        prepared.frames.set(node.id, await decoder.frame(source));
        if (retained) retained.setVideo(node.id, prepared.frames.get(node.id)!, info.width, info.height);
      }
      phases.decode += performance.now() - time; time = performance.now();
      if (retained) {
        const result = retained.render(index);
        phases.raster += performance.now() - time;
        await feed(result.pixels);
        if (!args.includes('--no-samples') && (index === 0 || index === count - 1)) {
          await writeFile(join(output, `${id}-${index}.rgba`), result.pixels);
          await writeFile(join(output, `${id}-${index}.png`), retained.render(index, true).png);
        }
        continue;
      }
      const svg = frameSvg(plan, index, prepared);
      phases.evaluate += performance.now() - time; time = performance.now();
      const renderer = new Resvg(svg, { font: { loadSystemFonts: false }, logLevel: 'off' });
      phases.parse += performance.now() - time; time = performance.now();
      for (const href of renderer.imagesToResolve()) {
        const name = href.slice('https://assets.invalid/'.length);
        renderer.resolveImage(href, (name.startsWith('video_') ? prepared.frames.get(name.slice(6)) : prepared.images.get(name.slice(6)))!);
      }
      phases.resolve += performance.now() - time; time = performance.now();
      const result = renderer.render();
      phases.raster += performance.now() - time; time = performance.now();
      const pixels = result.pixels;
      phases.pixels += performance.now() - time;
      await feed(pixels);
      if (!args.includes('--no-samples') && (index === 0 || index === count - 1)) {
        await writeFile(join(output, `${id}-${index}.rgba`), pixels);
        await writeFile(join(output, `${id}-${index}.png`), result.asPng());
      }
    }
    if (encoder) {
      let time = performance.now(); encoder.child.stdin.end(); await encoder.done;
      phases.encoderTail += performance.now() - time; time = performance.now();
      if ((await probeVideo(video)).frameCount !== count) throw new Error('Profile output frame count differs');
      phases.verify += performance.now() - time;
    }
    completed = true;
  } finally { if (!completed && encoder) { encoder.kill(); await encoder.done.catch(() => {}); } await Promise.all([...decoders.values()].map(d => d.close())); }
  const result = { id, rasterizer: skia ? 'skia' : 'native', dimensions: [plan.width, plan.height], frames: count, phasesMs: phases, includesEncoder: !!encoder };
  results.push(result); console.log(JSON.stringify(result));
}
await writeFile(join(output, 'profile.json'), JSON.stringify(results, null, 2));
