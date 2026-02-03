import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// Mock dependencies
vi.mock('@helios-project/renderer', () => ({
  Renderer: class MockRenderer {
    render(_url: string, outputPath: string) {
      const fs = require('fs');
      fs.writeFileSync(outputPath, 'dummy content');
      return Promise.resolve();
    }
    diagnose() { return Promise.resolve({}); }
  },
  RenderOrchestrator: {
    render: vi.fn().mockImplementation((_url: string, outputPath: string) => {
      const fs = require('fs');
      fs.writeFileSync(outputPath, 'dummy content');
      return Promise.resolve();
    })
  }
}));

const tempDir = path.join(__dirname, 'temp-test-persistence');

// Mock discovery to redirect project root
vi.mock('./discovery', () => ({
  getProjectRoot: () => tempDir
}));

describe('RenderManager Persistence', () => {
  const rendersDir = path.join(tempDir, 'renders');
  const jobsFile = path.join(rendersDir, 'jobs.json');

  beforeEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(rendersDir, { recursive: true });
    vi.resetModules(); // Ensure clean import for each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should load existing jobs and mark interrupted ones as failed', async () => {
    // Setup existing jobs
    const existingJob = {
      id: 'existing-1',
      status: 'rendering',
      progress: 0.5,
      compositionId: 'comp-1',
      createdAt: Date.now()
    };
    fs.writeFileSync(jobsFile, JSON.stringify([existingJob], null, 2));

    // Import to trigger loadJobs
    const { getJobs } = await import('./render-manager');

    const jobs = getJobs();
    const job = jobs.find(j => j.id === 'existing-1');
    expect(job).toBeDefined();
    expect(job?.status).toBe('failed');
    expect(job?.error).toContain('Server restarted');
  });

  it('should save new jobs to disk', async () => {
    const { startRender, getJobs } = await import('./render-manager');

    // Wait for startRender to complete (it's async but returns jobId immediately)
    // Actually startRender returns Promise<string>
    const jobId = await startRender({ compositionUrl: '/test' }, 3000);

    // Wait a tick for async file write if any (it is sync in our impl but wrapped in async function)
    await new Promise(r => setTimeout(r, 100));

    const jobs = getJobs();
    expect(jobs.length).toBeGreaterThan(0);
    const job = jobs.find(j => j.id === jobId);

    // Check disk
    const content = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));
    const savedJob = content.find((j: any) => j.id === jobId);
    expect(savedJob).toBeDefined();
    // Since MockRenderer resolves immediately, it should be 'completed'
    expect(savedJob.status).toBe('completed');
  });

  it('should remove job from disk on delete', async () => {
    const { startRender, deleteJob } = await import('./render-manager');
    const jobId = await startRender({ compositionUrl: '/test' }, 3000);

    // Wait for completion
    await new Promise(r => setTimeout(r, 100));

    // Ensure it's there
    expect(fs.readFileSync(jobsFile, 'utf-8')).toContain(jobId);

    deleteJob(jobId);

    // Ensure it's gone
    const content = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));
    expect(content.find((j: any) => j.id === jobId)).toBeUndefined();
  });

  it('should use RenderOrchestrator with concurrency', async () => {
    const { startRender } = await import('./render-manager');
    const { RenderOrchestrator } = await import('@helios-project/renderer');

    await startRender({ compositionUrl: '/test', concurrency: 4 }, 3000);

    // Wait for async execution
    await new Promise(r => setTimeout(r, 100));

    expect(RenderOrchestrator.render).toHaveBeenCalled();
    const args = (RenderOrchestrator.render as any).mock.calls[0];
    // arg 2 is options
    expect(args[2].concurrency).toBe(4);
  });
});
