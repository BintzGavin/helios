**Version**: 0.46.43

[v0.46.41] ✅ Completed: CLI Docker Adapter Regression Tests - Logged the duplicated plan as impossible since docker-adapter template tests are already fully implemented.
[v0.46.40] 🟢 Completed: CLI Command Coverage Tests Spec V3 - Created specification plan 2027-06-05-CLI-Command-Coverage-Tests-V3.md for improving CLI command regression tests.
[v0.46.39] 🟢 Completed: CLI Command Coverage Tests Spec V3 - Created specification plan 2027-06-05-CLI-Command-Coverage-Tests-V3.md for improving CLI command regression tests.
[v0.46.38] ✅ Completed: CLI Registry Types Regression Tests - Logged the duplicated plan as impossible since registry types regression tests are already fully implemented.
[v0.46.34] ✅ Completed: CLI Registry Types Regression Tests - Implemented structural verification tests for registry interfaces.
[v0.46.33] ✅ Completed: CLI Job Regression Tests Missing Mock - Added missing mock setup for @helios-project/infrastructure to fix import resolution errors
[v0.46.32] ✅ Completed: CLI Docker Adapter Regression Tests - Implemented unit tests for the docker-adapter cloud template.

[v0.46.30] ✅ Completed: CLI Cloud Templates Tests - Implemented unit tests for remaining cloud deployment templates.

[v0.46.29] 🟢 Completed: CLI Cloud Templates Regression Tests Spec - Created strictly new specification plan `2027-06-05-CLI-Cloud-Templates-Regression-Tests-V2.md` to address the missing tests for cloud infrastructure templates in `packages/cli/src/templates/__tests__/cloud.test.ts`.
[v0.46.28] 🟢 Completed: CLI Cloud Templates Regression Tests Spec - Created specification plan `2027-06-05-CLI-Cloud-Templates-Regression-Tests.md` to add missing tests for Docker, Deno, Vercel, Modal, Hetzner, and Fly.io templates to `packages/cli/src/templates/__tests__/cloud.test.ts`.
[v0.46.28] 🟢 Completed: CLI Cloud Templates Regression Tests Spec - Created specification plan `2027-06-05-CLI-Cloud-Templates-Regression-Tests.md` to add missing tests for Docker, Deno, Vercel, Modal, Hetzner, and Fly.io templates to `packages/cli/src/templates/__tests__/cloud.test.ts`.
# CLI Status

**Version**: 0.46.26
[v0.46.26] ✅ Completed: Document duplicated CLI Index Regression Tests plan - Logged the duplicated plan as impossible.
[v0.46.25] ✅ Completed: CLI Index Regression Tests - Implemented unit tests for the CLI entry point in index.ts.
[v0.46.23] ✅ Completed: Document duplicated Registry Manifest Regression Tests plan - Logged the duplicated plan as impossible.

[v0.46.22] ✅ Completed: Registry Manifest Regression Tests - Implemented unit tests for packages/cli/src/registry/manifest.ts


[v0.46.21] ✅ Completed: Document duplicated Cloudflare Sandbox Execution plan - Logged the duplicated plan as impossible.
[v0.46.20] ✅ Completed: Document duplicated CLI Utils Regression Tests plan - Logged the duplicated plan as impossible.

[v0.46.19] ✅ Completed: CLI Utils Regression Tests - Implemented comprehensive unit tests for ffmpeg, package-manager, and uninstall utilities in packages/cli/src/utils/.

## Recent Completions
[v0.46.21] ✅ Completed: Registry Manifest Regression Tests Spec - Created specification plan for implementing regression tests for packages/cli/src/registry/manifest.ts to ensure structural data retrieval works as expected.
[v0.46.18] ✅ Completed: CLI Utils Regression Tests Spec - Created specification plan for implementing regression tests for the remaining uncovered utilities in packages/cli/src/utils/ to ensure core functions are robust.
[v0.46.16] ✅ Completed: Remaining CLI Regression Tests - Identified as duplicate plan; tests for preview, skills, and studio are already implemented.
[v0.46.15] ✅ Completed: Document duplicated Remaining Regression Tests plan - Logged the duplicated plan as impossible.
[v0.46.14] ✅ Completed: Document duplicated Regression Tests plan - Logged the duplicated plan for job, render, and merge commands as impossible.
[v0.46.13] ✅ Completed: Document duplicated Remove Regression Tests plan - Logged the duplicated plan as impossible.
[v0.46.12] ✅ Completed: Regression Tests Remaining Commands - Verified comprehensive unit tests for `helios preview`, `helios skills`, and `helios studio`.
[v0.46.11] ✅ Completed: Scaffold Cloudflare Sandbox Deployment Command - Implemented `helios deploy cloudflare-sandbox` to scaffold Cloudflare Workflows and Sandboxes.
[v0.46.10] ✅ Completed: Implement remaining CLI command regression tests - Add unit tests for preview, skills, and studio.
[v0.46.8] ✅ Completed: Build Command Regression Tests - Implemented unit tests for the build command.
[v0.46.7] ✅ Completed: Deploy Command Regression Tests - Implemented unit tests for all remaining deploy subcommands.
[v0.46.6] ✅ Completed: Add Cloudflare Sandbox Adapter support to job run - Verified implementation and tests for Cloudflare Sandbox adapter support in the job run command.
[v0.46.5] ✅ Completed: Implement job command regression tests - Add unit tests for job run and adapters.
[v0.46.4] ✅ Completed: Add Cloudflare Sandbox Adapter support to job run - Exposes the adapter from infrastructure package

[v0.46.3] ✅ Completed: Scaffold Hetzner Deployment Command - Verified existing implementation of helios deploy hetzner command fulfills the scaffolding requirements.
[v0.45.1] ✅ Completed: Scaffold Cloudflare Sandbox Deployment - Verified `helios deploy cloudflare-sandbox` command is implemented and working.
[v0.45.0] ✅ Completed: Scaffold Cloudflare Sandbox Deployment - Added `helios deploy cloudflare-sandbox` command to generate wrangler.toml, workflow index, and render script.
## Current State
The Helios CLI is the primary user interface for component registry, project scaffolding, distributed rendering, and deployment.

[v0.46.1] ✅ Completed: All Worker Execution - Added missing --docker-args to Docker execution adapter

[v0.46.0] ✅ Completed: Scaffold Docker Deployment Command - Implemented `helios deploy docker` to scaffold docker-compose.yml and README-DOCKER.md for running distributed rendering workloads via Docker Swarm/Compose.

[v0.44.0] ✅ Completed: Tier 3 Scaffold Deployment Commands - Implemented `helios deploy modal`, `helios deploy deno`, and `helios deploy vercel`.


## Blocked Items

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
[v0.41.2] ✅ Completed: Scaffold Cloudflare Sandbox Adapter - Exposed the Cloudflare Sandbox adapter in the `helios job run` command options and configuration block.
[v0.46.17] ✅ Completed: Document duplicated Deploy Command Regression Tests plan - Logged the duplicated plan as impossible.

[v0.46.22] 🟢 Completed: CLI Templates Regression Tests Spec - Created specification plan `2027-06-05-CLI-Templates-Regression-Tests.md` for implementing regression tests for all file generation templates in `packages/cli/src/templates`.

[v0.46.24] ✅ Completed: CLI Templates Regression Tests - Implemented unit tests for file generation templates in packages/cli/src/templates.
- [x] [v0.46.27] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/
[v0.46.31] ✅ Completed: CLI Index Regression Tests - Implemented unit tests for the main CLI entry point in packages/cli/src/__tests__/index.test.ts.
[v0.46.33] 🟢 Completed: CLI Registry Types Regression Tests Spec - Created specification plan `2027-06-05-CLI-Registry-Types-Regression-Tests.md` for implementing structural verification tests for registry interfaces.
[v0.46.34] 🟢 Completed: CLI Job Types Regression Tests Spec - Created specification plan `2027-06-05-CLI-Job-Types-Regression-Tests.md` for implementing structural verification tests for job specification interfaces.
[v0.46.35] ✅ Completed: CLI Job Types Regression Tests - Implemented unit tests for job specification interfaces in packages/cli/src/types/__tests__/job.test.ts.
[v0.46.36] 🟢 Completed: CLI Job/Render/Merge Tests Missing Mock Spec - Created specification plan `2027-06-05-CLI-Job-Render-Merge-Regression-Tests-Missing-Mock.md` for fixing vitest mock resolution errors.
[v0.46.36] ✅ Completed: CLI Job Regression Tests Missing Mock - Added deps.inline config to vitest.config.ts to fix import resolution errors for workspace dependencies
[v0.46.37] 🟢 Completed: CLI Command Coverage Tests Spec - Created specification plan 2027-06-05-CLI-Command-Coverage-Tests-V2.md for improving CLI command regression tests.

[v0.46.37] ✅ Completed: CLI Command Coverage Tests V2 - Implemented missing test cases for render, build, init, and studio commands.
[v0.46.38] ✅ Completed: CLI Job/Render/Merge Tests Missing Mock - Fixed vitest mock resolution errors by setting `server.deps.inline` in `vitest.config.ts`.

[v0.46.39] 🟢 Completed: CLI Command Coverage Tests Spec V4 - Created specification plan `2027-06-05-CLI-Command-Coverage-Tests-V4.md` for covering missing branches in commands.
[v0.46.39] ✅ Completed: CLI Command Coverage Tests V4 - Implemented missing test cases for init, build, job, render, and studio commands, improving test coverage metrics and resolving missing branch execution logic.
[v0.46.41] 🟢 Completed: CLI Command Coverage Tests Spec V5 - Created specification plan `2027-06-05-CLI-Command-Coverage-Tests-V5.md` for covering missing command edges.

[v0.46.42] ✅ Completed: CLI Command Coverage Tests V5 - Implemented edge-case test coverage for commands and fixed prompt cancellation exit bug in init.ts.
[v0.46.42] 🟢 IMPOSSIBLE: DUPLICATION - CLI Docker Adapter Templates Regression Tests Spec - Tests are already fully implemented.
[v0.46.43] 🟢 Completed: CLI Command Coverage Tests Spec V6 - Created specification plan 2027-06-05-CLI-Command-Coverage-Tests-V6.md for covering missing command edges.

[v0.46.43] ✅ Completed: CLI Command Coverage Tests V6 - Implemented test coverage for missing command edges including job adapter options and executor errors.
