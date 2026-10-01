import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { digest } from '../src/storage.js';
import { parsePlan } from '../src/plan.js';
import { prepareScene, renderFrame } from '../src/render.js';

const fonts = ['NotoSans-Regular.ttf', 'NotoSansArabic-Regular.ttf', 'NotoSansDevanagari-Regular.ttf', 'NotoSansCJKsc-Regular.otf'];
async function fixture(text = 'Hello مرحبا नमस्ते 视频') {
  const assets: any = {}, paths = new Map<string, string>();
  for (let i = 0; i < fonts.length; i++) {
    const path = fileURLToPath(new URL(`./fixtures/fonts/${fonts[i]}`, import.meta.url));
    const bytes = await readFile(path), id = `font${i}`;
    paths.set(id, path); assets[id] = { type: 'font', bytes: bytes.length, sha256: digest(bytes) };
  }
  const plan = parsePlan({ version: 'portable-v1', width: 640, height: 180, fps: { num: 30, den: 1 }, frameCount: 2, background: '#ffffff', assets, nodes: [{ id: 'title', type: 'text', text, fonts: Object.keys(assets), fontSize: 32, width: 600, x: 20, y: 20, fill: '#112233' }] });
  return { plan, paths };
}
describe('text shaping and portable pixels', () => {
  it('lays out Latin, Arabic, Devanagari and CJK from explicit fonts', async () => {
    const { plan, paths } = await fixture();
    const prepared = await prepareScene(plan, paths);
    const frame = await renderFrame(plan, 0, paths, { prepared });
    expect(frame.svg).toContain('<path');
    expect(frame.svg).not.toContain('<text');
    expect(frame.pixels.some((v, i) => i % 4 !== 3 && v !== 255)).toBe(true);
    expect(prepared.text.get('title')?.lines).toHaveLength(1);
  });
  it('rejects missing glyphs instead of substituting tofu or silently dropping text', async () => {
    const { plan, paths } = await fixture('Missing \u{10FFFF}');
    await expect(prepareScene(plan, paths)).rejects.toMatchObject({ code: 'MISSING_GLYPH' });
  });
  it('wraps lines without splitting a Devanagari grapheme cluster', async () => {
    const { plan, paths } = await fixture('नमस्ते दुनिया नमस्ते दुनिया');
    plan.nodes[0].width = 150;
    const prepared = await prepareScene(plan, paths);
    const lines = prepared.text.get('title')!.lines;
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('नमस्ते दुनिया नमस्ते दुनिया');
  });
  it('matches native and Wasm rasterization with identical compiled glyph paths', async () => {
    const { plan, paths } = await fixture();
    const prepared = await prepareScene(plan, paths);
    const native = await renderFrame(plan, 0, paths, { prepared });
    const wasm = await renderFrame(plan, 0, paths, { prepared, rasterizer: 'wasm' });
    expect(wasm.pixels).toEqual(native.pixels);
  }, 30000);
});
