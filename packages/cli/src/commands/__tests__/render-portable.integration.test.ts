/**
 * `helios render` end to end through the real portable renderer: no browser. Needs a built
 * @helios-project/portable (npm run build -w packages/portable) and ffmpeg/ffprobe on PATH.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RenderOrchestrator, probeComposition } from '@helios-project/renderer';
import { registerRenderCommand } from '../render.js';

// The browser renderer must never be reached for these inputs.
vi.mock('@helios-project/renderer', () => ({
  probeComposition: vi.fn(),
  RenderOrchestrator: { render: vi.fn(), plan: vi.fn() },
}));

const CANVAS_MODULE = `export default {
  width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 45,
  background: '#0b1020',
  draw(ctx, frame) {
    ctx.fillStyle = '#dfff83';
    ctx.fillRect(10 + frame.index * 5, 40, 60, 60);
  }
};
`;

const PLAN = {
  version: 'portable-v1',
  width: 320,
  height: 180,
  fps: { num: 30, den: 1 },
  frameCount: 36,
  background: '#10242d',
  nodes: [{
    id: 'box', type: 'rect', y: 40,
    x: { keyframes: [{ frame: 0, value: 0 }, { frame: 35, value: 200 }] },
    width: 60, height: 60, radius: 10, fill: '#dfff83',
  }],
};

function probe(file: string): { frames: number; width: number; height: number; codec: string } {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames,width,height,codec_name', '-of', 'json', file,
  ]).toString();
  const stream = JSON.parse(out).streams[0];
  return { frames: Number(stream.nb_read_frames), width: stream.width, height: stream.height, codec: stream.codec_name };
}

describe('helios render without a browser (integration)', () => {
  let dir: string;
  let program: Command;
  let exitSpy: any;
  let errorSpy: any;
  const file = (name: string) => path.join(dir, name);
  const run = (...args: string[]) => program.parseAsync(['node', 'helios', 'render', ...args]);

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-render-portable-e2e-'));
    fs.writeFileSync(file('comp.mjs'), CANVAS_MODULE);
    fs.writeFileSync(file('plan.json'), JSON.stringify(PLAN));
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  beforeEach(() => {
    program = new Command();
    registerRenderCommand(program);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    expect(probeComposition).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('renders every frame of a Canvas module', async () => {
    await run(file('comp.mjs'), '-o', file('canvas.mp4'));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(probe(file('canvas.mp4'))).toEqual({ frames: 45, width: 320, height: 180, codec: 'h264' });
  }, 60_000);

  it('renders exactly the requested range of a Canvas module', async () => {
    await run(file('comp.mjs'), '-o', file('range.mp4'), '--start-frame', '10', '--frame-count', '20', '--concurrency', '2');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(probe(file('range.mp4')).frames).toBe(20);
  }, 60_000);

  it('renders a portable-v1 plan with the skia rasterizer', async () => {
    await run(file('plan.json'), '-o', file('plan.mp4'), '--rasterizer', 'skia');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(probe(file('plan.mp4'))).toEqual({ frames: 36, width: 320, height: 180, codec: 'h264' });
  }, 60_000);
});
