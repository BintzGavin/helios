# CLI Progress

This file tracks progress for the CLI domain (`packages/cli`).

## CLI v0.37.3

- ✅ Completed: CLI Merge Regression Tests - Verified existing regression tests for helios merge command

## CLI v0.37.2

- ✅ Merge Command Regression Tests Complete - Added missing regression test for `transcodeMerge` error handling in the `helios merge` command.

## CLI v0.37.1

- ✅ List Command Regression Tests - Implemented comprehensive unit tests for `helios list`.

## CLI v0.37.0

- ✅ Deploy Cloudflare - Implemented `helios deploy cloudflare` to scaffold Cloudflare Workers deployment configuration.

## CLI v0.36.10

- ✅ Merge Command Regression Tests - Implemented comprehensive unit tests for `helios merge`.

## CLI v0.36.9

- ✅ Cloud Worker Execution Azure Cloudflare - Added support for Cloudflare Workers and Azure Functions execution adapters to the job run command.

## CLI v0.36.8

- ✅ Add Command Regression Tests - Implemented comprehensive unit tests for `helios add`.

## CLI v0.36.7

- ✅ Add Command Regression Tests - Implemented comprehensive unit tests for `helios add`.

## CLI v0.36.6

- ✅ Update Command Regression Tests - Implemented comprehensive unit tests for `helios update`.

## CLI v0.36.5

- ✅ Update Command Tests Spec - Created specification plan for implementing regression tests for the `helios update` command.

## CLI v0.36.4

- ✅ Init Command Regression Tests - Implemented comprehensive regression tests for `helios init`.

## CLI v0.36.3

- ✅ Remove Command Regression Tests - Implemented comprehensive unit tests for `helios remove`.

## CLI v0.36.2

- ✅ Init Command Tests Spec - Created specification plan for implementing regression tests for the `helios init` command to ensure scaffolding stability.

## CLI v0.36.1

- ✅ Add Command Scaffold - Verified the existing `helios add` command fulfills the scaffolding requirements outlined in the plan.

## CLI v0.36.0

- ✅ Cloud Worker Execution - Integrated AwsLambdaAdapter and CloudRunAdapter into helios job run.

## CLI v0.35.0

- ✅ JobExecutor Integration - Refactored `helios job run` to use `@helios-project/infrastructure`'s `JobExecutor` and `LocalWorkerAdapter`.

## CLI v0.34.0

- ✅ Component Tracking - Implemented dependencies tracking in `helios.config.json` to mirror `package.json` dependencies.

## CLI v0.33.0

- ✅ Stateless Worker - Implemented support for stateless job execution via HELIOS_JOB_SPEC environment variable in GCP templates.

## CLI v0.32.0

- ✅ Remote Job Spec - Implemented support for executing distributed render jobs from remote HTTP/HTTPS URLs in `helios job run`.

## CLI v0.31.0

- ✅ AWS Deployment - Implemented `helios deploy aws` to scaffold AWS Lambda deployment and updated `helios render` to support custom browser executable.

## CLI v0.30.0

- ✅ Deploy GCP Command - Implemented `helios deploy gcp` to scaffold Google Cloud Run Job configuration and documentation.

## CLI v0.29.0

- ✅ Deploy Command - Implemented `helios deploy setup` to scaffold Docker files and updated `helios render` to support environment variables for browser args.

## CLI v0.28.2

- ✅ Registry Filtering - Verified `RegistryClient` cross-framework component sharing logic and consolidated test files.

## CLI v0.28.1

- ✅ Verify Components Command - Verified implementation of enhanced `helios components` command with search queries and framework filtering, confirming functionality matches documentation.

## CLI v0.28.0

- ✅ Enhance Components Command - Updated `helios components` to support search queries and framework/all filtering, displaying component descriptions in the output.

## CLI v0.27.0

- ✅ Remote Registry Hydration - Updated `RegistryClient` to support fetching lightweight `index.json` and hydrating file contents on demand, improving performance and enabling Shadcn-style registries.

## CLI v0.26.1

- ✅ Add Install Tests - Added comprehensive unit tests for `installComponent` to verify dependency resolution, file operations, and config updates.

## CLI v0.26.0

- ✅ Registry Auth & Tests - Implemented authentication support for private registries using Bearer tokens and established Vitest-based testing infrastructure for the CLI package.

## CLI v0.25.0

- ✅ Diff Command - Implemented `helios diff <component>` to compare local component files with the registry version, showing colorized diffs.

## CLI v0.24.0

- ✅ Configurable Registry - Refactored `RegistryClient` to support configuration via `helios.config.json`'s `registry` property, enabling private registries.

## CLI v0.23.0

- ✅ Refine Component Removal - Enhanced `helios remove` to support interactive file deletion, `--yes` flag for automation, and `--keep-files` to preserve files.

## CLI v0.22.0

- ✅ Registry Dependencies - Implemented recursive component installation to support shared registry dependencies (e.g. `use-video-frame`).

## CLI v0.21.0

- ✅ Portable Job Paths - Implemented relative path generation in `helios render --emit-job` and relative execution in `helios job run` to support distributed rendering across machines.

## CLI v0.20.1

- ✅ Performance Optimization - Optimized `helios init` file creation using `Promise.all` and `fs.promises` to improve concurrency and scalability.

## CLI v0.20.0

- ✅ Implement Example Init - Implemented `helios init --example` to fetch, download, and transform examples from GitHub.

## CLI v0.19.0

- ✅ Implement Preview Command - Implemented `helios preview` to serve the production build locally using Vite.

## CLI v0.18.0

- ✅ Implement Skills Command - Implemented `helios skills install` to distribute AI agent skills to user projects.

## CLI v0.17.0

- ✅ Implement Job Command - Implemented `helios job run` to execute distributed rendering jobs from JSON specifications, supporting concurrency and selective chunk execution.

## CLI v0.16.0

- ✅ Distributed Job Export - Implemented `--emit-job`, `--audio-codec`, and `--video-codec` options in `helios render` to generate distributed rendering job specifications.

## CLI v0.15.0

- ✅ Implement Build Command - Implemented `helios build` wrapping Vite for production builds.
- ✅ Synced Version - Updated `package.json` and `index.ts` to match status file and verified functionality.

## CLI v0.14.0

- ✅ Implement Update Command - Implemented `helios update <component>` to restore or update components from the registry.

## CLI v0.13.0

- ✅ Implement Remove Command - Implemented `helios remove <component>` to unregister components and warn about associated files.

## CLI v0.12.0

- ✅ Framework-Aware Registry - Implemented framework filtering in `RegistryClient` and updated `helios studio` and `helios add` to respect project framework. Added SolidJS support to registry types.

## CLI v0.11.2

- ✅ Unify Studio Registry - Updated `helios studio` to use the unified `RegistryClient`, enabling remote registry fetching and consistency with `helios add`.

## CLI v0.11.1

- ✅ Update Context & Verify - Updated context documentation for list command and re-verified functionality.

## CLI v0.11.0

- ✅ Implement List Command - Implemented `helios list` to display installed components.
- ✅ Verified List Command - Verified `helios list` correctly lists installed components, handles empty lists, and missing config.

## CLI v0.10.1

- ✅ Sync & Verify - Synced CLI version, updated context documentation, and verified distributed rendering concurrency flags.

## CLI v0.10.0

- ✅ Track Installed Components - Updated `helios add` to automatically record installed components in `helios.config.json` and persist config changes.

## CLI v0.9.2

- ✅ SolidJS Support Verified - Verified SolidJS template functionality and added `--framework` CLI flag for automation.

## CLI v0.9.1

- ✅ SolidJS Support - Added SolidJS template to `helios init`

## CLI v0.9.0

- ✅ Multi-Framework Support - Implemented `helios init` support for React, Vue, Svelte, and Vanilla templates

## CLI v0.8.0

- ✅ Auto-Install Dependencies - Implemented automatic dependency installation for `helios add` with `--no-install` flag

## CLI v0.7.0

- ✅ Remote Registry Support - Implemented `RegistryClient` to fetch components from a remote URL with local fallback

## CLI v0.6.0

- ✅ Implement Merge Command - Implemented `helios merge` command to stitch multiple video files into a single output without re-encoding

## CLI v0.5.2

- ✅ Project Scaffolding - Updated `helios init` to scaffold a full React+Vite project structure when `package.json` is missing

## CLI v0.5.1

- ✅ Fix Registry Components - Updated component registry to use V2 Helios Signals (`fps.value`, `duration.value`)

## CLI v0.5.0

- ✅ Distributed Rendering Support - Added `--start-frame` and `--frame-count` to `helios render`

## CLI v0.4.1

- ✅ Implement `helios render` command to allow rendering compositions from the CLI

## CLI v0.4.0

- ✅ Implement `helios components` command to list registry items

## CLI v0.3.0

- ✅ Scaffold `helios add` command and centralized configuration logic

## CLI v0.2.0

- ✅ Implement `helios init` command to scaffold `helios.config.json`

## CLI v0.1.1

- ✅ Implement `HELIOS_PROJECT_ROOT` injection in `helios studio` command

## CLI v0.1.0

- ✅ Initial CLI setup with Commander.js
- ✅ `helios studio` command to launch Studio dev server
