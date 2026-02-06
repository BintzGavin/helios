# Helios CLI Context

## A. Architecture

The Helios CLI is built using `commander` and provides the primary interface for creating, managing, and rendering Helios projects. It follows a subcommand pattern where each command is isolated in its own file and registered in the main entry point.

**Entry Point**: `bin/helios.js` (Shebang wrapper around `dist/index.js`)
**Registration**: `src/index.ts` imports and registers all commands.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # Executable entry point
├── src/
│   ├── index.ts            # Main CLI setup
│   ├── commands/
│   │   ├── studio.ts       # helios studio
│   │   ├── init.ts         # helios init
│   │   ├── add.ts          # helios add
│   │   ├── components.ts   # helios components
│   │   ├── render.ts       # helios render
│   │   ├── merge.ts        # helios merge
│   │   ├── list.ts         # helios list
│   │   ├── remove.ts       # helios remove
│   │   ├── update.ts       # helios update
│   │   └── build.ts        # helios build
│   ├── registry/           # Registry client logic
│   ├── templates/          # Project scaffolding templates
│   └── utils/              # Shared utilities (config, logger)
├── package.json
└── tsconfig.json
```

## C. Commands

### `helios studio`
Launches the Studio development server.
```typescript
function registerStudioCommand(program: Command): void;
```

### `helios init`
Initializes a new Helios project configuration and scaffolds structure.
Options:
- `-y, --yes`: Skip prompts and use defaults.
- `-f, --framework <framework>`: Specify framework (react, vue, svelte, solid, vanilla).
```typescript
function registerInitCommand(program: Command): void;
```

### `helios add [component]`
Adds a component from the registry to the project.
Options:
- `--no-install`: Skip dependency installation.
```typescript
function registerAddCommand(program: Command): void;
```

### `helios components`
Lists available components in the registry.
```typescript
function registerComponentsCommand(program: Command): void;
```

### `helios render`
Renders a composition to video.
Options:
- `--start-frame <frame>`
- `--frame-count <count>`
```typescript
function registerRenderCommand(program: Command): void;
```

### `helios merge`
Merges multiple video files into one.
```typescript
function registerMergeCommand(program: Command): void;
```

### `helios list`
Lists installed components.
```typescript
function registerListCommand(program: Command): void;
```

### `helios remove <component>`
Removes a component from the project configuration.
```typescript
function registerRemoveCommand(program: Command): void;
```

### `helios update <component>`
Updates or restores a component from the registry.
```typescript
function registerUpdateCommand(program: Command): void;
```

### `helios build`
Builds the project for production using Vite.
Options:
- `-o, --out-dir <dir>`: Output directory (default: dist)
```typescript
function registerBuildCommand(program: Command): void;
```

## D. Configuration

The CLI reads and writes `helios.config.json` in the project root.
Structure:
```json
{
  "framework": "react",
  "directories": {
    "components": "src/components",
    "lib": "src/lib"
  },
  "components": {
    "MyComponent": { ... }
  }
}
```

## E. Integration

- **Registry**: Uses `RegistryClient` to fetch component metadata and code.
- **Renderer**: Uses `@helios-project/renderer` for the `render` command.
- **Studio**: Uses `@helios-project/studio` for the `studio` command.
- **Vite**: Wraps `vite` for `build` command and dev server.
