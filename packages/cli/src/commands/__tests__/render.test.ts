import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerRenderCommand } from '../render.js';
import { Command } from 'commander';
import { RenderOrchestrator } from '@helios-project/renderer';
import fs from 'fs';

vi.mock('@helios-project/renderer', () => ({
  RenderOrchestrator: {
    render: vi.fn(),
    plan: vi.fn().mockReturnValue({
      chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', options: {} }],
      concatManifest: ['out.mp4'],
      mixOptions: {},
      totalFrames: 10
    }),
  },
}));
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    default: {
      ...actual,
      writeFileSync: vi.fn(),
    },
    writeFileSync: vi.fn()
  };
});

describe('render command', () => {
  let program: Command;
  let exitSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    program = new Command();
    registerRenderCommand(program);
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { vi.unstubAllGlobals(); exitSpy.mockRestore(); delete process.env.PUPPETEER_EXECUTABLE_PATH; });

  it('should pass PUPPETEER_EXECUTABLE_PATH to renderer options', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/chromium';
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--width', '100']);
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ browserConfig: expect.objectContaining({ executablePath: '/custom/chromium' }) }));
  });

  it('should not set executablePath if env var is missing', async () => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--width', '100']);
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ browserConfig: expect.not.objectContaining({ executablePath: expect.anything() }) }));
  });

  it('should emit job spec when --emit-job is provided', async () => {
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--emit-job', 'job.json']);
    expect(RenderOrchestrator.plan).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should use job-base-url when emitting job', async () => {
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--emit-job', 'job.json', '--job-base-url', 'http://cdn/']);
    expect(RenderOrchestrator.plan).toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--start-frame', 'invalid']);
    expect(exitSpy).toHaveBeenCalledWith(1);

    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--frame-count', 'invalid']);
    expect(exitSpy).toHaveBeenCalledWith(1);

    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--concurrency', 'invalid']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should catch errors from render', async () => {
    vi.mocked(RenderOrchestrator.render).mockRejectedValueOnce(new Error('render fail'));
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
