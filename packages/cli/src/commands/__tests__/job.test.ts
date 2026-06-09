import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { loadJobSpec, registerJobCommand } from '../job.js';
import {
  JobExecutor,
  AwsLambdaAdapter,
  CloudRunAdapter,
  CloudflareWorkersAdapter,
  CloudflareSandboxAdapter,
  AzureFunctionsAdapter,
  FlyMachinesAdapter,
  KubernetesAdapter,
  DockerAdapter,
  DenoDeployAdapter,
  VercelAdapter,
  ModalAdapter,
  HetznerCloudAdapter,
  LocalWorkerAdapter
} from '@helios-project/infrastructure';
import fs from 'fs';
import path from 'path';

const mockExecute = vi.fn().mockResolvedValue(undefined);

vi.mock('@helios-project/infrastructure', () => {
  const MockJobExecutor = vi.fn().mockImplementation(function() {
    return {
      execute: (...args: any[]) => mockExecute(...args),
    };
  });
  return {
    JobExecutor: MockJobExecutor,
    AwsLambdaAdapter: vi.fn(),
    CloudRunAdapter: vi.fn(),
    CloudflareWorkersAdapter: vi.fn(),
    CloudflareSandboxAdapter: vi.fn(),
    AzureFunctionsAdapter: vi.fn(),
    FlyMachinesAdapter: vi.fn(),
    KubernetesAdapter: vi.fn(),
    DockerAdapter: vi.fn(),
    DenoDeployAdapter: vi.fn(),
    VercelAdapter: vi.fn(),
    ModalAdapter: vi.fn(),
    HetznerCloudAdapter: vi.fn(),
    LocalWorkerAdapter: vi.fn(),
    WorkerAdapter: vi.fn(),
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe('job command', () => {
  let program: Command;
  let logSpy: any;
  let errorSpy: any;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerJobCommand(program);

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadJobSpec', () => {
    it('should load a local file job spec', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [{ id: 1 }] }));

      const { jobSpec, jobDir } = await loadJobSpec('test-job.json');
      expect(jobSpec.chunks[0].id).toBe(1);
      expect(jobDir).toBe(path.dirname(path.resolve(process.cwd(), 'test-job.json')));
    });

    it('should throw an error if local file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loadJobSpec('missing.json')).rejects.toThrow('Job file not found');
    });

    it('should fetch a remote job spec', async () => {
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ chunks: [{ id: 2 }] }),
      });

      const { jobSpec, jobDir } = await loadJobSpec('http://example.com/job.json');
      expect(jobSpec.chunks[0].id).toBe(2);
      expect(jobDir).toBe(process.cwd());

      global.fetch = globalFetch; // Restore fetch
    });

    it('should throw an error if remote fetch fails', async () => {
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadJobSpec('http://example.com/job.json')).rejects.toThrow('Failed to fetch job');

      global.fetch = globalFetch; // Restore fetch
    });
  });

  describe('run subcommand adapters', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [{ id: 1 }] }));
    });

    it('should use LocalWorkerAdapter by default', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json']);
      expect(LocalWorkerAdapter).toHaveBeenCalled();
      expect(JobExecutor).toHaveBeenCalled();
    });

    it('should instantiate AwsLambdaAdapter when aws is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'aws',
        '--aws-function-name', 'my-func'
      ]);
      expect(AwsLambdaAdapter).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'my-func' }));
    });

    it('should error if aws adapter missing required arg', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'aws']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('AWS adapter requires'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should instantiate CloudRunAdapter when gcp is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'gcp',
        '--gcp-service-url', 'http://gcp'
      ]);
      expect(CloudRunAdapter).toHaveBeenCalledWith(expect.objectContaining({ serviceUrl: 'http://gcp' }));
    });

    it('should instantiate CloudflareWorkersAdapter when cloudflare is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'cloudflare',
        '--cloudflare-service-url', 'http://cf'
      ]);
      expect(CloudflareWorkersAdapter).toHaveBeenCalledWith(expect.objectContaining({ serviceUrl: 'http://cf' }));
    });

    it('should instantiate CloudflareSandboxAdapter when cloudflare-sandbox is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'cloudflare-sandbox',
        '--cloudflare-sandbox-account-id', 'acc-id',
        '--cloudflare-sandbox-api-token', 'tok',
        '--cloudflare-sandbox-namespace', 'ns'
      ]);
      expect(CloudflareSandboxAdapter).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'acc-id',
        apiToken: 'tok',
        namespace: 'ns'
      }));
    });

    it('should error if cloudflare-sandbox adapter missing required args', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'cloudflare-sandbox']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Cloudflare Sandbox adapter requires'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should instantiate AzureFunctionsAdapter when azure is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'azure',
        '--azure-service-url', 'http://az'
      ]);
      expect(AzureFunctionsAdapter).toHaveBeenCalledWith(expect.objectContaining({ serviceUrl: 'http://az' }));
    });

    it('should error if azure adapter missing required arg', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'azure']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Azure adapter requires'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should instantiate FlyMachinesAdapter when fly is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'fly',
        '--fly-api-token', 'tok',
        '--fly-app-name', 'app',
        '--fly-image-ref', 'img'
      ]);
      expect(FlyMachinesAdapter).toHaveBeenCalledWith(expect.objectContaining({
        apiToken: 'tok',
        appName: 'app',
        imageRef: 'img'
      }));
    });

    it('should error if fly adapter missing required args', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'fly']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Fly adapter requires'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should instantiate KubernetesAdapter when kubernetes is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'kubernetes',
        '--k8s-job-image', 'img'
      ]);
      expect(KubernetesAdapter).toHaveBeenCalledWith(expect.objectContaining({ image: 'img' }));
    });

    it('should instantiate DockerAdapter when docker is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'docker',
        '--docker-image', 'img'
      ]);
      expect(DockerAdapter).toHaveBeenCalledWith(expect.objectContaining({ image: 'img' }));
    });

    it('should instantiate DenoDeployAdapter when deno is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'deno',
        '--deno-service-url', 'http://deno'
      ]);
      expect(DenoDeployAdapter).toHaveBeenCalledWith(expect.objectContaining({ serviceUrl: 'http://deno' }));
    });

    it('should instantiate VercelAdapter when vercel is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'vercel',
        '--vercel-service-url', 'http://vc'
      ]);
      expect(VercelAdapter).toHaveBeenCalledWith(expect.objectContaining({ serviceUrl: 'http://vc' }));
    });

    it('should instantiate ModalAdapter when modal is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'modal',
        '--modal-endpoint-url', 'http://modal'
      ]);
      expect(ModalAdapter).toHaveBeenCalledWith(expect.objectContaining({ endpointUrl: 'http://modal' }));
    });

    it('should instantiate HetznerCloudAdapter when hetzner is specified', async () => {
      await program.parseAsync([
        'node', 'test', 'job', 'run', 'job.json',
        '--adapter', 'hetzner',
        '--hetzner-api-token', 'tok',
        '--hetzner-server-type', 'type',
        '--hetzner-image', 'img'
      ]);
      expect(HetznerCloudAdapter).toHaveBeenCalledWith(expect.objectContaining({
        apiToken: 'tok',
        serverType: 'type',
        image: 'img'
      }));
    });
  });

  describe('run subcommand edge cases', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [{ id: 1 }, { id: 2 }] }));
    });

    it('should error if chunk ID is invalid', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--chunk', 'not-a-number']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Chunk ID must be a valid number'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should error if chunk ID is not found in job spec', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--chunk', '999']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Chunk 999 not found in job spec'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should run specific chunk successfully', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--chunk', '2']);
      expect(JobExecutor).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
      const executeCallArgs = mockExecute.mock.calls[0];
      expect(executeCallArgs[1].completedChunkIds).toEqual([1]); // Chunk 1 is skipped
      expect(executeCallArgs[1].merge).toBeFalsy();
    });

    it('should execute with concurrency', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--concurrency', '2']);
      expect(mockExecute).toHaveBeenCalled();
      const executeCallArgs = mockExecute.mock.calls[0];
      expect(executeCallArgs[1].concurrency).toBe(2);
    });

    it('should error if concurrency is invalid', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--concurrency', '-1']);
      expect(errorSpy).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Concurrency must be a positive number'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  it('should exit when executing a job with fly adapter without token', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
      mergeCommand: 'merge'
    }));

    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'fly']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Fly adapter requires --fly-api-token'));
  });

  it('should exit when executing a job with cloudflare-sandbox adapter without worker URL', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
      mergeCommand: 'merge'
    }));

    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'cloudflare-sandbox']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Cloudflare Sandbox adapter requires --cloudflare-sandbox-account-id'));
  });

  it('should error if azure adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
      mergeCommand: 'merge'
    }));

    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'azure']);

    // Azure doesn't require explicit tokens initially in the CLI if it just spins up the adapter with defaults or process.env
    // We just want to cover the branch in the switch
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Azure adapter requires --azure-service-url'));
  });


  describe('executor error handling', () => {
    it('should catch executor errors gracefully and exit', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
        mergeCommand: 'merge'
      }));
      const testError = new Error('Execute threw');
      mockExecute.mockRejectedValueOnce(testError);

      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'local']);

      expect(console.error).toHaveBeenCalledWith('Job execution failed:', 'Execute threw');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should catch non-Error exceptions from executor gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
        mergeCommand: 'merge'
      }));
      mockExecute.mockRejectedValueOnce('Some string error');

      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'local']);

      expect(console.error).toHaveBeenCalledWith('Job execution failed:', undefined);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should map executor stdout and stderr callbacks', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        chunks: [{ id: '1', startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }],
        mergeCommand: 'merge'
      }));
      mockExecute.mockImplementationOnce(async (spec, options) => {
        options.onChunkStdout(1, 'stdout test');
        options.onChunkStderr(1, 'stderr test');
      });

      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'local']);

      expect(stdoutSpy).toHaveBeenCalledWith('stdout test');
      expect(stderrSpy).toHaveBeenCalledWith('stderr test');

      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });
  });

  it('should error if deno adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'deno']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Deno adapter requires --deno-service-url'));
  });

  it('should error if vercel adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'vercel']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Vercel adapter requires'));
  });

  it('should error if modal adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'modal']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Modal adapter requires'));
  });

  it('should error if hetzner adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'hetzner']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Hetzner adapter requires --hetzner-api-token, --hetzner-server-type, and --hetzner-image'));
  });


  it('should error if gcp adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'gcp']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('GCP adapter requires --gcp-service-url'));
  });

  it('should error if cloudflare adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'cloudflare']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Cloudflare adapter requires --cloudflare-service-url'));
  });

  it('should error if kubernetes adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'kubernetes']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Kubernetes adapter requires --k8s-job-image'));
  });

  it('should error if docker adapter missing required arg', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ chunks: [] }));
    await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'docker']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Job execution failed:', expect.stringContaining('Docker adapter requires --docker-image'));
  });

});