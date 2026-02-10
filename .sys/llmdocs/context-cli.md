# CLI Context

## Section A: Architecture
The Helios CLI (`packages/cli`) is the primary interface for users. It is built using `commander.js`.
- **Entry Point**: `bin/helios.js` (shebang) -> `dist/index.js` (compiled).
- **Command Registration**: Commands are defined in `src/commands/` and registered in `src/index.ts` using `register[Command]Command(program)`.
- **Registry**: Uses `RegistryClient` (`src/registry/client.ts`) to fetch components from a remote URL or fallback to a local manifest (`src/registry/manifest.ts`). Supports recursive installation via `registryDependencies`.
- **Configuration**: Reads/writes `helios.config.json` in the project root.

## Section B: File Tree
```
packages/cli/
├── bin/
│   └── helios.js
├── src/
│   ├── commands/
│   │   ├── add.ts
│   │   ├── build.ts
│   │   ├── components.ts
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
│   │   ├── client.ts
│   │   ├── manifest.ts
│   │   └── types.ts
│   ├── templates/
│   ├── utils/
│   │   ├── config.ts
│   │   ├── examples.ts
│   │   ├── ffmpeg.ts
│   │   ├── install.ts
│   │   ├── logger.ts
│   │   ├── package-manager.ts
│   │   └── uninstall.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Section C: Commands
- `helios init [name]` - Initialize a new project.
  - `--example <name>` - Scaffold from an example.
  - `--repo <url>` - Scaffold from a git repo.
  - `--yes` - Skip prompts.
- `helios studio` - Start the Studio dev server.
  - `--port <number>` - Specify port.
  - `--open` - Open browser.
- `helios add <component>` - Add a component to the project.
  - `--no-install` - Skip npm dependency installation.
  - Installs recursively (e.g., `timer` installs `use-video-frame`).
- `helios remove <component>` - Remove a component.
  - `--yes` - Skip confirmation.
  - `--keep-files` - Keep component files on disk.
- `helios update <component>` - Update a component from registry.
- `helios list` - List installed components.
- `helios components` - List available registry components.
- `helios render <composition>` - Render a composition to video.
  - `--out <file>` - Output file.
  - `--concurrency <n>` - Number of parallel workers.
  - `--start-frame <n>` - Start frame.
  - `--frame-count <n>` - Number of frames.
  - `--emit-job <file>` - Generate a distributed job JSON.
- `helios merge <files...>` - Merge video files.
  - `--out <file>` - Output file.
- `helios build` - Build the project for production.
- `helios preview` - Preview the production build.
- `helios job run <file>` - Execute a distributed job.
  - `--concurrency <n>` - Parallel workers.
  - `--chunk <index>` - Run specific chunk.
- `helios skills install <skill>` - Install AI agent skills.

## Section D: Configuration
**`helios.config.json`**:
```json
{
  "version": "1.0.0",
  "directories": {
    "components": "src/components/helios",
    "lib": "src/lib"
  },
  "components": ["timer", "use-video-frame"],
  "framework": "react" | "vue" | "svelte" | "solid" | "vanilla"
}
```

## Section E: Integration
- **Registry**: `RegistryClient` caches results and handles fallback. `installComponent` resolves dependency trees recursively.
- **Renderer**: `helios render` uses `RenderOrchestrator` from `@helios-project/renderer` for local and distributed rendering.
- **Studio**: `helios studio` uses `@helios-project/studio` to serve the UI, injecting project root context.
