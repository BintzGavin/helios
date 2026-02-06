# CLI Context

## A. Architecture
The Helios CLI is built using `commander.js`. The entry point is `bin/helios.js`, which imports the built `dist/index.js`.
Commands are registered in `src/index.ts` using a `register[CommandName]Command(program)` pattern.
Each command is isolated in its own file under `src/commands/`.

## B. File Tree
```
packages/cli/
├── bin/
│   └── helios.js           # Entry point
├── src/
│   ├── index.ts            # Main CLI setup, command registration
│   ├── commands/
│   │   ├── studio.ts       # helios studio
│   │   ├── init.ts         # helios init
│   │   ├── add.ts          # helios add
│   │   ├── update.ts       # helios update
│   │   ├── remove.ts       # helios remove
│   │   ├── list.ts         # helios list
│   │   ├── components.ts   # helios components
│   │   ├── render.ts       # helios render
│   │   └── merge.ts        # helios merge
│   ├── registry/
│   │   ├── client.ts       # Registry client
│   │   ├── manifest.ts     # Local registry manifest
│   │   └── types.ts        # Registry types
│   ├── utils/
│   │   ├── config.ts       # Configuration management
│   │   ├── logger.ts       # Logging utilities
│   │   ├── install.ts      # Component installation logic
│   │   └── uninstall.ts    # Component uninstallation logic
│   └── types/
│       └── index.ts        # Shared types
```

## C. Commands
- `helios studio [options]`: Launches the Studio development server.
  - Options: `--port <number>`
- `helios init [options]`: Initializes a new project.
  - Options: `-y`, `--framework <name>`
- `helios add [component]`: Adds a component to the project.
  - Options: `--no-install`
- `helios update [component]`: Updates a component to the latest version.
  - Options: `-y, --yes` (skip confirmation), `--no-install`
- `helios remove [component]`: Removes a component from the project configuration and warns about associated files.
- `helios list`: Lists installed components in the project as defined in `helios.config.json`.
- `helios components`: Lists available components in the registry.
- `helios render [file]`: Renders a composition to video.
  - Options: `--concurrency`, `--start-frame`, `--frame-count`
- `helios merge [files...]`: Merges video files.
  - Options: `-o, --output <file>`

## D. Configuration
The CLI uses `helios.config.json` in the project root.
Managed via `src/utils/config.ts`.
Structure:
```typescript
interface HeliosConfig {
  version: string;
  directories: {
    components: string;
    lib: string;
  };
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  components: string[];
}
```

## E. Integration
- **Registry**: `src/registry/client.ts` fetches components from the remote registry (with local fallback). Supports framework-based filtering.
- **Studio**: `helios studio` wraps the Studio dev server and injects the registry via `studioApiPlugin`. Filters registry based on `helios.config.json` framework.
- **Renderer**: `helios render` invokes `@helios-project/renderer`.
