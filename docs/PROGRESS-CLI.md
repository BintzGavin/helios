# CLI Progress

This file tracks progress for the CLI domain (`packages/cli`).

## CLI v0.11.0

- ✅ Implement List Command - Implemented `helios list` to display installed components.

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
