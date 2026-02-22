import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerDeployCommand } from '../deploy.js';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../../templates/docker.js';
import { CLOUD_RUN_JOB_TEMPLATE, README_GCP_TEMPLATE } from '../../templates/gcp.js';
import { AWS_DOCKERFILE_TEMPLATE, AWS_LAMBDA_HANDLER_TEMPLATE, AWS_SAM_TEMPLATE, README_AWS_TEMPLATE } from '../../templates/aws.js';

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
});
