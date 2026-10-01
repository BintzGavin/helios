import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { CanvasFrameRenderer } from '../src/canvas.js';
import { videoEncoderArgs } from '../src/render.js';
import { startProcess } from '../src/process.js';
import { createTextGrid, TEXT_GRID } from './fframes-textgrid.mjs';

const args = process.argv.slice(2), option = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const directory = resolve(option('--out', '/tmp/helios-fframes-quality'));
const font = option('--font'), video = option('--video'), fframes = option('--fframes-bin');
if ((!font && !fframes) || !video) throw new Error('--video and either --font or --fframes-bin are required');
const conversion = option('--color-conversion', 'rgb-bt601');
if (!['rgb-bt601', 'srgb-bt709'].includes(conversion)) throw new Error('Invalid color conversion');
await mkdir(directory, { recursive: true });
const scene = fframes ? undefined : new CanvasFrameRenderer(createTextGrid(await readFile(font)));
const encoding = scene ? videoEncoderArgs(scene.plan, TEXT_GRID.frames, 'unused', 'rgba', { colorConversion: conversion as 'rgb-bt601' | 'srgb-bt709' }) : [];
const filter = scene ? encoding[encoding.indexOf('-vf') + 1] + ',' : '';
const ssimPath = join(directory, 'ssim.txt'), psnrPath = join(directory, 'psnr.txt');
const graph = `[0:v]split=2[a][b];[1:v]${filter}split=2[c][d];[a][c]ssim=stats_file='${ssimPath}'[s];[b][d]psnr=stats_file='${psnrPath}'[p]`;
const child = startProcess(option('--ffmpeg', 'ffmpeg'), ['-v', 'error', '-y', '-filter_complex_threads', '1', '-threads', '1', '-i', resolve(video), '-f', 'rawvideo', '-pix_fmt', fframes ? 'yuv420p' : 'rgba', '-s', `${TEXT_GRID.width}x${TEXT_GRID.height}`, '-r', String(TEXT_GRID.fps), '-i', 'pipe:0', '-filter_complex', graph, '-map', '[s]', '-map', '[p]', '-f', 'null', 'pipe:1'], { timeoutMs: 300000 });
child.child.stdout.resume();
const producer = fframes ? startProcess(fframes, ['--raw-yuv'], { timeoutMs: 300000 }) : undefined;
try {
  if (producer) {
    producer.child.stdin.end();
    await Promise.all([pipeline(producer.child.stdout, child.child.stdin), producer.done, child.done]);
  } else {
    for (let frame = 0; frame < TEXT_GRID.frames; frame++) {
      if (!child.child.stdin.write(await scene!.render(frame))) await Promise.race([once(child.child.stdin, 'drain'), child.done.then(() => { throw new Error('Quality oracle stopped before all frames'); })]);
    }
    child.child.stdin.end(); await child.done;
  }
} catch (error) { child.kill(); producer?.kill(); await Promise.allSettled([child.done, producer?.done]); throw error; }
finally { scene?.close(); }
function stats(text: string) {
  return text.trim().split('\n').filter(Boolean).map(line => Object.fromEntries([...line.matchAll(/([A-Za-z_]+):([\d.e+\-]+|inf)/g)].map(([, key, value]) => [key, value === 'inf' ? Infinity : Number(value)])));
}
const ssim = stats(await readFile(ssimPath, 'utf8')), psnr = stats(await readFile(psnrPath, 'utf8'));
const minimum = (rows: Record<string, number>[], key: string) => Math.min(...rows.map(row => row[key]));
const result = { video: resolve(video), conversion: fframes ? 'upstream-native-yuv420' : conversion, frames: ssim.length, psnrFrames: psnr.length, minSsimY: minimum(ssim, 'Y'), minPsnrY: minimum(psnr, 'psnr_y'), minPsnrU: minimum(psnr, 'psnr_u'), minPsnrV: minimum(psnr, 'psnr_v'), note: fframes ? 'All encoded frames versus independently regenerated upstream CPU render_frame output through its own native YUV converter, including top-left chroma sampling.' : 'All encoded frames versus independently regenerated uncompressed Canvas after the exact production color conversion. A fframes video without --fframes-bin is a cross-rasterizer comparison, not a codec-loss oracle.' };
const passed = result.frames === TEXT_GRID.frames && result.psnrFrames === TEXT_GRID.frames && result.minSsimY >= 0.995 && result.minPsnrY >= 40 && result.minPsnrU >= 35 && result.minPsnrV >= 35;
await writeFile(join(directory, 'quality.json'), JSON.stringify({ ...result, passed }, null, 2));
console.log(JSON.stringify({ ...result, passed }));
if (!passed) process.exitCode = 1;
