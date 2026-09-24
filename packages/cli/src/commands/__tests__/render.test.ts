import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerRenderCommand } from '../render.js';
import { Command } from 'commander';
import { RenderOrchestrator, probeComposition } from '@helios-project/renderer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('@helios-project/renderer', () => ({
  probeComposition: vi.fn(),
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
    vi.mocked(probeComposition).mockResolvedValue({ driver: 'helios', durationInSeconds: 5, fps: 30, width: 1920, height: 1080 });
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
      chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', options: {} as any }],
      concatManifest: ['out.mp4'],
      mixOptions: { videoCodec: 'libx264', audioCodec: 'aac', crf: 23 } as any,
      totalFrames: 10,
      concatOutputFile: 'out_concat.mp4',
      finalOutputFile: 'out_final.mp4',
      cleanupFiles: []
    });

    await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--emit-job', 'job.json', '--video-codec', 'libx264', '--audio-codec', 'aac', '--quality', '23']);

    const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call => typeof call[0] === 'string' && call[0].endsWith('job.json'));
    expect(writeCall).toBeDefined();
    if (writeCall) {
      const writtenJobStr = writeCall[1] as string;
      const job = JSON.parse(writtenJobStr);
      expect(job.mergeCommand).toContain('--video-codec libx264');
      expect(job.mergeCommand).toContain('--audio-codec aac');
      expect(job.mergeCommand).toContain('--quality 23');
    }
  });


  it('should include all options in rendererOptionsToFlags correctly', async () => {
    vi.mocked(RenderOrchestrator.plan).mockReturnValueOnce({
      chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', options: { width: 1920, height: 1080, fps: 60, crf: 23, mode: 'dom', audioCodec: 'aac', videoCodec: 'libx264', browserConfig: { headless: false } } as any }],
      concatManifest: ['out.mp4'],
      mixOptions: {} as any,
      totalFrames: 10,
      concatOutputFile: 'out_concat.mp4',
      finalOutputFile: 'out_final.mp4',
      cleanupFiles: []
    });
    await program.parseAsync([
      'node', 'test', 'render', 'http://example.com/comp.html',
      '--emit-job', 'job.json',
      '--width', '1920',
      '--height', '1080',
      '--fps', '60',
      '--quality', '23',
      '--mode', 'dom',
      '--audio-codec', 'aac',
      '--video-codec', 'libx264',
      '--no-headless'
    ]);
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find((call: any[]) => typeof call[0] === 'string' && call[0].endsWith('job.json'));
    expect(writeCall).toBeDefined();
    if (writeCall) {
      const job = JSON.parse(writeCall[1] as string);
      const command = job.chunks[0].command;
      expect(command).toContain('--width 1920');
      expect(command).toContain('--height 1080');
      expect(command).toContain('--fps 60');
      expect(command).toContain('--quality 23');
      expect(command).toContain('--mode dom');
      expect(command).toContain('--audio-codec aac');
      expect(command).toContain('--video-codec libx264');
      expect(command).toContain('--no-headless');
    }
  });

  it('should use default concurrency of 1 when undefined', async () => {
    await program.parseAsync([
      'node', 'test', 'render', 'http://example.com/comp.html',
    ]);
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ concurrency: 1 })
    );
    // Also cover --concurrency explicitly and --quality
    await program.parseAsync([
      'node', 'test', 'render', 'http://example.com/comp.html',
      '--quality', '23'
    ]);
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ crf: 23 })
    );
    await program.parseAsync([
      'node', 'test', 'render', 'http://example.com/comp.html',
      '--concurrency', '4'
    ]);
    expect(RenderOrchestrator.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ concurrency: 4 })
    );
  });

  it('should handle file:// URL and clean path logic starting with ./', async () => {
    const path = require('path');
    const originalRelative = path.relative;
    vi.spyOn(path, 'relative').mockImplementation((from, to) => {
      const rel = originalRelative(from, to);
      if (rel === 'comp.html') return './comp.html';
      return rel;
    });

    await program.parseAsync([
      'node', 'test', 'render', './comp.html',
      '--emit-job', 'job.json',
      '--job-base-url', 'http://my-remote-site.com/'
    ]);

    vi.restoreAllMocks();
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find((call: any[]) => typeof call[0] === 'string' && call[0].endsWith('job.json'));
    expect(writeCall).toBeDefined();
    if (writeCall) {
      const job = JSON.parse(writeCall[1] as string);
      expect(job.chunks[0].command).toContain('http://my-remote-site.com/comp.html');
    }
  });


  describe('first-run defaults', () => {
    const renderOptions = () => vi.mocked(RenderOrchestrator.render).mock.calls.at(-1)![2];
    const errors = () => consoleErrorSpy.mock.calls.flat().join(' ');

    it('reads duration, fps and size from the page when they are not passed', async () => {
      vi.mocked(probeComposition).mockResolvedValueOnce({ driver: 'helios', durationInSeconds: 12.5, fps: 24, width: 1080, height: 1920 });
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html']);
      expect(renderOptions()).toEqual(expect.objectContaining({ durationInSeconds: 12.5, fps: 24, width: 1080, height: 1920 }));
    });

    it('lets explicit flags win over what the page declares', async () => {
      vi.mocked(probeComposition).mockResolvedValueOnce({ driver: 'helios', durationInSeconds: 12.5, fps: 24, width: 1080, height: 1920 });
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--duration', '3', '--fps', '60']);
      expect(renderOptions()).toEqual(expect.objectContaining({ durationInSeconds: 3, fps: 60, width: 1080, height: 1920 }));
    });

    it('does not load the page when every value is given', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--duration', '3', '--fps', '60', '--width', '640', '--height', '360']);
      expect(probeComposition).not.toHaveBeenCalled();
      expect(RenderOrchestrator.render).toHaveBeenCalled();
    });

    it('fails with a clear message when nothing declares the duration', async () => {
      vi.mocked(probeComposition).mockResolvedValueOnce({ driver: 'hook', hook: 'renderAt' });
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/page.html']);
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--duration');
      expect(errors()).toContain('window.renderAt');
    });

    it('keeps fractional duration and fps', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--duration', '12.5', '--fps', '29.97']);
      expect(renderOptions()).toEqual(expect.objectContaining({ durationInSeconds: 12.5, fps: 29.97 }));
    });

    it('rejects a duration or fps that is not a positive number', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--duration', 'abc']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--duration');
      exitSpy.mockClear();
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--fps', '0']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('defaults to DOM mode, which captures any page', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html']);
      expect(renderOptions()).toEqual(expect.objectContaining({ mode: 'dom' }));
    });

    it('rejects an unknown mode', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--mode', 'webgl']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('--audio passes the soundtrack as an absolute path', async () => {
      const here = fileURLToPath(import.meta.url);
      const relative = path.relative(process.cwd(), here);
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--audio', relative]);
      expect(renderOptions()).toEqual(expect.objectContaining({ audioFilePath: here }));
    });

    it('--audio fails when the file does not exist', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--audio', 'no-such-song.mp3']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('no-such-song.mp3');
      expect(RenderOrchestrator.render).not.toHaveBeenCalled();
    });

    it('refuses --audio with --emit-job rather than dropping the soundtrack', async () => {
      const here = fileURLToPath(import.meta.url);
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--audio', here, '--emit-job', 'job.json']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--emit-job');
      expect(RenderOrchestrator.plan).not.toHaveBeenCalled();
    });

    it('--gpu and --no-gpu set browserConfig.gpu', async () => {
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--gpu']);
      expect(renderOptions().browserConfig).toEqual(expect.objectContaining({ gpu: true }));
      await program.parseAsync(['node', 'test', 'render', 'http://example.com/comp.html', '--no-gpu']);
      expect(renderOptions().browserConfig).toEqual(expect.objectContaining({ gpu: false }));
    });
  });
});
