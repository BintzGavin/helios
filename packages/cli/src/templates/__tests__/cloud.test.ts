import { describe, it, expect } from 'vitest';
import { AWS_DOCKERFILE_TEMPLATE } from '../aws';
import { AZURE_FUNCTION_JSON_TEMPLATE, AZURE_HOST_JSON_TEMPLATE } from '../azure';
import { WRANGLER_TOML_TEMPLATE as CLOUDFLARE_WRANGLER_TOML_TEMPLATE, CLOUDFLARE_WORKER_TEMPLATE } from '../cloudflare';
import { WRANGLER_TOML_TEMPLATE as CLOUDFLARE_SANDBOX_WRANGLER_TOML_TEMPLATE } from '../cloudflare-sandbox';
import { CLOUD_RUN_JOB_TEMPLATE } from '../gcp';
import { KUBERNETES_JOB_TEMPLATE } from '../kubernetes';

describe('Cloud Templates', () => {
  it('should export AWS_DOCKERFILE_TEMPLATE containing correct properties', () => {
    expect(AWS_DOCKERFILE_TEMPLATE).toBeDefined();
    expect(AWS_DOCKERFILE_TEMPLATE).toContain('FROM public.ecr.aws/lambda/nodejs:20');
  });

  it('should export AZURE_FUNCTION_JSON_TEMPLATE and AZURE_HOST_JSON_TEMPLATE containing correct properties', () => {
    expect(AZURE_FUNCTION_JSON_TEMPLATE).toBeDefined();
    expect(AZURE_HOST_JSON_TEMPLATE).toBeDefined();
    expect(() => JSON.parse(AZURE_FUNCTION_JSON_TEMPLATE)).not.toThrow();
    expect(() => JSON.parse(AZURE_HOST_JSON_TEMPLATE)).not.toThrow();
  });

  it('should export Cloudflare templates containing correct properties', () => {
    expect(CLOUDFLARE_WRANGLER_TOML_TEMPLATE).toBeDefined();
    expect(CLOUDFLARE_WORKER_TEMPLATE).toBeDefined();
    expect(CLOUDFLARE_WRANGLER_TOML_TEMPLATE).toContain('name = "helios-render-worker"');
  });

  it('should export Cloudflare Sandbox templates containing correct properties', () => {
    expect(CLOUDFLARE_SANDBOX_WRANGLER_TOML_TEMPLATE).toBeDefined();
    expect(CLOUDFLARE_SANDBOX_WRANGLER_TOML_TEMPLATE).toContain('name = "helios-render-worker"');
    expect(CLOUDFLARE_SANDBOX_WRANGLER_TOML_TEMPLATE).toContain('binding = "RENDER_WORKFLOW"');
  });

  it('should export CLOUD_RUN_JOB_TEMPLATE containing correct properties', () => {
    expect(CLOUD_RUN_JOB_TEMPLATE).toBeDefined();
    expect(CLOUD_RUN_JOB_TEMPLATE).toContain('apiVersion: run.googleapis.com/v1');
  });

  it('should export KUBERNETES_JOB_TEMPLATE containing correct properties', () => {
    expect(KUBERNETES_JOB_TEMPLATE).toBeDefined();
    expect(KUBERNETES_JOB_TEMPLATE).toContain('apiVersion: batch/v1');
  });
});
