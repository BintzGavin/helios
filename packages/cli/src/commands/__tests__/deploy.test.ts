import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerDeployCommand } from '../deploy.js';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../../templates/docker.js';
import { CLOUD_RUN_JOB_TEMPLATE, README_GCP_TEMPLATE } from '../../templates/gcp.js';
import { AWS_DOCKERFILE_TEMPLATE, AWS_LAMBDA_HANDLER_TEMPLATE, AWS_SAM_TEMPLATE, README_AWS_TEMPLATE } from '../../templates/aws.js';
import { DOCKER_COMPOSE_ADAPTER_TEMPLATE, README_DOCKER_TEMPLATE } from '../../templates/docker-adapter.js';
import { WRANGLER_TOML_TEMPLATE, CLOUDFLARE_WORKER_TEMPLATE, README_CLOUDFLARE_TEMPLATE } from '../../templates/cloudflare.js';
import { WRANGLER_TOML_TEMPLATE as CF_SANDBOX_WRANGLER_TOML_TEMPLATE, WORKFLOW_INDEX_TS_TEMPLATE, WORKFLOW_RENDER_TS_TEMPLATE, README_CLOUDFLARE_SANDBOX_TEMPLATE } from '../../templates/cloudflare-sandbox.js';
import { FLY_TOML_TEMPLATE, FLY_DOCKERFILE_TEMPLATE, README_FLY_TEMPLATE } from '../../templates/fly.js';
import { AZURE_FUNCTION_JSON_TEMPLATE, AZURE_HOST_JSON_TEMPLATE, AZURE_LOCAL_SETTINGS_JSON_TEMPLATE, AZURE_INDEX_JS_TEMPLATE, README_AZURE_TEMPLATE } from '../../templates/azure.js';
import { KUBERNETES_JOB_TEMPLATE, README_KUBERNETES_TEMPLATE } from '../../templates/kubernetes.js';
import { README_HETZNER_TEMPLATE } from '../../templates/hetzner.js';
import { README_MODAL_TEMPLATE } from '../../templates/modal.js';
import { README_DENO_TEMPLATE } from '../../templates/deno.js';
import { README_VERCEL_TEMPLATE } from '../../templates/vercel.js';

// Mock fs and prompts
vi.mock('fs');
vi.mock('prompts');

describe('deploy command', () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerDeployCommand(program);

    // Reset mocks
    vi.resetAllMocks();

    // Mock exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    exitSpy.mockRestore();
  });

  describe('setup subcommand', () => {
    it('should create files when they do not exist', async () => {
      // Mock fs.existsSync to return false (files don't exist)
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'setup']);

      // Check if files were created
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        DOCKERFILE_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose.yml'),
        DOCKER_COMPOSE_TEMPLATE
      );
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return true
      vi.mocked(prompts).mockResolvedValue({ value: true });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'setup']);

      // Check prompts
      expect(prompts).toHaveBeenCalledTimes(2);

      // Check if files were overwritten
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        DOCKERFILE_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose.yml'),
        DOCKER_COMPOSE_TEMPLATE
      );
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return false
      vi.mocked(prompts).mockResolvedValue({ value: false });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'setup']);

      // Check prompts
      expect(prompts).toHaveBeenCalledTimes(2);

      // Check if files were NOT overwritten
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('docker subcommand', () => {
    it('should create docker files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await program.parseAsync(['node', 'test', 'deploy', 'docker']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('docker-compose.yml'), DOCKER_COMPOSE_ADAPTER_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-DOCKER.md'), README_DOCKER_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });

      await program.parseAsync(['node', 'test', 'deploy', 'docker']);

      expect(prompts).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('docker-compose.yml'), DOCKER_COMPOSE_ADAPTER_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-DOCKER.md'), README_DOCKER_TEMPLATE);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });

      await program.parseAsync(['node', 'test', 'deploy', 'docker']);

      expect(prompts).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(expect.stringContaining('docker-compose.yml'), expect.any(String));
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(expect.stringContaining('README-DOCKER.md'), expect.any(String));
    });
  });

  describe('aws subcommand', () => {
    it('should create AWS files when they do not exist', async () => {
      // Mock fs.existsSync to return false
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'aws']);

      // Check if files were created
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        AWS_DOCKERFILE_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('template.yaml'),
        AWS_SAM_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('lambda.js'),
        AWS_LAMBDA_HANDLER_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('README-AWS.md'),
        README_AWS_TEMPLATE
      );
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return true
      vi.mocked(prompts).mockResolvedValue({ value: true });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'aws']);

      // Check prompts (4 files)
      expect(prompts).toHaveBeenCalledTimes(4);

      // Check if files were overwritten
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        AWS_DOCKERFILE_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('template.yaml'),
        AWS_SAM_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('lambda.js'),
        AWS_LAMBDA_HANDLER_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('README-AWS.md'),
        README_AWS_TEMPLATE
      );
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return false
      vi.mocked(prompts).mockResolvedValue({ value: false });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'aws']);

      // Check prompts
      expect(prompts).toHaveBeenCalledTimes(4);

      // Check if files were NOT overwritten
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle cancellation (undefined value)', async () => {
       // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return undefined value (cancelled)
      vi.mocked(prompts).mockResolvedValue({});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'setup']);

      // Check if process.exit was called
      expect(exitSpy).toHaveBeenCalledWith(0);

      // Ensure no files written
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('gcp subcommand', () => {
    it('should create GCP files when they do not exist', async () => {
      // Mock fs.existsSync to return false
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'gcp']);

      // Check if files were created
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('cloud-run-job.yaml'),
        CLOUD_RUN_JOB_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('README-GCP.md'),
        README_GCP_TEMPLATE
      );
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return true
      vi.mocked(prompts).mockResolvedValue({ value: true });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'gcp']);

      // Check prompts
      expect(prompts).toHaveBeenCalledTimes(2);

      // Check if files were overwritten
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('cloud-run-job.yaml'),
        CLOUD_RUN_JOB_TEMPLATE
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('README-GCP.md'),
        README_GCP_TEMPLATE
      );
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      // Mock fs.existsSync to return true
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock prompts to return false
      vi.mocked(prompts).mockResolvedValue({ value: false });

      // Mock fs.writeFileSync
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      // Run command
      await program.parseAsync(['node', 'test', 'deploy', 'gcp']);

      // Check prompts
      expect(prompts).toHaveBeenCalledTimes(2);

      // Check if files were NOT overwritten
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('cloudflare subcommand', () => {
    it('should create Cloudflare files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('wrangler.toml'), WRANGLER_TOML_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('src/worker.ts'), CLOUDFLARE_WORKER_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-CLOUDFLARE.md'), README_CLOUDFLARE_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare']);

      expect(prompts).toHaveBeenCalledTimes(3);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('wrangler.toml'), WRANGLER_TOML_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('src/worker.ts'), CLOUDFLARE_WORKER_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-CLOUDFLARE.md'), README_CLOUDFLARE_TEMPLATE);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare']);

      expect(prompts).toHaveBeenCalledTimes(3);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('cloudflare-sandbox subcommand', () => {
    it('should create Cloudflare Sandbox files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare-sandbox']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('wrangler.toml'), CF_SANDBOX_WRANGLER_TOML_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('src/index.ts'), WORKFLOW_INDEX_TS_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('src/render-workflow.ts'), WORKFLOW_RENDER_TS_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-CLOUDFLARE-SANDBOX.md'), README_CLOUDFLARE_SANDBOX_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare-sandbox']);

      expect(prompts).toHaveBeenCalledTimes(4);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'cloudflare-sandbox']);

      expect(prompts).toHaveBeenCalledTimes(4);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('fly subcommand', () => {
    it('should create Fly files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'fly']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('fly.toml'), FLY_TOML_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('Dockerfile'), FLY_DOCKERFILE_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-FLY.md'), README_FLY_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'fly']);

      expect(prompts).toHaveBeenCalledTimes(3);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'fly']);

      expect(prompts).toHaveBeenCalledTimes(3);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('azure subcommand', () => {
    it('should create Azure files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'azure']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('host.json'), AZURE_HOST_JSON_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('local.settings.json'), AZURE_LOCAL_SETTINGS_JSON_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('function.json'), AZURE_FUNCTION_JSON_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('index.js'), AZURE_INDEX_JS_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-AZURE.md'), README_AZURE_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'azure']);

      expect(prompts).toHaveBeenCalledTimes(5);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'azure']);

      expect(prompts).toHaveBeenCalledTimes(5);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('kubernetes subcommand', () => {
    it('should create Kubernetes files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'kubernetes']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('job.yaml'), KUBERNETES_JOB_TEMPLATE);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-KUBERNETES.md'), README_KUBERNETES_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'kubernetes']);

      expect(prompts).toHaveBeenCalledTimes(2);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'kubernetes']);

      expect(prompts).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('hetzner subcommand', () => {
    it('should create Hetzner files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'hetzner']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-HETZNER.md'), README_HETZNER_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'hetzner']);

      expect(prompts).toHaveBeenCalledTimes(1);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'hetzner']);

      expect(prompts).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('modal subcommand', () => {
    it('should create Modal files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'modal']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-MODAL.md'), README_MODAL_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'modal']);

      expect(prompts).toHaveBeenCalledTimes(1);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'modal']);

      expect(prompts).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('deno subcommand', () => {
    it('should create Deno files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'deno']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-DENO.md'), README_DENO_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'deno']);

      expect(prompts).toHaveBeenCalledTimes(1);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'deno']);

      expect(prompts).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('vercel subcommand', () => {
    it('should create Vercel files when they do not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'vercel']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('README-VERCEL.md'), README_VERCEL_TEMPLATE);
    });

    it('should prompt if files exist and overwrite if confirmed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: true });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'vercel']);

      expect(prompts).toHaveBeenCalledTimes(1);
    });

    it('should prompt if files exist and NOT overwrite if declined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(prompts).mockResolvedValue({ value: false });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await program.parseAsync(['node', 'test', 'deploy', 'vercel']);

      expect(prompts).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
