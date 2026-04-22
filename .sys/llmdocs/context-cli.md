# CLI Domain Context

## Section A: Architecture
The Helios CLI acts as the main entry point for users interacting with the registry, generating configurations, and kicking off renders. It uses `commander` for argument parsing and commands are registered via individual functions (e.g., `registerAddCommand(program)`).

## Section B: File Tree
```
packages/cli/
├── bin/
│   └── helios.js
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── __tests__/
│   │   │   ├── add.test.ts
│   │   │   ├── build.test.ts
│   │   │   ├── components.test.ts
│   │   │   ├── deploy.test.ts
│   │   │   ├── diff.test.ts
│   │   │   ├── init.test.ts
│   │   │   ├── job.test.ts
│   │   │   ├── list.test.ts
│   │   │   ├── merge.test.ts
│   │   │   ├── preview.test.ts
│   │   │   ├── remove.test.ts
│   │   │   ├── render.test.ts
│   │   │   ├── skills.test.ts
│   │   │   ├── studio.test.ts
│   │   │   └── update.test.ts
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
│   │   └── client.ts
│   ├── utils/
│   │   ├── config.ts
│   │   ├── examples.ts
│   │   ├── ffmpeg.ts
│   │   └── install.ts
│   └── index.ts
└── package.json
```

## Section C: Commands
- `helios add <component>`: Adds a component from the remote registry.
- `helios build`: Builds the user project via Vite for production usage.
- `helios components [query]`: Lists available components in the registry (filterable by query, framework, or all).
- `helios deploy <provider>`: Scaffolds deployment configurations for cloud providers (e.g., `aws`, `gcp`, `cloudflare`, `cloudflare-sandbox`, `kubernetes`, `fly`, `azure`, `docker`, `hetzner`, `modal`, `deno`, `vercel`).
- `helios diff <component>`: Compares a local component against its remote registry equivalent, outputting patch diffs.
- `helios init`: Scaffolds `helios.config.json` and base templates (or examples) for user workspaces.
- `helios job run <spec>`: Executes a distributed execution spec using available Worker adapters (e.g., `local`, `aws`, `gcp`, `cloudflare`, `cloudflare-sandbox`, `azure`, `fly`, `kubernetes`, `docker`, `deno`, `vercel`, `modal`, `hetzner`). Accepts adapter-specific configurations such as `--docker-args` or `--cloudflare-sandbox-account-id`.
- `helios list`: Lists all currently tracked local components.
- `helios merge`: Stitches together chunks from distributed execution outputs using FFmpeg.
- `helios preview`: Previews a production build.
- `helios remove <component>`: Uninstalls a component from the user's workspace.
- `helios render`: Executes standard or distributed renders from the CLI context.
- `helios skills install`: Installs AI skills in the local workspace.
- `helios studio`: Launches the interactive Studio application.
- `helios update <component>`: Updates an installed component from the registry to the latest version.

## Section D: Configuration
`helios.config.json` stores framework target, the component registry URL, specific output/component directory structures, and a list of installed components to enable features like `diff`, `remove`, and `update`.

## Section E: Integration
The CLI bridges capabilities from `packages/renderer` (to invoke `LocalWorkerAdapter` or the standard core `Renderer`), `packages/infrastructure` (to run job specs via `JobExecutor`), and `packages/studio` (launching the visual dashboard).
