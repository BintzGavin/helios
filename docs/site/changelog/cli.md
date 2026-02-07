---
title: "CLI Changelog"
description: "Changelog for the CLI package"
---

# CLI Changelog

## v0.20.1
- **Performance Optimization**: Optimized `helios init` file creation using `Promise.all` and `fs.promises` to improve concurrency and scalability.

## v0.20.0
- **Implement Example Init**: Implemented `helios init --example` to fetch, download, and transform examples from GitHub, and improved interactivity with `prompts`.

## v0.18.0
- **Implement Skills Command**: Implemented `helios skills install` to distribute AI agent skills to user projects.

## v0.17.0
- **Implement Job Command**: Implemented `helios job run` to execute distributed rendering jobs from JSON specifications.

## v0.15.0
- **Implement Build Command**: Implemented `helios build` wrapping Vite for production builds.

## v0.14.0
- **Update Command**: Implemented `helios update <component>` to restore or update components from the registry.

## v0.13.0
- **Remove Command**: Implemented `helios remove <component>` to unregister components and warn about associated files.

## v0.12.0
- **Framework-Aware Registry**: Implemented framework filtering in `RegistryClient` and updated `helios studio` and `helios add` to respect project framework. Added SolidJS support to registry types.

## v0.11.2
- **Unify Studio Registry**: Updated `helios studio` to use the unified `RegistryClient`, enabling remote registry fetching and consistency with `helios add`.

## v0.11.0
- **List Command**: Implemented `helios list` to display installed components from `helios.config.json`.

## v0.10.0
- **Track Installed Components**: Updated `helios add` to record installed components in `helios.config.json`.

## v0.9.2
- **SolidJS Support**: Added SolidJS template to `helios init` and added `--framework` flag for automated scaffolding.

## v0.9.0
- **Multi-Framework Support**: Enabled `helios init` for Vue, Svelte, and Vanilla, and updated `helios studio` to load user config.

## v0.8.0
- **Auto-Install Dependencies**: Implemented automatic dependency installation for `helios add` with `--no-install` flag.

## v0.7.0
- **Remote Registry Support**: Implemented `RegistryClient` to fetch components from a remote URL with local fallback.

## v0.6.0
- **Implement Merge Command**: Implemented `helios merge` command to stitch multiple video files into a single output without re-encoding.

## v0.4.1
- **Render Command**: Implemented `helios render` command to allow rendering compositions from the CLI using `@helios-project/renderer`.

## v0.4.0
- **Components Command**: Implemented `helios components` command to list registry items.

## v0.3.0
- **Add Command**: Implemented `helios add` command scaffold and centralized configuration logic.

## v0.2.0
- **Init Command**: Implemented `helios init` command to generate `helios.config.json` scaffolding.

## v0.1.1
- **Studio Root Injection**: Implemented `HELIOS_PROJECT_ROOT` injection in `helios studio` command.

## v0.1.0
- **Initial Release**: Initial CLI setup with Commander.js and `helios studio` command to launch Studio dev server.
