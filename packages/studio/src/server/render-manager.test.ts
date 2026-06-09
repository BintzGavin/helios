import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  getRenderJobSpec,
  startRender,
  getJob,
  getJobs,
  cancelJob,
  deleteJob,
  diagnoseServer
} from './render-manager';

vi.mock('@helios-project/renderer', () => {
  const mockRender = vi.fn();
  const mockDiagnose = vi.fn();
  return {
    mockRender,
    mockDiagnose,
    RenderOrchestrator: {
      plan: vi.fn((compositionUrl, outputPath, options) => {
         const outputDir = path.dirname(outputPath);
         const chunks: any[] = [];
         const concurrency = options.concurrency || 1;
         for(let i=0; i<concurrency; i++) {
             chunks.push({
                 id: i,
                 startFrame: i * 10,
                 frameCount: 10,
                 outputFile: path.join(outputDir, `temp_part_${i}.mov`),
                 options: { ...options }
             });
         }
         return {
             totalFrames: 100,
             chunks,
             concatManifest: chunks.map(c => c.outputFile),
             concatOutputFile: path.join(outputDir, 'temp_concat.mov'),
             finalOutputFile: outputPath,
             mixOptions: { videoCodec: 'libx264', audioCodec: 'aac', crf: 23 },
             cleanupFiles: []
         };
      }),
      render: mockRender
    },
    Renderer: class {
      diagnose = mockDiagnose;
    },
    DistributedRenderOptions: {}
  };
});

async function waitForJobCompletion(jobId: string, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const job = getJob(jobId);
    if (job && job.status !== 'rendering' && job.status !== 'queued') {
      return job;
    }
    await new Promise(r => setTimeout(r, 10));
  }
  throw new Error('Timeout waiting for job');
}

describe('render-manager', () => {
  const TEST_DIR = path.resolve(process.cwd(), 'temp-test-root');
  let mockRender: any;
  let mockDiagnose: any;

  beforeEach(async () => {
    vi.stubEnv('HELIOS_PROJECT_ROOT', TEST_DIR);
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, 'renders'));
    vi.clearAllMocks();

    // Import the mocks to reset their implementations
    const renderer = await import('@helios-project/renderer');
    mockRender = (renderer as any).mockRender;
    mockDiagnose = (renderer as any).mockDiagnose;
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  describe('getRenderJobSpec', () => {
    it('should generate relative paths and merge commands', () => {
      const options = {
          compositionUrl: '/my-comp/composition.html',
          width: 1920,
          height: 1080,
          fps: 30,
          inPoint: 30,
          outPoint: 90,
          concurrency: 2
      };
      const spec = getRenderJobSpec(options);
      expect(spec.chunks[0].command).not.toContain(TEST_DIR);
      expect(spec.chunks[0].command).toContain('my-comp/composition.html');
      expect(spec.mergeCommand).toContain('--video-codec libx264');
      expect(spec.mergeCommand).toContain('--audio-codec aac');
      expect(spec.mergeCommand).toContain('--quality 23');
    });

    it('handles absolute file paths', () => {
      const options = { compositionUrl: '/@fs/my/absolute/path/index.html' };
      const spec = getRenderJobSpec(options);
      expect(spec.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('startRender', () => {
    it('should successfully start and complete a render job', async () => {
      mockRender.mockImplementation(async (url: string, outPath: string, opts: any, callbacks: any) => {
        if (callbacks.onProgress) callbacks.onProgress(0.5);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, 'dummy data');
      });

      const options = { compositionUrl: '/comp', duration: 10 };
      const jobId = await startRender(options, 3000);

      const job = await waitForJobCompletion(jobId);

      expect(job).toBeDefined();
      expect(job!.status).toBe('completed');
      expect(job!.progress).toBe(1);
    });

    it('should fail if output file is empty', async () => {
      mockRender.mockImplementation(async (url: string, outPath: string) => {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, ''); // 0 bytes
      });

      const jobId = await startRender({ compositionUrl: '/comp' }, 3000);
      const job = await waitForJobCompletion(jobId);

      expect(job!.status).toBe('failed');
      expect(job!.error).toBe('Render produced an empty file.');
    });

    it('should handle AbortError as cancelled', async () => {
      mockRender.mockImplementation(async () => {
        throw new Error('Aborted');
      });

      const jobId = await startRender({ compositionUrl: '/comp' }, 3000);
      const job = await waitForJobCompletion(jobId);
      expect(job!.status).toBe('cancelled');
    });

    it('handles generic rendering failures', async () => {
      mockRender.mockImplementation(async () => {
        throw new Error('Some FFmpeg error');
      });

      const jobId = await startRender({ compositionUrl: '/comp' }, 3000);
      const job = await waitForJobCompletion(jobId);
      expect(job!.status).toBe('failed');
      expect(job!.error).toBe('Some FFmpeg error');
    });

    it('calculates duration correctly with inPoint/outPoint', async () => {
       mockRender.mockImplementation(async (url: string, outPath: string) => {
           fs.mkdirSync(path.dirname(outPath), { recursive: true });
           fs.writeFileSync(outPath, 'data');
       });
       const jobId = await startRender({ compositionUrl: '/comp', fps: 30, inPoint: 30, outPoint: 90 }, 3000);
       const job = await waitForJobCompletion(jobId);
       expect(job!.status).toBe('completed');
    });
  });

  describe('job management', () => {
    it('getJobs returns array', async () => {
      mockRender.mockImplementation(async (url: string, outPath: string) => {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, 'data');
      });
      await startRender({ compositionUrl: '/comp1' }, 3000);
      const allJobs = getJobs();
      expect(allJobs.length).toBeGreaterThan(0);
    });

    it('cancelJob aborts running job', async () => {
      mockRender.mockImplementation(() => new Promise(() => {})); // hang forever
      const jobId = await startRender({ compositionUrl: '/comp' }, 3000);
      const result = await cancelJob(jobId);
      expect(result).toBe(true);
      const job = await waitForJobCompletion(jobId);
      expect(job!.status).toBe('cancelled');
    });

    it('cancelJob returns false for missing job', async () => {
      const result = await cancelJob('fake-id');
      expect(result).toBe(false);
    });

    it('deleteJob handles active vs finished jobs', async () => {
      // Finished job
      mockRender.mockImplementation(async (url: string, outPath: string) => {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, 'data');
      });
      const jobId = await startRender({ compositionUrl: '/comp' }, 3000);
      await waitForJobCompletion(jobId);

      const result = await deleteJob(jobId);
      expect(result).toBe(true);
      expect(getJob(jobId)).toBeUndefined();

      // Attempt running job
      mockRender.mockImplementation(() => new Promise(() => {}));
      const runningJobId = await startRender({ compositionUrl: '/comp' }, 3000);
      const delResult = await deleteJob(runningJobId);
      expect(delResult).toBe(false); // cannot delete active
    });

    it('deleteJob returns false for missing job', async () => {
       const result = await deleteJob('missing-id');
       expect(result).toBe(false);
    });
  });

  describe('diagnoseServer', () => {
    it('calls renderer diagnose', async () => {
      mockDiagnose.mockResolvedValue({ status: 'ok' });
      const res = await diagnoseServer();
      expect(res.status).toBe('ok');
    });

    it('propagates error from diagnose', async () => {
      mockDiagnose.mockRejectedValue(new Error('fail'));
      await expect(diagnoseServer()).rejects.toThrow('fail');
    });
  });
});
