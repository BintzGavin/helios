# CLI Domain Context
**Version**: 0.46.39
**Directory**: `packages/cli`

## Section A: Architecture
The `@helios-project/cli` package relies on `Commander.js` for argument parsing and scaffolding. It exposes numerous distinct subcommands to operate as the command-line interface entrypoint for the suite of tools provided by Helios (scaffolding templates, rendering jobs, launching studios, fetching skills, managing registry components, etc). The primary CLI entry point loads configuration metadata and delegates execution flows to explicit subcommand handlers registered in `packages/cli/src/commands/[command].ts`. It natively depends on adjacent packages, wrapping libraries such as `@helios-project/renderer`, `@helios-project/studio`, and `@helios-project/infrastructure`.

## Section B: File Tree
```
packages/cli/
├── bin/
│   └── helios.js           # Entry point (shebang, calls dist/index.js)
├── src/
│   ├── index.ts            # Main CLI setup, registers all commands
│   ├── commands/
│   │   ├── studio.ts       # helios studio (existing)
│   │   ├── add.ts          # helios add [component] (registry)
│   │   ├── init.ts         # helios init (project scaffolding)
│   │   ├── render.ts       # helios render (trigger rendering)
│   │   └── components.ts   # helios components (list registry)
│   ├── utils/
│   │   ├── registry.ts     # Registry fetching utilities
│   │   ├── config.ts       # Config file management
│   │   └── logger.ts       # Logging utilities
│   └── types/
│       └── index.ts        # Shared types
```

## Section C: Commands
All available commands:
* `helios init [target]`
* `helios build [target]`
* `helios add <component>`
* `helios components`
* `helios deploy`
* `helios diff <component>`
* `helios job run <file>`
* `helios list`
* `helios merge <output> [inputs...]`
* `helios preview`
* `helios remove <component>`
* `helios render <input>`
* `helios skills install`
* `helios studio`
* `helios update <component>`

## Section D: Configuration
The CLI reads the `helios.config.json` inside user workspaces. This file typically specifies structural context like the default `framework`, `registry`, and component location mappings (`directories`).

## Section E: Integration
* **Registry Integration:** Reaches out to a remote component registry via HTTP requests and syncs files inside local directories according to user configurations and frameworks.
* **Renderer Integration:** Exposes the `RenderOrchestrator` methods and `Puppeteer` execution behaviors.
* **Infrastructure Integration:** Delegates job execution through worker adapters across numerous remote targets (AWS Lambda, Azure Functions, GCP Cloud Run, Cloudflare, etc).
