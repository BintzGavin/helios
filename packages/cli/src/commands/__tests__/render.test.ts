import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerRenderCommand } from '../render.js';
import { Command } from 'commander';
import { RenderOrchestrator } from '@helios-project/renderer';

// Mock RenderOrchestrator
vi.mock('@helios-project/renderer', () => ({
  RenderOrchestrator: {
    render: vi.fn(),
    plan: vi.fn(),
  },
}));

describe('render command', () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerRenderCommand(program);
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    exitSpy.mockRestore();
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  });

  it('should pass PUPPETEER_EXECUTABLE_PATH to renderer options', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/chromium';

    // We mock pathToFileURL/resolve to avoid issues with input file existence
    // But simplest is to pass a http URL
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--width', '100']);

    expect(RenderOrchestrator.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        browserConfig: expect.objectContaining({
          executablePath: '/custom/chromium'
        })
      })
    );
  });

  it('should not set executablePath if env var is missing', async () => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;

    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--width', '100']);

    expect(RenderOrchestrator.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        browserConfig: expect.not.objectContaining({
          executablePath: expect.anything()
        })
      })
    );
  });
});
