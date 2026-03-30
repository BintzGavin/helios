**Version**: 0.43.0

# CLI Status

## Current State
The Helios CLI is the primary user interface for component registry, project scaffolding, distributed rendering, and deployment.

## Next Steps
- Implement regression tests for remaining commands (e.g. `job.ts`, `render.ts`, `merge.ts`).

## Blocked Items
- None

## Available Commands
1. **Studio Command** - `helios studio` for launching dev server
2. **Render Command** - `helios render` for local/distributed rendering
3. **Init Command** - `helios init` for project scaffolding
4. **Components Command** - `helios components` for browsing registry
5. **Merge Command** - `helios merge` for stitching distributed render chunks

## History
[v0.43.0] ✅ Completed: Scaffold Hetzner Deployment Command - Implemented `helios deploy hetzner` to scaffold README-HETZNER.md for the Hetzner Cloud adapter.
[v0.42.0] ✅ Completed: CLI Scaffold Hetzner Deployment Plan - Created plan to implement `helios deploy hetzner` for the Hetzner Cloud adapter.
[v0.41.1] ✅ Completed: Verify Scaffold Azure Deployment Command - Verified that helios deploy azure is correctly implemented.
[v0.41.0] ✅ Completed: Add Diff Command Regression Tests - Implemented comprehensive unit tests for `helios diff`.
[v0.40.3] ✅ Completed: Scaffold Azure Deployment Command - Implemented `helios deploy azure` to scaffold Azure Functions deployment configuration.
[v0.40.2] ✅ Completed: Scaffold Kubernetes Deployment Command - Implemented `helios deploy kubernetes` to scaffold job.yaml and README-KUBERNETES.md for Kubernetes Job clusters.
[v0.40.1] ✅ Completed: Scaffold Components Command - Verified existing implementation of helios components command fulfills the scaffolding requirements.
[v0.40.0] ✅ Completed: Tier 3 Cloud Execution Adapters - Added support for Deno Deploy, Vercel, Modal, and Hetzner Cloud to the job run command.
[v0.37.4] ✅ Completed: Add Command Regression Tests - Implemented comprehensive unit tests for helios add.
[v0.37.3] ✅ Completed: CLI Merge Regression Tests - Verified existing regression tests for helios merge command
[v0.37.2] ✅ Merge Command Regression Tests Complete - Added missing regression test for `transcodeMerge` error handling in the `helios merge` command.
[v0.37.1] ✅ List Command Regression Tests - Implemented comprehensive unit tests for `helios list`.
[v0.37.0] ✅ Deploy Cloudflare - Implemented `helios deploy cloudflare` to scaffold Cloudflare Workers deployment configuration.
[v0.36.10] ✅ Merge Command Regression Tests - Implemented comprehensive unit tests for `helios merge`.
[v0.36.9] ✅ Cloud Worker Execution Azure Cloudflare - Added support for Cloudflare Workers and Azure Functions execution adapters to the job run command.
[v0.36.8] ✅ Add Command Regression Tests - Implemented comprehensive unit tests for `helios add`.
[v0.36.7] ✅ Add Command Regression Tests - Implemented comprehensive unit tests for `helios add`.
[v0.36.6] ✅ Update Command Regression Tests - Implemented comprehensive unit tests for `helios update`.
[v0.36.5] ✅ Update Command Tests Spec - Created specification plan for implementing regression tests for the `helios update` command.
[v0.36.4] ✅ Init Command Regression Tests - Implemented comprehensive regression tests for `helios init`.
[v0.36.3] ✅ Remove Command Regression Tests - Implemented comprehensive unit tests for `helios remove`.
[v0.1.0] ✅ Initial CLI with `helios studio` command
[v0.1.1] ✅ Pass Project Root to Studio - Injected HELIOS_PROJECT_ROOT env var in studio command
[v0.2.0] ✅ Scaffold Init Command - Implemented `helios init` to generate `helios.config.json`
[v0.3.0] ✅ Scaffold Add Command - Implemented `helios add` command scaffold and centralized configuration logic
[v0.4.0] ✅ Implement Components Command - Implemented `helios components` to list registry items
[v0.4.1] ✅ Implement Render Command - Implemented `helios render` command using `@helios-project/renderer`
[v0.5.0] ✅ Distributed Rendering Support - Added `--start-frame` and `--frame-count` to `helios render`
[v0.5.1] ✅ Fix Registry Components - Updated component registry to use V2 Helios Signals (`fps.value`, `duration.value`)
[v0.5.2] ✅ Project Scaffolding - Updated `helios init` to scaffold a full React+Vite project structure when `package.json` is missing
[v0.6.0] ✅ Implement Merge Command - Implemented `helios merge` for stitching video clips
[v0.7.0] ✅ Remote Registry Support - Implemented `RegistryClient` to fetch components from a remote URL with local fallback
[v0.8.0] ✅ Auto-Install Dependencies - Implemented automatic dependency installation for `helios add` with `--no-install` flag
[v0.9.0] ✅ Multi-Framework Support - Enabled `helios init` for Vue, Svelte, and Vanilla, and updated `helios studio` to load user config.
[v0.9.2] ✅ SolidJS Support - Added SolidJS template to `helios init` and added `--framework` flag for automated scaffolding.
[v0.10.0] ✅ Track Installed Components - Updated `helios add` to record installed components in `helios.config.json`.
[v0.11.0] ✅ Implement List Command - Implemented `helios list` to display installed components.
[v0.11.0] ✅ Verified List Command - Verified `helios list` correctly lists installed components, handles empty lists, and missing config.
[v0.11.1] ✅ Update Context & Verify - Updated context documentation for list command and re-verified functionality.
[v0.11.2] ✅ Unify Studio Registry - Updated `helios studio` to use the unified `RegistryClient`, enabling remote registry fetching and consistency with `helios add`.
[v0.12.0] ✅ Framework-Aware Registry - Implemented framework filtering in `RegistryClient` and updated `helios studio` and `helios add` to respect project framework. Added SolidJS support to registry types.
[v0.13.0] ✅ Implement Remove Command - Implemented `helios remove <component>` to unregister components and warn about associated files.
[v0.14.0] ✅ Implement Update Command - Implemented `helios update <component>` to restore or update components from the registry.
[v0.15.0] ✅ Implement Build Command - Implemented `helios build` wrapping Vite for production builds.
[v0.15.0] ✅ Synced Version - Updated package.json and index.ts to match status file and verified functionality.
[v0.16.0] ✅ Distributed Job Export - Implemented `--emit-job`, `--audio-codec`, and `--video-codec` options in `helios render` to generate distributed rendering job specifications.
[v0.17.0] ✅ Implement Job Command - Implemented `helios job run` to execute distributed rendering jobs from JSON specifications, supporting concurrency and selective chunk execution.
[v0.18.0] ✅ Implement Skills Command - Implemented `helios skills install` to distribute AI agent skills to user projects.
[v0.19.0] ✅ Implement Preview Command - Implemented `helios preview` to serve the production build locally using Vite.
[v0.20.0] ✅ Implement Example Init - Implemented `helios init --example` to fetch, download, and transform examples from GitHub, and improved interactivity with `prompts`.
[v0.20.2] ✅ Use RenderOrchestrator Planning - Refactored `helios render --emit-job` to use `RenderOrchestrator.plan()` for consistent chunking and command generation.
[v0.21.0] ✅ Portable Job Paths - Implemented relative path generation in `helios render --emit-job` and relative execution in `helios job run`.
[v0.22.0] ✅ Registry Dependencies - Implemented recursive component installation to support shared registry dependencies (e.g. `use-video-frame`).
[v0.23.0] ✅ Refine Component Removal - Enhanced `helios remove` to support interactive file deletion, `--yes` flag for automation, and `--keep-files` to preserve files.
[v0.24.0] ✅ Configurable Registry - Refactored `RegistryClient` to support configuration via `helios.config.json`'s `registry` property, enabling private registries.
[v0.25.0] ✅ Diff Command - Implemented `helios diff <component>` to compare local component files with the registry version, showing colorized diffs.
[v0.26.0] ✅ Registry Auth & Tests - Implemented authentication support for private registries using Bearer tokens and established Vitest-based testing infrastructure for the CLI package.
[v0.26.1] ✅ Add Install Tests - Added comprehensive unit tests for `installComponent` to verify dependency resolution, file operations, and config updates.
[v0.27.0] ✅ Remote Registry Hydration - Updated `RegistryClient` to support fetching lightweight `index.json` and hydrating file contents on demand, improving performance and enabling Shadcn-style registries.
[v0.28.0] ✅ Enhance Components Command - Updated `helios components` to support search queries and framework/all filtering, displaying component descriptions in the output.
[v0.28.1] ✅ Verify Components Command - Verified implementation of enhanced `helios components` command with search queries and framework filtering, confirming functionality matches documentation.
[v0.28.2] ✅ Registry Filtering - Verified `RegistryClient` cross-framework component sharing logic and consolidated test files.
[v0.28.3] ✅ Init Examples Fix - Replaced `degit` with `giget` in `helios init --example` to ensure reliable template downloading.
[v0.29.0] ✅ Deploy Command - Implemented `helios deploy setup` to scaffold Docker files and updated `helios render` to support environment variables for browser args.
[v0.30.0] ✅ Deploy GCP Command - Implemented `helios deploy gcp` to scaffold Google Cloud Run Job configuration and documentation.
[v0.31.0] ✅ AWS Deployment - Implemented `helios deploy aws` to scaffold Lambda deployment and updated `helios render` to support custom browser executable.
[v0.32.0] ✅ Remote Job Spec - Implemented support for executing distributed render jobs from remote HTTP/HTTPS URLs in `helios job run`.
[v0.34.0] ✅ Component Tracking - Implemented dependencies tracking in `helios.config.json` to mirror `package.json` dependencies.
[v0.34.1] ✅ Remote Job Assets - Implemented `--base-url` alias and fixed remote asset resolution in distributed jobs.
[v0.35.0] ✅ JobExecutor Integration - Refactored `helios job run` to use `@helios-project/infrastructure`'s `JobExecutor` and `LocalWorkerAdapter`.
[v0.36.0] ✅ Cloud Worker Execution - Integrated AwsLambdaAdapter and CloudRunAdapter into helios job run.
[v0.36.2] ✅ Init Command Tests Spec - Created specification plan for implementing regression tests for the `helios init` command to ensure scaffolding stability.
[v0.36.1] ✅ Add Command Scaffold - Verified the existing `helios add` command fulfills the scaffolding requirements outlined in the plan.
[v0.39.0] ✅ Completed: Cloud Execution Adapters Expansion - Added support for Docker, Fly.io, and Kubernetes to the job run command.
[v0.38.0] ✅ Completed: Scaffold Fly.io Deployment Command - Implemented helios deploy fly to scaffold fly.toml, Dockerfile, and README-FLY.md for Fly.io Machines.
[v0.39.1] ✅ Completed: CLI Scaffold Components - Verified existing implementation of helios components command fulfills the scaffolding requirements.
