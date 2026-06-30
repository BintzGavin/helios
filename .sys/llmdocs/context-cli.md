
# CLI Context

## Section A: Architecture
The CLI uses Commander.js for command parsing. Subcommands are registered using a `registerXCommand(program)` pattern inside `packages/cli/src/commands/[command].ts`.

## Section B: File Tree
```
packages/cli/
├── bin/
│   └── helios.js
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── add.ts
│   │   ├── build.ts
│   │   ├── components.ts
│   │   ├── deploy.ts
│   │   ├── diff.ts
│   │   ├── init.ts
│   │   ├── job.ts
│   │   ├── list.ts
│   │   ├── merge.ts
│   │   ├── preview.ts
│   │   ├── remove.ts
│   │   ├── render.ts
│   │   ├── skills.ts
│   │   ├── studio.ts
│   │   └── update.ts
│   ├── registry/
│   ├── templates/
│   └── utils/
```

## Section C: Commands
- `helios add [component]` - Install components from registry
- `helios build [dir]` - Build for production
- `helios components [query]` - Search registry
- `helios deploy <provider>` - Scaffold deployments
- `helios diff <component>` - Compare local components
- `helios init [target]` - Scaffold project/configs
- `helios job run <file>` - Run distributed job
- `helios list` - List installed components
- `helios merge <audio> <video>` - Merge output chunks
- `helios preview [dir]` - Local preview
- `helios remove <component>` - Uninstall component
- `helios render <input>` - Render compositions
- `helios skills install` - Distribute AI skills
- `helios studio [dir]` - Visual studio
- `helios update <component>` - Update/restore components

## Section D: Configuration
Reads `helios.config.json` or scaffold defaults. Supports `directories.components`, `directories.lib`, `framework` and `registry` definitions.

## Section E: Integration
Integrates with Registry (`@helios-project/registry`), Studio (`@helios-project/studio`), Infrastructure (`@helios-project/infrastructure`), and Renderer (`@helios-project/renderer`).


<!-- Context regenerated and verified for v0.46.46 -->

<!-- Updated for v0.46.59 to reflect 100% registry client coverage -->
