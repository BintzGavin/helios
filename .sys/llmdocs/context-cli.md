# CLI Domain Context

## A. Architecture
The `@helios-project/cli` provides the core command-line interface for the Helios toolchain, structured around a subcommand pattern utilizing Commander.js.

- **Entry Point:** The primary entry point for users is `bin/helios.js`, which wraps `src/index.ts`.
- **Command Registration:** The `src/index.ts` file acts as the router, registering discrete commands implemented in the `src/commands/` directory using a uniform signature: `export function register[CommandName]Command(program: Command): void`.
- **Exit Codes:** Adheres to standard POSIX conventions; exits with code `0` on success and `1` (or specific error codes) upon failure.

## B. File Tree
```
packages/cli/
├── bin/
│   └── helios.js                # Shell entry point script wrapper
├── scripts/
│   └── bundle-skills.js         # Script to bundle AI skills logic
├── src/
│   ├── commands/                # Subcommand implementations
│   │   ├── add.ts               # Registry fetch and code injection
│   │   ├── build.ts             # Vite production build execution
│   │   ├── components.ts        # CLI registry browser/search
│   │   ├── deploy.ts            # Deployment scaffolding logic
│   │   ├── diff.ts              # Local vs remote registry diffing
│   │   ├── init.ts              # Helios workspace bootstrapper
│   │   ├── job.ts               # Remote/local render job execution
│   │   ├── list.ts              # Installed components viewer
│   │   ├── merge.ts             # Video chunk stitiching (ffmpeg)
│   │   ├── preview.ts           # Local preview server running
│   │   ├── remove.ts            # Component uninstaller
│   │   ├── render.ts            # Video rendering entry point
│   │   ├── skills.ts            # AI skills integration installer
│   │   ├── studio.ts            # Interactive local development studio
│   │   └── update.ts            # In-place component upgrader
│   ├── registry/                # Registry interaction layer
│   │   ├── client.ts            # Remote/local component fetcher
│   │   ├── manifest.ts          # Registry schema validation
│   │   └── types.ts             # Internal registry data models
│   ├── templates/               # Generation string templates
│   │   ├── aws.ts
│   │   ├── azure.ts
│   │   ├── cloudflare-sandbox.ts
│   │   ├── cloudflare.ts
│   │   ├── deno.ts
│   │   ├── docker-adapter.ts
│   │   ├── docker.ts
│   │   ├── fly.ts
│   │   ├── frameworks.ts        # Client framework starting configurations
│   │   ├── gcp.ts
│   │   ├── hetzner.ts
│   │   ├── kubernetes.ts
│   │   ├── modal.ts
│   │   ├── react.ts
│   │   ├── solid.ts
│   │   ├── svelte.ts
│   │   ├── vanilla.ts
│   │   └── vercel.ts
│   ├── types/                   # Cross-package shared types
│   │   ├── index.ts
│   │   └── job.ts               # Render job execution schemas
│   ├── utils/                   # CLI helper functions
│   │   ├── config.ts            # Configuration resolution
│   │   ├── examples.ts          # GitHub template downloader
│   │   ├── ffmpeg.ts            # Ffmpeg binary invocation wrapper
│   │   ├── install.ts           # File/dependency copy logic
│   │   ├── logger.ts            # Standardized CLI console logging
│   │   ├── package-manager.ts   # Npm/yarn/pnpm detector and runner
│   │   └── uninstall.ts         # Artifact cleanup handling
│   └── index.ts                 # Commander.js registry router
└── package.json
```

## C. Commands
The CLI exposes the following `helios` commands:

- `helios add <component>`: Injects code from the registry. `--no-install` skips dependency loading.
- `helios build`: Triggers a production client bundle.
- `helios components`: Browses the registry index.
- `helios deploy <target>`: Scaffolds deployment configuration (e.g. `aws`, `azure`, `docker`, `kubernetes`).
- `helios diff <component>`: Shows colorized structural differences against remote versions.
- `helios init`: Scaffolds a new project, handles `helios.config.json` generation. `--example` triggers GitHub cloning.
- `helios job run <spec>`: Distributed rendering worker node runtime using cloud adapters.
- `helios list`: Lists installed registry components.
- `helios merge <chunks...>`: FFmpeg-based video stitching of render chunks.
- `helios preview`: Boots a local server to view the bundled build.
- `helios remove <component>`: Reverses an `add` command, optionally deleting source files.
- `helios render`: Kicks off the standard Chromium puppeteer renderer or emits a distributed job (`--emit-job`).
- `helios skills install`: Connects local AI agent configuration.
- `helios studio`: Interactive Web UI editor / Vite dev server launcher.
- `helios update <component>`: Pulls the latest registry version over local modifications.

## D. Configuration
The CLI's primary source of truth is the `.helios.config.json` located at the root of a user's workspace.
- This configuration is read and resolved via `getConfigOrThrow` in `src/utils/config.ts`.
- It defines critical parameters such as the local framework (`react`, `vue`), output directories, registry endpoints, and tracks the list of installed components.

## E. Integration
The CLI package coordinates across multiple Helios packages:
- **Registry:** `RegistryClient` acts as the liaison between the user's local disk and remote HTTP indices to handle dependency injection logic.
- **Renderer:** Triggers `@helios-project/renderer` instances during the `render` command.
- **Infrastructure:** Delegates cloud workload distribution to `@helios-project/infrastructure` when executing distributed jobs (`job run`).
- **Studio:** Initiates the developer server defined in `@helios-project/studio` via the `studio` command.
