# CLI Context

## A. Architecture

The Helios CLI is built using `commander.js`. The entry point is `bin/helios.js`, which invokes the main logic in `dist/index.js`.
Commands are organized as separate modules in `src/commands/` and registered in `src/index.ts`.

Entry Points:
- `packages/cli/bin/helios.js`: Executable entry point.
- `packages/cli/src/index.ts`: Main application setup.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js
├── scripts/
│   └── bundle-skills.js
├── src/
│   ├── index.ts
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
│   ├── types/
│   │   └── job.ts
│   └── utils/
├── package.json
└── tsconfig.json
```

## C. Commands

- `helios studio`: Launches the Helios Studio dev server.
- `helios init`: Initializes a new Helios project configuration and scaffolds project structure.
- `helios add [component]`: Adds a component to the project.
- `helios list`: Lists installed components in the project.
- `helios components`: Lists available components in the registry.
- `helios render <input>`: Renders a composition to video.
- `helios merge <output> [inputs...]`: Merges multiple video files into one without re-encoding.
- `helios remove <component>`: Removes a component from the project configuration.
- `helios update <component>`: Updates a component to the latest version.
- `helios build`: Builds the project for production using Vite.
- `helios preview [dir]`: Previews the production build locally using Vite.
- `helios job run <file>`: Execute a distributed render job from a JSON spec.
- `helios skills install`: Installs AI agent skills into the project.

## D. Configuration

The CLI reads configuration from `helios.config.json` in the project root.
This file tracks installed components and project settings.

## E. Integration

- **Registry**: `RegistryClient` fetches components from `HELIOS_REGISTRY_URL` or falls back to local registry.
- **Renderer**: `helios render` uses `@helios-project/renderer` to execute rendering strategies (Canvas/DOM).
- **Studio**: `helios studio` wraps the Studio dev server.
