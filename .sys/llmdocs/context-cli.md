# CLI Domain Context

## A. Architecture

The Helios CLI (`@helios-project/cli`) is the primary command-line interface for the Helios video engine. It is built with Commander.js and serves as the entry point for:

- Launching Helios Studio
- Managing the component registry (V2)
- Triggering rendering workflows (V2)
- Project scaffolding (V2)

The CLI follows a subcommand pattern where each command is implemented in a separate file and registered with the main program.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # Shebang entry point
├── src/
│   ├── commands/
│   │   ├── add.ts          # helios add command
│   │   ├── components.ts   # helios components command
│   │   ├── init.ts         # helios init command
│   │   └── studio.ts       # helios studio command
│   ├── utils/
│   │   └── config.ts       # Config loading and types
│   └── index.ts            # Main CLI setup
├── package.json
└── tsconfig.json
```

## C. Commands

### `helios studio`

Launches the Helios Studio development server.

```bash
helios studio
```

- Spawns `npm run dev` in the `packages/studio` directory
- Sets `HELIOS_PROJECT_ROOT` environment variable to the current working directory

### `helios init`

Initializes a new Helios project configuration.

```bash
helios init
```

Options:
- `-y, --yes`: Skip prompts and use defaults

Generates a `helios.config.json` file in the current directory with the following structure:
```json
{
  "version": "1.0.0",
  "directories": {
    "components": "src/components/helios",
    "lib": "src/lib"
  }
}
```

### `helios add`

Adds a component to the project from the embedded registry.

```bash
helios add <component>
```

- Installs component source code and dependencies into the configured `components` directory.
- Requires `helios.config.json` to exist.
- Current registry includes: `timer`.

### `helios components`

Lists available components in the registry.

```bash
helios components
```

- Lists component names and types (e.g., `timer (react)`).

### Planned Commands (V2)

- `helios render` - Trigger local or distributed rendering

## D. Configuration

The CLI uses `helios.config.json` for project configuration. Configuration logic is centralized in `src/utils/config.ts`.

- **directories.components**: Target directory for installed components
- **directories.lib**: Location of the library directory

## E. Integration

- **Studio**: The `studio` command launches `@helios-project/studio` via npm
- **Registry**: Integrates with embedded component registry for `add` and `components` commands
- **Renderer**: Will integrate with `@helios-project/renderer` for render commands

## F. Command Pattern

Each command is implemented as:

```typescript
// src/commands/[name].ts
import { Command } from 'commander';

export function register[Name]Command(program: Command) {
  program
    .command('[name]')
    .description('[description]')
    .action(async () => {
      // Implementation
    });
}
```

Commands are registered in `src/index.ts`:

```typescript
import { register[Name]Command } from './commands/[name].js';
register[Name]Command(program);
```
