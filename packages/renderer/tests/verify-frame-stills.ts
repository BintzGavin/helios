/**
 * captureFrames() and captureContactSheet() render frames straight from a page, without
 * encoding a video, so an agent can look at its work: each still must show the frame at
 * exactly the requested time, crops must cut the requested region, and a sheet must lay
 * the frames out in a labelled grid.
 */
import { captureFrames, captureContactSheet } from '../src/index';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(path.join(__dirname, 'fixtures', 'frame-exact-render-at.html')).href;

function pngSize(png: Buffer): { width: number; height: number } {
  // IHDR: width and height are big-endian uint32 at bytes 16 and 20.
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** First lit pixel on row y of a PNG, via ffmpeg's decoder. */
function firstLitX(png: Buffer, y: number): number {
  const { width, height } = pngSize(png);
  const result = spawnSync(ffmpegInstaller.path, ['-v', 'error', '-f', 'png_pipe', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { input: png, maxBuffer: 16 * 1024 * 1024 });
  const raw: Buffer = result.stdout;
  if (raw.length < width * height) throw new Error('could not decode PNG');
  for (let x = 0; x < width; x++) if (raw[y * width + x] > 128) return x;
  return -1;
}

async function main() {
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    console.log(`${ok ? '✅' : '❌'} ${message}`);
    if (!ok) failures.push(message);
  };

  // The fixture draws a 20px box at x = 100 * t on a 320x180 canvas.
  const times = [0, 0.5, 1.23, 0.1];
  const stills = await captureFrames(page, times, { width: 320, height: 180 });
  check(stills.length === times.length, `captureFrames returns one PNG per time (${stills.length})`);
  stills.forEach((png, i) => {
    const size = pngSize(png);
    const x = firstLitX(png, 90);
    const expected = Math.round(100 * times[i]);
    check(size.width === 320 && size.height === 180 && Math.abs(x - expected) <= 1,
      `still at t=${times[i]}s is 320x180 with the box at x=${x} (expected ${expected})`);
  });

  const [cropped] = await captureFrames(page, [1], { width: 320, height: 180, crop: { x: 90, y: 70, width: 60, height: 40 } });
  const cropSize = pngSize(cropped);
  check(cropSize.width === 60 && cropSize.height === 40, `crop is 60x40 (${cropSize.width}x${cropSize.height})`);
  // The box sits at x = 100 at t = 1, so 10px into a crop that starts at x = 90.
  check(Math.abs(firstLitX(cropped, 20) - 10) <= 1, `crop keeps the requested region (box at x=${firstLitX(cropped, 20)}, expected 10)`);

  const sheet = await captureContactSheet(page, [0, 0.5, 1, 1.5, 2], { width: 320, height: 180, columns: 3, cellWidth: 160 });
  const sheetSize = pngSize(sheet);
  // 3 columns of 160px plus gaps, 2 rows of 90px images plus labels and gaps.
  check(sheetSize.width >= 3 * 160 && sheetSize.width < 3 * 160 + 80, `sheet is 3 cells wide (${sheetSize.width}px)`);
  check(sheetSize.height >= 2 * 90 && sheetSize.height < 2 * 90 + 160, `sheet has 2 rows (${sheetSize.height}px)`);

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} still/sheet check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ Stills, crops and contact sheets show the requested frames.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
