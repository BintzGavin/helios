# CLI Context

## A. Architecture

The Helios CLI is built using `commander` and serves as the primary interface for managing Helios projects. It handles:
- Project initialization and scaffolding (`init`)
- Component management (`add`, `remove`, `update`, `components`, `diff`)
- Development server (`studio`)
- Rendering (`render`, `job`, `merge`)
- Deployment (`build`, `preview`)

Commands are registered in `src/index.ts` and implemented in individual files within `src/commands/`.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # Entry point
├── src/
│   ├── commands/
│   │   ├── add.ts          # Adds components
│   │   ├── build.ts        # Builds for production
│   │   ├── components.ts   # Lists registry components
│   │   ├── diff.ts         # Diffs components
│   │   ├── init.ts         # Initializes project
│   │   ├── job.ts          # Manages render jobs
│   │   ├── list.ts         # Lists installed components
│   │   ├── merge.ts        # Merges video files
│   │   ├── preview.ts      # Previews build
│   │   ├── remove.ts       # Removes components
│   │   ├── render.ts       # Renders composition
│   │   ├── skills.ts       # Installs agent skills
│   │   ├── studio.ts       # Starts Studio server
│   │   └── update.ts       # Updates components
│   ├── registry/
│   │   ├── __tests__/      # Registry tests
│   │   ├── client.ts       # Registry API client
│   │   └── types.ts        # Registry types
│   ├── templates/          # Project templates
│   ├── types/              # Shared types
│   └── utils/
│       ├── config.ts       # Config management
│       ├── examples.ts     # Example fetching
│       ├── install.ts      # Installation logic
│       └── uninstall.ts    # Uninstallation logic
├── package.json
└── vitest.config.ts        # Test configuration
```

## C. Commands

- `helios init [target]`: Initialize a new project.
  - Options: `--yes`, `--framework <name>`, `--example <name>`, `--repo <url>`
- `helios studio`: Start the Studio development server.
  - Options: `--port <number>`
- `helios add <component>`: Add a component from the registry.
  - Options: `--no-install`
- `helios remove <component>`: Remove a component.
  - Options: `--yes`, `--keep-files`
- `helios update <component>`: Update a component.
  - Options: `--yes`, `--no-install`
- `helios components`: List available components in the registry.
- `helios list`: List installed components.
- `helios diff <component>`: Compare local component with registry version.
- `helios render <input>`: Render a composition.
  - Options: `--output`, `--width`, `--height`, `--fps`, `--duration`, `--quality`, `--mode`, `--emit-job`
- `helios job run <spec>`: Run a distributed render job.
  - Options: `--concurrency`, `--chunks`
- `helios merge <output> <inputs...>`: Merge video files.
- `helios build`: Build the project for production.
- `helios preview`: Preview the production build.
- `helios skills install`: Install agent skills.

## D. Configuration

The CLI reads `helios.config.json` in the project root.

```typescript
interface HeliosConfig {
  version: string;
  registry?: string; // Custom registry URL
  directories: {
    components: string;
    lib: string;
  };
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  components: string[];
}
```

## E. Integration

- **Registry**: The CLI uses `RegistryClient` to fetch components. It supports:
  - Custom registry URL via `helios.config.json` or `HELIOS_REGISTRY_URL` env var.
  - Authentication via `HELIOS_REGISTRY_TOKEN` env var or constructor injection (Bearer token).
- **Studio**: The `studio` command launches a Vite server with `studioApiPlugin`, allowing the Studio UI to trigger CLI actions (install/remove components) via the server.
- **Renderer**: The `render` command orchestrates rendering using `@helios-project/renderer`.
