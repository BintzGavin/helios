#!/bin/bash
# Regenerate .sys/llmdocs/context-cli.md

cat << 'DOCS' > .sys/llmdocs/context-cli.md
# Helios CLI Context

## A. Architecture

The CLI follows the Subcommand pattern using Commander.js.
- **Entry point**: `bin/helios.js` calls `dist/index.js` which registers commands.
- **Commands directory**: `src/commands/`
- Each command is registered via a `registerXCommand(program: Command): void` function.
- Exit codes: 0 for success, 1 for errors. Chalk is used for output styling.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # CLI Shebang Entry
├── src/
│   ├── index.ts            # Entry point, sets up Commander and registers commands
│   ├── commands/
│   │   ├── add.ts          # helios add <component> [--yes] [--no-install]
│   │   ├── build.ts        # helios build <composition>
│   │   ├── components.ts   # helios components (list registry)
│   │   ├── deploy.ts       # helios deploy <target>
│   │   ├── diff.ts         # helios diff <component>
│   │   ├── init.ts         # helios init <dir> [--framework] [--example]
│   │   ├── job.ts          # helios job <subcommand>
│   │   ├── list.ts         # helios list (installed components)
│   │   ├── merge.ts        # helios merge <jobPath>
│   │   ├── preview.ts      # helios preview <composition>
│   │   ├── remove.ts       # helios remove <component>
│   │   ├── render.ts       # helios render <composition>
│   │   ├── skills.ts       # helios skills (agent skills wrapper)
│   │   ├── studio.ts       # helios studio [dir]
│   │   └── update.ts       # helios update <component>
│   ├── registry/
│   │   ├── client.ts       # Registry client for fetching components
│   │   ├── manifest.ts     # Local core component fallback manifest
│   │   └── types.ts        # Registry type definitions
│   └── utils/
│       ├── config.ts       # helios.config.json management
│       ├── examples.ts     # Scaffolding templates and examples
│       ├── ffmpeg.ts       # FFmpeg wrapper utilities
│       ├── install.ts      # Component installation logic
│       ├── logger.ts       # Terminal output utilities
│       ├── package-manager.ts # NPM/Yarn/PNPM detection and running
│       └── uninstall.ts    # Component removal logic
├── package.json
└── tsconfig.json
```

## C. Commands

- `helios add <component>`: Install a new registry component.
- `helios build <composition>`: Compile a composition for production.
- `helios components`: List available components from the registry.
- `helios deploy <target>`: Scaffold deployment templates (e.g., cloudflare-sandbox, aws, vercel).
- `helios diff <component>`: Show differences between installed and registry component.
- `helios init <dir>`: Scaffold a new Helios project.
- `helios job <subcommand>`: Distributed rendering job utilities (generate, run).
- `helios list`: List currently installed components in the project.
- `helios merge <jobPath>`: Merge distributed chunks back into a single video file.
- `helios preview <composition>`: Launch local preview server for a composition.
- `helios remove <component>`: Remove an installed component.
- `helios render <composition>`: Trigger local rendering.
- `helios skills`: Developer tools for agent skills.
- `helios studio [dir]`: Start the Helios Studio UI.
- `helios update <component>`: Update an installed component to the latest registry version.

## D. Configuration

- **`helios.config.json`**: Project-level config.
  - Read/written by `utils/config.ts`.
  - Tracks installed `components` (names and paths).
  - Specifies paths like `componentDir` (e.g., `src/components`).
  - Defines execution configurations (e.g., rendering concurrency, target cloud platforms).

## E. Integration

- **Registry**: Uses `RegistryClient` (fetch) to download components, falling back to local definitions in `manifest.ts`.
- **Renderer**: The `render` command wraps `@helios-project/renderer` APIs.
- **Studio**: The `studio` command wraps `@helios-project/studio` start functions.
- **Infrastructure**: Distributed worker execution logic (adapters like Cloudflare Sandbox, AWS, GCP) is pulled from `@helios-project/infrastructure` during `job run` execution.
DOCS
