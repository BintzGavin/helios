# CLI Status

**Version**: 0.3.0

## Current State

The Helios CLI (`packages/cli`) provides the command-line interface for the Helios video engine. It is a first-class product surface in V2, responsible for:

- Component registry management (Shadcn-style)
- Workflow automation
- Rendering commands
- Deployment workflows

## Existing Commands

- `helios studio` - Launches the Helios Studio dev server
- `helios init` - Initializes a new Helios project configuration
- `helios add` - Scaffold for adding components (currently a stub)

## V2 Roadmap

Per AGENTS.md, the CLI is "ACTIVELY EXPANDING FOR V2" with focus on:

1. **Registry Commands** - `helios add [component]` for fetching components
2. **Render Commands** - `helios render` for local/distributed rendering
3. **Init Command** - `helios init` for project scaffolding
4. **Components Command** - `helios components` for browsing registry

## History

[v0.1.0] ✅ Initial CLI with `helios studio` command
[v0.1.1] ✅ Pass Project Root to Studio - Injected HELIOS_PROJECT_ROOT env var in studio command
[v0.2.0] ✅ Scaffold Init Command - Implemented `helios init` to generate `helios.config.json`
[v0.3.0] ✅ Scaffold Add Command - Implemented `helios add` command scaffold and centralized configuration logic
