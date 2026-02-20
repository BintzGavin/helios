# CLI Status

**Version**: 0.29.0

## Current State

The Helios CLI (`packages/cli`) provides the command-line interface for the Helios video engine. It is a first-class product surface in V2, responsible for:

- Component registry management (Shadcn-style)
- Workflow automation
- Rendering commands
- Deployment workflows

## Existing Commands

- `helios studio` - Launches the Helios Studio dev server
- `helios init` - Initializes a new Helios project configuration and scaffolds project structure
- `helios add` - Adds a component to the project
- `helios list` - Lists installed components in the project
- `helios components` - Lists available components in the registry
- `helios render` - Renders a composition to video
- `helios merge` - Merges multiple video files into one without re-encoding
- `helios remove` - Removes a component from the project configuration and deletes associated files (with confirmation)
- `helios update` - Updates a component to the latest version
- `helios build` - Builds the project for production
- `helios job` - Manages distributed rendering jobs
- `helios skills` - Manages AI agent skills installation
- `helios preview` - Previews the production build locally
- `helios diff` - Compares local component code with the registry version
- `helios deploy` - Scaffolds deployment configurations (e.g., Docker)

## V2 Roadmap

Per AGENTS.md, the CLI is "ACTIVELY EXPANDING FOR V2" with focus on:

1. **Registry Commands** - `helios add [component]` for fetching components
2. **Render Commands** - `helios render` for local/distributed rendering
3. **Init Command** - `helios init` for project scaffolding
4. **Components Command** - `helios components` for browsing registry
5. **Merge Command** - `helios merge` for stitching distributed render chunks

## History

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
