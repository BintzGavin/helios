import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('This function deployment is a Linux x64 candidate. Use a remote Linux build.');
const require = createRequire(import.meta.url), exec = promisify(execFile);
const paths = [
  [join(dirname(require.resolve('ffmpeg-static/package.json')), 'ffmpeg'), 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99'],
  [join(dirname(require.resolve('ffprobe-static/package.json')), 'bin/linux/x64/ffprobe'), 'e3624d8ff953c7e2f1f3e3ee24bfa64399bcb3bd5c302b2216d3f794b31bbbf6'],
];
let bytes = 0;
for (const [path, expected] of paths) {
  if (createHash('sha256').update(await readFile(path)).digest('hex') !== expected) throw new Error('Media executable differs from the pinned deployment build');
  bytes += (await stat(path)).size;
  await exec(path, ['-version'], { timeout: 10000, maxBuffer: 16384 });
}
const { Resvg } = await import('@resvg/resvg-js');
const raster = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#ff0000"/></svg>').render();
if (raster.pixels[0] !== 255 || raster.pixels[3] !== 255) throw new Error('Native graphics smoke failed');
const { createCanvas } = await import('./dist/skia-binding.js');
const canvas = createCanvas(2, 2), ctx = canvas.getContext('2d');
ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 2, 2);
if (ctx.getImageData(0, 0, 1, 1).data[0] !== 255) throw new Error('Skia graphics smoke failed');
ctx.reset();
if (ctx.getImageData(0, 0, 1, 1).data[3] !== 0) throw new Error('Skia surface reset failed');
console.log(JSON.stringify({ status: 'native-build-smoke-passed', codecBytes: bytes, qualified: false }));
