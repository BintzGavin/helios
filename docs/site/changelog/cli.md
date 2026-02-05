---
title: "CLI Changelog"
description: "Changelog for the CLI package"
---

# CLI Changelog

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
