import { expect, it } from 'vitest';
import { parsePlan } from '../src/plan.js';
import { prepareScene, renderFrame } from '../src/render.js';
import { SkiaRasterizer } from '../src/skia.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { digest } from '../src/storage.js';
import { Resvg } from '@resvg/resvg-js';
import { createCanvas, Path2D } from '../src/skia-binding.js';

it('preserves exact source pixels for an unscaled image at integer coordinates', async () => {
  const image = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#ffffff"/><rect width="1" height="1" fill="#00ffff"/></svg>').render().asPng();
  const plan = parsePlan({ version: 'portable-v1', width: 8, height: 8, fps: { num: 30, den: 1 }, frameCount: 2, background: '#112233', assets: { image: { sha256: digest(image), bytes: image.length, type: 'image' } }, nodes: [{ id: 'picture', type: 'image', asset: 'image', x: 2, y: 2, width: 4, height: 4 }] });
  const prepared = { fonts: new Map(), text: new Map(), images: new Map([['image', image]]), videos: new Map(), frames: new Map() };
  const renderer = new SkiaRasterizer(plan, prepared); await renderer.prepare();
  const expected = (await renderFrame(plan, 0, new Map(), { prepared })).pixels;
  expect(renderer.render(0).pixels).toEqual(expected);
  expect(renderer.render(1).pixels).toEqual(expected);
});

it('keeps disconnected glyph contours disconnected when retaining shaped text', async () => {
  const path = fileURLToPath(new URL('./fixtures/fonts/NotoSans-Regular.ttf', import.meta.url)), bytes = await readFile(path);
  const plan = parsePlan({ version: 'portable-v1', width: 640, height: 100, fps: { num: 30, den: 1 }, frameCount: 1, background: '#000000', assets: { font: { sha256: digest(bytes), bytes: bytes.length, type: 'font' } }, nodes: [{ id: 'text', type: 'text', text: 'Helios production rendering', fonts: ['font'], fontSize: 40, width: 640, fill: '#ffffff' }] });
  const assets = new Map([['font', path]]), prepared = await prepareScene(plan, assets);
  const reference = (await renderFrame(plan, 0, assets, { prepared })).pixels;
  const scene = new SkiaRasterizer(plan, prepared); await scene.prepare(); const actual = scene.render(0).pixels;
  let unexpectedInk = 0;
  for (let y = 3; y < 97; y++) for (let x = 3; x < 637; x++) {
    let empty = true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (reference[((y + dy) * 640 + x + dx) * 4] !== 0) empty = false;
    if (empty && actual[(y * 640 + x) * 4] > 8) unexpectedInk++;
  }
  expect(unexpectedInk).toBe(0);
});

it('isolates group opacity and preserves clipping across shuffled retained frames', async () => {
  const plan = parsePlan({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 31, background: '#ffffff', nodes: [
    { id: 'group', type: 'group', x: 20, y: 10, opacity: 0.5, clip: { type: 'rect', width: 60, height: 60 }, children: [
      { id: 'red', type: 'rect', width: 50, height: 50, fill: '#ff0000' },
      { id: 'blue', type: 'rect', x: 20, y: 10, width: 50, height: 50, fill: '#0000ff' },
    ] },
    { id: 'moving', type: 'rect', x: { keyframes: [{ frame: 0, value: 100 }, { frame: 30, value: 130 }] }, y: 10, width: 20, height: 20, fill: '#00ff00' },
  ] });
  const prepared = await prepareScene(plan, new Map()), renderer = new SkiaRasterizer(plan, prepared);
  await renderer.prepare();
  const first = renderer.render(0).pixels;
  const pixel = (data: Buffer, x: number, y: number) => [...data.subarray((y * 160 + x) * 4, (y * 160 + x) * 4 + 4)];
  expect(pixel(first, 50, 40)).toEqual([127, 127, 255, 255]);
  expect(pixel(first, 85, 40)).toEqual([255, 255, 255, 255]);
  for (const index of [30, 15, 0]) {
    const frame = renderer.render(index).pixels;
    const oracle = (await renderFrame(plan, index, new Map(), { prepared })).pixels;
    for (const [x, y] of [[25, 20], [50, 40], [85, 40], [105, 20], [135, 20]]) {
      const a = pixel(frame, x, y), b = pixel(oracle, x, y);
      expect(a.every((value, channel) => Math.abs(value - b[channel]) <= 1)).toBe(true);
    }
  }
  expect(renderer.render(0).pixels).toEqual(first);
});

it('rejects out-of-range frames instead of reusing the preceding retained image', async () => {
  const plan = parsePlan({ version: 'portable-v1', width: 20, height: 20, fps: { num: 30, den: 1 }, frameCount: 1, nodes: [] });
  const renderer = new SkiaRasterizer(plan, await prepareScene(plan, new Map()));
  await renderer.prepare();
  expect(() => renderer.render(1)).toThrow();
});


it('preserves translucent glyph composition at clipped, transformed and offscreen edges', async () => {
  const names = ['NotoSans-Regular.ttf', 'NotoSansArabic-Regular.ttf', 'NotoSansDevanagari-Regular.ttf'];
  const assets: any = {}, paths = new Map<string, string>();
  for (const [index, name] of names.entries()) {
    const path = fileURLToPath(new URL(`./fixtures/fonts/${name}`, import.meta.url)), bytes = await readFile(path);
    assets[`font${index}`] = { type: 'font', bytes: bytes.length, sha256: digest(bytes) }; paths.set(`font${index}`, path);
  }
  const plan = parsePlan({ version: 'portable-v1', width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 3, background: '#ffffff', assets, nodes: [
    { id: 'text', type: 'text', text: 'office مرحبا नमस्ते', fonts: Object.keys(assets), fontSize: 38, width: 300, x: -15, y: 10, opacity: 0.5, clip: { type: 'rect', width: 270, height: 120 }, transform: { rotation: { keyframes: [{ frame: 0, value: -8 }, { frame: 2, value: 9 }] }, scaleX: 1.1, scaleY: 0.9 }, fill: '#112233' },
  ] });
  const prepared = await prepareScene(plan, paths), renderer = new SkiaRasterizer(plan, prepared);
  await renderer.prepare();
  const first = renderer.render(0).pixels;
  for (const frame of [2, 1, 0]) {
    const pixels = renderer.render(frame).pixels;
    const fresh = new SkiaRasterizer(plan, await prepareScene(plan, paths)); await fresh.prepare();
    expect(pixels).toEqual(fresh.render(frame).pixels);
    // Full-frame isolation is the reference composition; it uses no crop bounds.
    const reference = createCanvas(320, 180), layer = createCanvas(320, 180);
    const target = reference.getContext('2d'), ink = layer.getContext('2d');
    target.fillStyle = '#ffffff'; target.fillRect(0, 0, 320, 180);
    target.translate(-15, 10); target.rotate((-8 + frame * 8.5) * Math.PI / 180); target.scale(1.1, 0.9);
    target.beginPath(); target.rect(0, 0, 270, 120); target.clip();
    ink.setTransform(target.getTransform()); ink.fillStyle = '#112233';
    for (const glyph of prepared.text.get('text')!.paths) {
      ink.save(); ink.translate(glyph.x, glyph.y); ink.scale(glyph.scale, -glyph.scale); ink.fill(new Path2D(glyph.d)); ink.restore();
    }
    target.resetTransform(); target.globalAlpha = 127 / 255; target.drawImage(layer, 0, 0);
    const expected = target.getImageData(0, 0, 320, 180).data;
    let peak = 0;
    for (let i = 0; i < pixels.length; i++) peak = Math.max(peak, Math.abs(pixels[i] - expected[i]));
    expect(peak).toBeLessThanOrEqual(2);
    // Compare interior coverage with an independently parsed SVG renderer.
    const oracle = (await renderFrame(plan, frame, paths, { prepared })).pixels;
    let lostInk = 0;
    for (let y = 2; y < 178; y++) for (let x = 2; x < 318; x++) {
      let solid = true;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (oracle[((y + dy) * 320 + x + dx) * 4] > 200) solid = false;
      if (solid && pixels[(y * 320 + x) * 4] > 210) lostInk++;
    }
    expect(lostInk).toBe(0);
  }
  expect(renderer.render(0).pixels).toEqual(first);
});
