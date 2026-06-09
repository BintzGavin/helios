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

  it('should construct absolute urls for job chunks if input is a local file and base-url is provided', async () => {
    await program.parseAsync([
      'node', 'test', 'render', './comp.html',
      '--emit-job', 'job.json',
      '--job-base-url', 'http://cdn.example.com/'
    ]);
    expect(RenderOrchestrator.plan).toHaveBeenCalled();
    const calls = vi.mocked(fs.writeFileSync).mock.calls;
    const writeCall = calls.find(call => typeof call[0] === 'string' && call[0].endsWith('job.json'));
    expect(writeCall).toBeDefined();

    if (writeCall) {
      const writtenJobStr = writeCall[1] as string;
      const job = JSON.parse(writtenJobStr);
      // We expect the command in the chunk to include the resolved jobBaseUrl + comp.html
      expect(job.chunks[0].command).toContain('http://cdn.example.com/comp.html');
    }
  });

  it('should emit job payload chunks containing base URL when --emit-job and --base-url are provided', async () => {
    // The commandInput will contain baseUrl instead of baseUrl property directly
    await program.parseAsync(['node', 'test', 'render', 'comp.html', '-o', 'output.mp4', '--emit-job', 'job.json', '--base-url', 'http://my-remote-site.com']);

    // So the command string inside the job JSON should have "http://my-remote-site.com/comp.html"
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('job.json'),
      expect.stringContaining('http://my-remote-site.com/comp.html')
    );
  });



  it('should use HELIOS_BROWSER_ARGS correctly', async () => {
    process.env.HELIOS_BROWSER_ARGS = '--no-sandbox,--disable-gpu';
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Using custom browser arguments: --no-sandbox,--disable-gpu');
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ browserConfig: expect.objectContaining({ args: ['--no-sandbox,--disable-gpu'] }) }));
    consoleLogSpy.mockRestore();
    delete process.env.HELIOS_BROWSER_ARGS;
  });

  it('should generate mergeCommand with mixOptions when using --emit-job', async () => {
    vi.mocked(RenderOrchestrator.plan).mockReturnValueOnce({
      chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', options: {} }],
      concatManifest: ['out.mp4'],
      mixOptions: { videoCodec: 'libx264', audioCodec: 'aac', crf: 23 },
      totalFrames: 10
    });

    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--emit-job', 'job.json', '--video-codec', 'libx264', '--audio-codec', 'aac', '--quality', '23']);

    const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call => typeof call[0] === 'string' && call[0].endsWith('job.json'));
    expect(writeCall).toBeDefined();
    if (writeCall) {
      const writtenJobStr = writeCall[1];
      const job = JSON.parse(writtenJobStr);
      expect(job.mergeCommand).toContain('--video-codec libx264');
      expect(job.mergeCommand).toContain('--audio-codec aac');
      expect(job.mergeCommand).toContain('--quality 23');
    }
  });

});
