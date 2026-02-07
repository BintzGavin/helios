# CLI Progress

This file tracks progress for the CLI domain (`packages/cli`).

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
