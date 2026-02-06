# CLI Status

**Version**: 0.16.0

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
- `helios remove` - Removes a component from the project configuration
- `helios update` - Updates a component to the latest version
- `helios build` - Builds the project for production

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
