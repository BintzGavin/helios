# CLI Context

## A. Architecture

The Helios CLI is the primary interface for managing Helios projects, rendering compositions, and interacting with the component registry. It is built with `commander` and compiled to a Node.js binary.

**Key Components:**
- **Entry Point**: `bin/helios.js` (shebang) calls `dist/index.js`.
- **Command Registration**: `src/index.ts` initializes the program and registers commands from `src/commands/`.
- **Registry Client**: `src/registry/client.ts` handles component fetching (remote with local fallback).
- **Utilities**: `src/utils/` contains helpers for config loading (`config.ts`), installation logic (`install.ts`), and package management (`package-manager.ts`).
- **Templates**: `src/templates/` contains project scaffolds for React, Vue, Svelte, Solid, and Vanilla.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # Executable entry point
├── src/
│   ├── index.ts            # Main application setup
│   ├── commands/
│   │   ├── add.ts          # 'helios add' command
│   │   ├── components.ts   # 'helios components' command
│   │   ├── init.ts         # 'helios init' command
│   │   ├── merge.ts        # 'helios merge' command
│   │   ├── render.ts       # 'helios render' command
│   │   ├── studio.ts       # 'helios studio' command
│   └── registry/
│       ├── client.ts       # RegistryClient implementation
│       ├── manifest.ts     # Local fallback registry data
│       └── types.ts        # Registry type definitions
│   └── templates/
│       ├── react.ts        # React scaffold
│       ├── solid.ts        # SolidJS scaffold
│       ├── svelte.ts       # Svelte scaffold
│       ├── vanilla.ts      # Vanilla scaffold
│       └── vue.ts          # Vue scaffold
│   └── utils/
│       ├── config.ts       # Config file loader
│       ├── install.ts      # Component installation logic
│       └── package-manager.ts # Package manager detection & installation
└── package.json
```

## C. Commands

### `helios init [options]`
Initializes a new Helios project configuration and scaffolds structure if missing. Supports React, Vue, Svelte, Solid, and Vanilla templates.
- **Options**:
  - `-y, --yes`: Skip prompts and use defaults (React).
  - `-f, --framework <framework>`: Specify framework (react, vue, svelte, solid, vanilla).

### `helios add <component> [options]`
Adds a component (and its dependencies) to the project.
- **Arguments**:
  - `component`: Name of the component to install.
- **Options**:
  - `--no-install`: Skip dependency installation.

### `helios components`
Lists available components in the registry.

### `helios studio [options]`
Launches the Helios Studio development server. Respects user's `vite.config.ts`.
- **Options**:
  - `-p, --port <number>`: Port to run on (default: 3000).

### `helios render [options]`
Renders a composition to video using `@helios-project/renderer`.
- **Options**:
  - `-c, --composition <id>`: Composition ID to render.
  - `-o, --output <path>`: Output file path.
  - `--start-frame <number>`: Start frame (inclusive).
  - `--frame-count <number>`: Number of frames to render.

### `helios merge <output> [inputs...]`
Merges multiple video files into a single output without re-encoding.
- **Arguments**:
  - `output`: Output filename.
  - `inputs`: List of input video files.

## D. Configuration

The CLI reads `helios.config.json` in the project root.

**Example `helios.config.json`:**
```json
{
  "version": "1.0.0",
  "directories": {
    "components": "src/components/helios",
    "lib": "src/lib"
  },
  "framework": "react"
}
```

## E. Integration

- **Registry**: Uses `RegistryClient` to fetch components from `HELIOS_REGISTRY_URL` (env var) or falls back to internal manifest.
- **Renderer**: Invokes `@helios-project/renderer` for rendering tasks.
- **Studio**: Spawns `@helios-project/studio` for the UI.
