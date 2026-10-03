import { expect, it } from 'vitest';
import { recordGpuCanvas, validateGpuOptions } from '../src/gpu.js';
import type { CanvasComposition } from '../src/canvas.js';

const scene: CanvasComposition = { width: 64, height: 32, fps: { num: 30, den: 1 }, frameCount: 4, background: '#000000', draw() {} };

it('fills full-circle paths using construction-time transforms and fill-time paint', async () => {
  const frame = await recordGpuCanvas({ ...scene, draw(ctx) {
    ctx.scale(2, 3); ctx.translate(4, 5);
    ctx.beginPath(); ctx.arc(6, 7, 8, 0, Math.PI * 2); ctx.closePath();
    ctx.save(); ctx.translate(100, 200); ctx.fillStyle = '#ff0000'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#00ff00'; ctx.fill('evenodd');
  } }, 0);
  const circles = frame.commands.filter(command => command.op === 'circle');
  expect(circles).toEqual([
    { op: 'circle', args: [6, 7, 8], matrix: [2, 0, 0, 3, 8, 15], color: [1, 0, 0, 1] },
    { op: 'circle', args: [6, 7, 8], matrix: [2, 0, 0, 3, 8, 15], color: [0, 1, 0, 1] },
  ]);
});

it('keeps paths independent of save/restore and clears them only at beginPath', async () => {
  const frame = await recordGpuCanvas({ ...scene, draw(ctx) {
    ctx.beginPath(); ctx.arc(1, 2, 3, 4, 4 - Math.PI * 2, true);
    ctx.save(); ctx.beginPath(); ctx.arc(4, 5, 6, 0, Math.PI * 2); ctx.restore(); ctx.fill();
    ctx.beginPath(); ctx.fill(); ctx.arc(1, 2, 0, 0, Math.PI * 2); ctx.fill();
  } }, 0);
  expect(frame.commands.filter(command => command.op === 'circle')).toEqual([
    { op: 'circle', args: [4, 5, 6], matrix: [1, 0, 0, 1, 0, 0], color: [0, 0, 0, 1] },
  ]);
});

it('refuses unsupported path geometry and invalid circle coordinates explicitly', async () => {
  for (const draw of [
    (ctx: any) => { ctx.beginPath(); ctx.arc(1, 2, 3, 0, Math.PI); },
    (ctx: any) => { ctx.beginPath(); ctx.arc(1, 2, 3, 0, Math.PI * 2); ctx.arc(4, 5, 6, 0, Math.PI * 2); },
    (ctx: any) => { ctx.fill({}); },
    (ctx: any) => { ctx.beginPath(); ctx.arc(1, 2, -1, 0, Math.PI * 2); },
    (ctx: any) => { ctx.beginPath(); ctx.arc(Infinity, 2, 3, 0, Math.PI * 2); },
  ]) await expect(recordGpuCanvas({ ...scene, draw }, 0)).rejects.toBeDefined();
});

it('enforces command and stack budgets while admitting the 100k-draw scene', async () => {
  const draw = (count: number) => (ctx: any) => { for (let i = 0; i < count; i++) ctx.fillRect(0, 0, 1, 1); };
  expect((await recordGpuCanvas({ ...scene, draw: draw(120000) }, 0)).commands).toHaveLength(120000);
  await expect(recordGpuCanvas({ ...scene, draw: draw(120001) }, 0)).rejects.toMatchObject({ code: 'GPU_RESOURCE_LIMIT' });
  await expect(recordGpuCanvas({ ...scene, draw(ctx) { for (let i = 0; i < 65; i++) ctx.save(); } }, 0)).rejects.toMatchObject({ code: 'GPU_RESOURCE_LIMIT' });
  await expect(recordGpuCanvas({ ...scene, fonts: { pinned: new Uint8Array() }, draw(ctx) { ctx.font = '12px pinned'; ctx.fillText('x'.repeat(20001), 0, 0); } }, 0)).rejects.toMatchObject({ code: 'GPU_RESOURCE_LIMIT' });
});

it('validates explicit GPU GOP while retaining the omitted default', () => {
  for (const gop of [0, -1, 1.5, NaN, Infinity, 301]) expect(() => validateGpuOptions({ gop } as any)).toThrow(/GOP/);
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    expect(() => validateGpuOptions({})).not.toThrow();
    expect(() => validateGpuOptions({ gop: 30 } as any)).not.toThrow();
    expect(() => validateGpuOptions({ gop: 300 } as any)).not.toThrow();
  }
});

it('rejects serialized UTF-8 frame overflow even below the command-count ceiling', async () => {
  let draws = 0;
  await expect(recordGpuCanvas({ ...scene, draw(ctx) {
    ctx.rotate(0.123456789012345); ctx.scale(1.234567890123456, 1.987654321098765); ctx.translate(123.4567890123456, 234.5678901234567);
    ctx.fillStyle = '#010203';
    ctx.globalAlpha = 0.123456789012345;
    for (let i = 0; i < 119000; i++) {
      ctx.beginPath(); ctx.arc(1.234567890123456, 2.345678901234567, 3.456789012345678, 0, Math.PI * 2); ctx.fill(); draws++;
    }
  } }, 0)).rejects.toMatchObject({ code: 'GPU_RESOURCE_LIMIT' });
  expect(draws).toBe(119000);
});
