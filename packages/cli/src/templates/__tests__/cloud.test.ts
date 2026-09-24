import { describe, it, expect } from 'vitest';
import { AWS_DOCKERFILE_TEMPLATE } from '../aws';
import { AZURE_FUNCTION_JSON_TEMPLATE, AZURE_HOST_JSON_TEMPLATE } from '../azure';
import { WRANGLER_TOML_TEMPLATE as CLOUDFLARE_WRANGLER_TOML_TEMPLATE, CLOUDFLARE_WORKER_TEMPLATE } from '../cloudflare';
import { WRANGLER_TOML_TEMPLATE as CLOUDFLARE_SANDBOX_WRANGLER_TOML_TEMPLATE } from '../cloudflare-sandbox';
import { CLOUD_RUN_JOB_TEMPLATE } from '../gcp';
import { KUBERNETES_JOB_TEMPLATE } from '../kubernetes';
import { DOCKERFILE_TEMPLATE, DOCKER_COMPOSE_TEMPLATE } from '../docker';
import { README_DENO_TEMPLATE } from '../deno';
import { README_VERCEL_TEMPLATE } from '../vercel';
import { README_MODAL_TEMPLATE } from '../modal';
import { README_HETZNER_TEMPLATE } from '../hetzner';
import { FLY_TOML_TEMPLATE, FLY_DOCKERFILE_TEMPLATE, README_FLY_TEMPLATE } from '../fly';
import { DOCKER_COMPOSE_ADAPTER_TEMPLATE, README_DOCKER_TEMPLATE } from '../docker-adapter';

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

  it('should export Docker templates containing correct properties', () => {
    expect(DOCKERFILE_TEMPLATE).toBeDefined();
    expect(DOCKERFILE_TEMPLATE).toContain('FROM node:18-slim');
    expect(DOCKER_COMPOSE_TEMPLATE).toBeDefined();
    expect(DOCKER_COMPOSE_TEMPLATE).toContain('version: \'3.8\'');
  });

  it('should export Deno Deploy templates containing correct properties', () => {
    expect(README_DENO_TEMPLATE).toBeDefined();
    expect(README_DENO_TEMPLATE).toContain('# Deno Deploy Guide');
  });

  it('should export Vercel templates containing correct properties', () => {
    expect(README_VERCEL_TEMPLATE).toBeDefined();
    expect(README_VERCEL_TEMPLATE).toContain('# Vercel Deployment Guide');
  });

  it('should export Modal templates containing correct properties', () => {
    expect(README_MODAL_TEMPLATE).toBeDefined();
    expect(README_MODAL_TEMPLATE).toContain('# Modal Deployment Guide');
  });

  it('should export Hetzner Cloud templates containing correct properties', () => {
    expect(README_HETZNER_TEMPLATE).toBeDefined();
    expect(README_HETZNER_TEMPLATE).toContain('# Hetzner Cloud Deployment');
  });

  it('should export Fly.io templates containing correct properties', () => {
    expect(FLY_TOML_TEMPLATE).toBeDefined();
    expect(FLY_TOML_TEMPLATE).toContain('app = "helios-render-worker"');
    expect(FLY_DOCKERFILE_TEMPLATE).toBeDefined();
    expect(FLY_DOCKERFILE_TEMPLATE).toContain('FROM mcr.microsoft.com/playwright:v1.49.1-jammy');
    expect(README_FLY_TEMPLATE).toBeDefined();
    expect(README_FLY_TEMPLATE).toContain('# Helios Fly.io Deployment');
  });

  it('should export Docker Adapter templates containing correct properties', () => {
    expect(DOCKER_COMPOSE_ADAPTER_TEMPLATE).toBeDefined();
    expect(DOCKER_COMPOSE_ADAPTER_TEMPLATE).toContain("version: '3.8'");
    expect(README_DOCKER_TEMPLATE).toBeDefined();
    expect(README_DOCKER_TEMPLATE).toContain('# Docker Deployment');
  });
});
