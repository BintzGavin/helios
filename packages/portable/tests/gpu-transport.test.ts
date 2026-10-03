import { expect, it, describe } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordGpuCanvas, recordGpuCanvasBinary } from '../src/gpu.js';
import type { CanvasComposition } from '../src/canvas.js';

const scene: CanvasComposition = { width: 128, height: 128, fps: { num: 30, den: 1 }, frameCount: 4, background: '#ffffff', draw() {} };
const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));

it('admits the public 100k-circle scene without command objects or JSON expansion', async () => {
  const frame = await recordGpuCanvasBinary({ ...scene, draw(ctx) {
    ctx.fillStyle = '#010203';
    for (let i = 0; i < 100000; i++) { ctx.beginPath(); ctx.arc(i % 100, 20, 3, 0, Math.PI * 2); ctx.fill(); }
  } }, 0);
  expect(Buffer.isBuffer(frame)).toBe(true);
  expect(frame.byteLength).toBe(32 + 100000 * 56);
  expect(frame.readUInt32LE(8)).toBe(100000);
  expect(frame.readUInt32LE(4)).toBe(frame.byteLength);
});

it('retains command, stack, geometry and text budgets before native submission', async () => {
  for (const draw of [
    (ctx: any) => { for (let i = 0; i < 120001; i++) ctx.fillRect(0, 0, 1, 1); },
    (ctx: any) => { for (let i = 0; i < 65; i++) ctx.save(); },
    (ctx: any) => { ctx.beginPath(); ctx.arc(Infinity, 0, 1, 0, Math.PI * 2); },
    (ctx: any) => { ctx.font = '12px pinned'; ctx.fillText('x'.repeat(20001), 0, 0); },
    (ctx: any) => { ctx.font = '12px pinned'; ctx.fillText('\ud800', 0, 0); },
  ]) await expect(recordGpuCanvasBinary({ ...scene, fonts: { pinned: new Uint8Array() }, draw }, 0)).rejects.toBeDefined();
  expect((await recordGpuCanvasBinary({ ...scene, draw(ctx) { for (let i = 0; i < 120000; i++) ctx.fillRect(0, 0, 1, 1); } }, 0)).readUInt32LE(8)).toBe(120000);
});

it('keeps earlier paint immutable when a cached color is reused with another alpha', async () => {
  const frame = await recordGpuCanvas({ ...scene, draw(ctx) {
    ctx.fillStyle = '#ff0000'; ctx.globalAlpha = 0.25; ctx.fillRect(1, 2, 3, 4);
    ctx.globalAlpha = 1; ctx.fillRect(5, 6, 7, 8);
  } }, 0);
  expect(frame.commands.map(command => command.color)).toEqual([[1, 0, 0, 0.25], [1, 0, 0, 1]]);
});

describe.runIf(process.platform === 'darwin' && process.arch === 'arm64' && existsSync(helper))('native binary command boundary', () => {
  const invoke = (mode: string, frames: Buffer[], fonts: Record<string, string> = {}) => spawnSync(helper, [mode, '128', '128', '30', '1', '4000000', '/unused'], { input: Buffer.concat([Buffer.from(JSON.stringify({ fonts }) + '\n'), ...frames]), timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  it('matches JSON RGBA and NV12 exactly for path state, paint, transforms, pinned text and shuffled seeking', async () => {
    const font = await readFile(new URL('./fixtures/fonts/NotoSans-Regular.ttf', import.meta.url));
    const composition: CanvasComposition = { ...scene, fonts: { pinned: font }, draw(ctx, { index }) {
      ctx.fillStyle = '#abcdef'; ctx.fillRect(20, 30, -12, -20);
      ctx.save(); ctx.scale(1.7, 0.8); ctx.translate(3, 5); ctx.rotate(0.15);
      ctx.beginPath(); ctx.arc(25 + index, 40, 14, 0, Math.PI * 2);
      ctx.save(); ctx.translate(40, 20); ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff0000'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#00ff00'; ctx.fill('evenodd'); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(85, 90, 10, 4, 4 - Math.PI * 2, true); ctx.restore(); ctx.fillStyle = '#0000ff'; ctx.fill();
      ctx.beginPath(); ctx.arc(1, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '18px pinned'; ctx.fillText('Aé🙂' + index, 12, 115);
    } };
    const json: Buffer[] = [], binary: Buffer[] = [];
    for (const index of [3, 0, 3]) { json.push(Buffer.from(JSON.stringify(await recordGpuCanvas(composition, index)) + '\n')); binary.push(await recordGpuCanvasBinary(composition, index)); }
    for (const mode of ['raster', 'reference']) {
      const control = invoke(mode, json, { pinned: font.toString('base64') }), result = invoke(mode + '-binary', binary, { pinned: font.toString('base64') });
      expect(control.status, control.stderr.toString()).toBe(0);
      expect(result.status, result.stderr.toString()).toBe(0);
      expect(result.stdout).toEqual(control.stdout);
      expect(JSON.parse(result.stderr.toString())).toMatchObject({ protocol: 5, transport: 'binary', frames: 3 });
    }
  }, 30000);
  it('independently rejects truncated, oversized, invalid, nonfinite and unbalanced packets without emitting pixels', () => {
    const packet = (words: number[]) => { const data = Buffer.alloc(32 + words.length * 4); data.writeUInt32LE(0x35464748, 0); data.writeUInt32LE(data.length, 4); data.writeUInt32LE(1, 8); data.writeFloatLE(1, 28); words.forEach((word, i) => data.writeUInt32LE(word >>> 0, 32 + i * 4)); return data; };
    const empty = packet([]); empty.writeUInt32LE(0, 8);
    const cases = [Buffer.from([1]), empty.subarray(0, 31), packet([99]), packet([5]), packet([7]), packet([4, 0x7f800000, 0]), packet([1]), packet([3, 0]), packet([2, 0, 0, 0xbf800000, ...new Array(10).fill(0)])];
    const oversized = Buffer.from(empty); oversized.writeUInt32LE(32 * 1024 * 1024 + 4, 4); cases.push(oversized);
    const count = Buffer.from(empty); count.writeUInt32LE(120001, 8); cases.push(count);
    const trailing = packet([4, 0]); trailing.writeUInt32LE(0, 8); cases.push(trailing);
    const reserved = Buffer.from(empty); reserved.writeUInt32LE(1, 12); cases.push(reserved);
    const alpha = Buffer.from(empty); alpha.writeFloatLE(0.5, 28); cases.push(alpha);
    // Text tag, x/y/size/RGBA, font bytes, text bytes; invalid UTF-8 and padding.
    const text = packet([8, 0, 0, 0x41400000, 0, 0, 0, 0x3f800000, 1, 1, 0xff, 0xff]); cases.push(text);
    const textOverflow = packet([8, 0, 0, 0x41400000, 0, 0, 0, 0x3f800000, 0xffffffff, 1]); cases.push(textOverflow);
    const paint = packet([1, 0, 0, 0x3f800000, 0x3f800000, 0x40000000, 0, 0, 0x3f800000]); cases.push(paint);
    const stack = packet(new Array(65).fill(6)); stack.writeUInt32LE(65, 8); cases.push(stack);
    for (const [index, input] of cases.entries()) { const result = invoke('raster-binary', [input]); expect(result.status, `case${index}: ${result.stderr}`).toBe(1); expect(result.stdout.length).toBe(0); }
  });
});
