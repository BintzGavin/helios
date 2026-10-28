import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RenderOrchestrator, probeComposition } from '@helios-project/renderer';
import { registerRenderCommand } from '../render.js';

const portable = vi.hoisted(() => ({ loaded: false }));

vi.mock('@helios-project/renderer', () => ({
  probeComposition: vi.fn(),
  RenderOrchestrator: { render: vi.fn(), plan: vi.fn() },
}));

vi.mock('@helios-project/portable', () => {
  portable.loaded = true;
  class RenderError extends Error {
    constructor(public code: string, message: string) { super(message); }
  }
  return {
    RenderError,
    renderCanvasModule: vi.fn(async () => ({ frames: 0, chunks: 0, workers: 0, ranges: [], renderMs: 0, finalizeMs: 0, finalVerifyMs: 0 })),
    parsePlan: vi.fn((input: unknown) => input),
    renderVideo: vi.fn(async () => {}),
  };
});

const CANVAS_MODULE = `export default {
  width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 45,
  draw(ctx, frame) { ctx.fillRect(frame.index, 0, 10, 10); }
};
`;

const PLAN = {
  version: 'portable-v1',
  width: 320,
  height: 180,
  fps: { num: 30, den: 1 },
  frameCount: 40,
  background: '#10242d',
  assets: { font1: { sha256: 'a'.repeat(64), bytes: 3, type: 'font' } },
  audio: [],
  nodes: [],
};

describe('render command: portable inputs', () => {
  let dir: string;
  let program: Command;
  let exitSpy: any;
  let errorSpy: any;
  let logSpy: any;
  const file = (name: string) => path.join(dir, name);
  const run = (...args: string[]) => program.parseAsync(['node', 'helios', 'render', ...args]);
  const errors = () => errorSpy.mock.calls.flat().join(' ');
  const logs = () => logSpy.mock.calls.flat().join('\n');
  const loadPortable = () => import('@helios-project/portable') as any;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-render-portable-'));
    fs.writeFileSync(file('comp.mjs'), CANVAS_MODULE);
    fs.writeFileSync(file('canvas.js'), CANVAS_MODULE);
    fs.writeFileSync(file('script.js'), 'export default { width: 10 };\n');
    fs.writeFileSync(file('not-canvas.mjs'), 'export default { width: 10 };\n');
    fs.writeFileSync(file('plan.json'), JSON.stringify(PLAN));
    fs.writeFileSync(file('job.json'), JSON.stringify({ metadata: {}, chunks: [] }));
    fs.mkdirSync(file('assets'));
    fs.writeFileSync(path.join(dir, 'a'.repeat(64)), 'abc');
    fs.writeFileSync(path.join(file('assets'), 'a'.repeat(64)), 'abc');
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  beforeEach(() => {
    program = new Command();
    registerRenderCommand(program);
    vi.clearAllMocks();
    vi.mocked(probeComposition).mockResolvedValue({ driver: 'helios', durationInSeconds: 1, fps: 30, width: 640, height: 360 });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => { exitSpy.mockRestore(); errorSpy.mockRestore(); logSpy.mockRestore(); });

  describe('Canvas modules', () => {
    it('renders a .mjs module with the portable renderer, without the browser renderer', async () => {
      await run(file('comp.mjs'), '-o', file('out.mp4'));
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule).toHaveBeenCalledTimes(1);
      const [modulePath, output, options] = renderCanvasModule.mock.calls[0];
      expect(modulePath).toBe(file('comp.mjs'));
      expect(output).toBe(file('out.mp4'));
      // Commander's --concurrency default of 1 must not pin the portable worker pool.
      expect(options.concurrency).toBeUndefined();
      expect(options.start).toBeUndefined();
      expect(options.end).toBeUndefined();
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
      expect(probeComposition).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
      expect(logs()).toContain('without a browser (portable, skia)');
      expect(logs()).toContain(file('out.mp4'));
    });

    it('renders exactly [start, start + count) for --start-frame and --frame-count', async () => {
      await run(file('comp.mjs'), '-o', file('out.mp4'), '--start-frame', '10', '--frame-count', '20');
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule.mock.calls[0][2]).toEqual(expect.objectContaining({ start: 10, end: 30 }));
    });

    it('maps --concurrency, --quality and --preset onto the worker pool and encoder', async () => {
      await run(file('comp.mjs'), '--concurrency', '3', '--quality', '20', '--preset', 'medium');
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule.mock.calls[0][2]).toEqual(expect.objectContaining({
        concurrency: 3,
        encoder: { crf: 20, preset: 'medium' },
      }));
    });

    it('renders a .js file whose default export has draw() as a Canvas module', async () => {
      await run(file('canvas.js'), '-o', file('out.mp4'));
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule).toHaveBeenCalledWith(file('canvas.js'), file('out.mp4'), expect.any(Object));
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('keeps rendering any other .js file in the browser, as before', async () => {
      await run(file('script.js'), '--no-serve');
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule).not.toHaveBeenCalled();
      expect(vi.mocked(RenderOrchestrator.render).mock.calls[0][0]).toBe(`file://${file('script.js')}`);
    });

    it('explains what a Canvas module needs when a .mjs default export has no draw()', async () => {
      await run(file('not-canvas.mjs'));
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('draw(ctx, frame)');
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('fails clearly when the .mjs file does not exist', async () => {
      await run(file('missing.mjs'));
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('missing.mjs');
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('rejects a frame range outside the module', async () => {
      await run(file('comp.mjs'), '--start-frame', '40', '--frame-count', '10');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('45 frames');
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule).not.toHaveBeenCalled();
    });

    it('rejects a frame count that is not a positive integer', async () => {
      await run(file('comp.mjs'), '--frame-count', '0');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--frame-count');
    });

    it('rejects --rasterizer and --assets, which only apply to plans', async () => {
      await run(file('comp.mjs'), '--rasterizer', 'wasm');
      expect(errors()).toContain('--rasterizer');
      expect(errors()).toContain('Skia');
      await run(file('comp.mjs'), '--assets', dir);
      expect(errors()).toContain('--assets');
      expect(exitSpy).toHaveBeenCalledTimes(2);
      const { renderCanvasModule } = await loadPortable();
      expect(renderCanvasModule).not.toHaveBeenCalled();
    });

    it('reports a portable failure in one line and exits non-zero', async () => {
      const { renderCanvasModule, RenderError } = await loadPortable();
      renderCanvasModule.mockRejectedValueOnce(new RenderError('INVALID_OUTPUT', 'Stitched canvas video failed verification'));
      await run(file('comp.mjs'));
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith('Render failed:', 'Stitched canvas video failed verification');
    });
  });

  describe('Chromium-only flags with a portable input', () => {
    const chromiumOnly: [string, ...string[]][] = [
      ['--mode', 'dom'],
      ['--gpu'],
      ['--no-gpu'],
      ['--no-headless'],
      ['--no-serve'],
      ['--base-url', 'http://cdn.example.com/'],
      ['--job-base-url', 'http://cdn.example.com/'],
      ['--emit-job', 'job-out.json'],
      ['--width', '640'],
      ['--height', '360'],
      ['--fps', '30'],
      ['--duration', '2'],
      ['--audio', 'song.mp3'],
      ['--audio-codec', 'aac'],
      ['--video-codec', 'libx264'],
    ];

    for (const input of ['comp.mjs', 'plan.json']) {
      it.each(chromiumOnly)(`rejects %s for ${input} and renders nothing`, async (flag, ...value) => {
        await run(file(input), flag, ...value);
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errors()).toContain(flag);
        expect(errors()).toContain(input === 'comp.mjs' ? 'Canvas modules' : 'portable-v1 plans');
        const { renderCanvasModule, renderVideo } = await loadPortable();
        expect(renderCanvasModule).not.toHaveBeenCalled();
        expect(renderVideo).not.toHaveBeenCalled();
        expect(RenderOrchestrator.render).not.toHaveBeenCalled();
        expect(RenderOrchestrator.plan).not.toHaveBeenCalled();
      });
    }

    it('does not suggest helios merge for audio, which cannot mux a soundtrack', async () => {
      await run(file('comp.mjs'), '--audio', 'song.mp3');
      expect(errors()).not.toContain('helios merge');
    });
  });

  describe('portable-v1 plans', () => {
    it('renders a plan with the requested rasterizer', async () => {
      await run(file('plan.json'), '-o', file('out.mp4'), '--rasterizer', 'skia');
      const { renderVideo, parsePlan } = await loadPortable();
      expect(parsePlan).toHaveBeenCalledWith(PLAN);
      expect(renderVideo).toHaveBeenCalledTimes(1);
      const [plan, assets, output, options] = renderVideo.mock.calls[0];
      expect(plan).toEqual(PLAN);
      expect(output).toBe(file('out.mp4'));
      expect(options).toEqual(expect.objectContaining({ rasterizer: 'skia' }));
      expect(options.start).toBeUndefined();
      expect(options.end).toBeUndefined();
      // Assets default to files named by digest next to the plan.
      expect(assets.get('font1')).toBe(path.join(dir, 'a'.repeat(64)));
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
      expect(probeComposition).not.toHaveBeenCalled();
      expect(logs()).toContain('without a browser (portable, skia)');
    });

    it('uses resvg when no rasterizer is given and maps --rasterizer resvg onto it', async () => {
      await run(file('plan.json'));
      await run(file('plan.json'), '--rasterizer', 'resvg');
      await run(file('plan.json'), '--rasterizer', 'wasm');
      const { renderVideo } = await loadPortable();
      expect(renderVideo.mock.calls.map((call: any[]) => call[3].rasterizer)).toEqual(['native', 'native', 'wasm']);
      expect(logs()).toContain('(portable, resvg)');
    });

    it('rejects an unknown rasterizer', async () => {
      await run(file('plan.json'), '--rasterizer', 'gpu');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('resvg, skia or wasm');
    });

    it('reads assets from --assets', async () => {
      await run(file('plan.json'), '--assets', file('assets'));
      const { renderVideo } = await loadPortable();
      expect(renderVideo.mock.calls[0][1].get('font1')).toBe(path.join(file('assets'), 'a'.repeat(64)));
    });

    it('names the missing asset file and where it was looked for', async () => {
      await run(file('plan.json'), '--assets', path.join(dir, 'nowhere'));
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('font1');
      expect(errors()).toContain(path.join(dir, 'nowhere', 'a'.repeat(64)));
      const { renderVideo } = await loadPortable();
      expect(renderVideo).not.toHaveBeenCalled();
    });

    it('renders exactly [start, start + count) for --start-frame and --frame-count', async () => {
      await run(file('plan.json'), '--start-frame', '10', '--frame-count', '20');
      const { renderVideo } = await loadPortable();
      expect(renderVideo.mock.calls[0][3]).toEqual(expect.objectContaining({ start: 10, end: 30 }));
    });

    it('rejects encoder and concurrency flags the plan renderer does not take', async () => {
      for (const args of [['--quality', '20'], ['--preset', 'slow'], ['--concurrency', '2']]) {
        errorSpy.mockClear();
        await run(file('plan.json'), ...args);
        expect(errors()).toContain(args[0]);
        expect(errors()).toContain('portable-v1 plans');
      }
      const { renderVideo } = await loadPortable();
      expect(renderVideo).not.toHaveBeenCalled();
    });

    it('keeps rendering any other .json file in the browser, as before', async () => {
      await run(file('job.json'), '--no-serve');
      const { renderVideo } = await loadPortable();
      expect(renderVideo).not.toHaveBeenCalled();
      expect(vi.mocked(RenderOrchestrator.render).mock.calls[0][0]).toBe(`file://${file('job.json')}`);
    });
  });
});

describe('render command: HTML inputs', () => {
  let program: Command;
  let exitSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    program = new Command();
    registerRenderCommand(program);
    vi.clearAllMocks();
    vi.mocked(probeComposition).mockResolvedValue({ driver: 'helios', durationInSeconds: 1, fps: 30, width: 640, height: 360 });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('rejects the portable-only flags', async () => {
    await program.parseAsync(['node', 'helios', 'render', 'http://example.com/comp.html', '--rasterizer', 'skia']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('--rasterizer');
    expect(RenderOrchestrator.render).not.toHaveBeenCalled();
  });
});

// Kept in its own file-level check: nothing above may have loaded portable for an HTML render.
describe('render command: HTML inputs never load the portable renderer', () => {
  it('renders HTML in the browser without importing @helios-project/portable', async () => {
    vi.resetModules();
    portable.loaded = false;
    const { registerRenderCommand: register } = await import('../render.js');
    const program = new Command();
    register(program);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const renderer = await import('@helios-project/renderer');
    vi.mocked(renderer.probeComposition).mockResolvedValue({ driver: 'helios', durationInSeconds: 1, fps: 30, width: 640, height: 360 });
    await program.parseAsync(['node', 'helios', 'render', 'http://example.com/comp.html']);
    expect(renderer.RenderOrchestrator.render).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(portable.loaded).toBe(false);
    vi.restoreAllMocks();
  });
});
