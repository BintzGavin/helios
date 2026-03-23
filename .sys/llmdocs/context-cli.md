# CLI Context

## A. Architecture

The Helios CLI is built using `commander` and serves as the primary interface for managing Helios projects. It handles:
- Project initialization and scaffolding (`init`)
- Component management (`add`, `remove`, `update`, `components`, `diff`)
- Development server (`studio`)
- Rendering (`render`, `job`, `merge`) - The `job` command utilizes `JobExecutor` from `@helios-project/infrastructure`
- Deployment (`build`, `preview`, `deploy`)

Commands are registered in `src/index.ts` and implemented in individual files within `src/commands/`.

## B. File Tree

```
packages/cli/src/
├── commands/
│   ├── __tests__/
│   │   ├── add.test.ts
│   │   ├── deploy.test.ts
│   │   ├── init.test.ts
│   │   ├── job.test.ts
│   │   ├── list.test.ts
│   │   ├── merge.test.ts
│   │   ├── remove.test.ts
│   │   ├── render.test.ts
│   │   └── update.test.ts
│   ├── add.ts
│   ├── build.ts
│   ├── components.test.ts
│   ├── components.ts
│   ├── deploy.ts
│   ├── diff.ts
│   ├── init.ts
│   ├── job.ts
│   ├── list.ts
│   ├── merge.ts
│   ├── preview.ts
│   ├── remove.ts
│   ├── render.ts
│   ├── skills.ts
│   ├── studio.ts
│   └── update.ts
├── index.ts
├── registry/
│   ├── __tests__/
│   │   └── client.test.ts
│   ├── client.ts
│   ├── manifest.ts
│   └── types.ts
├── templates/
│   ├── aws.ts
│   ├── cloudflare.ts
│   ├── docker.ts
│   ├── fly.ts
│   ├── gcp.ts
│   ├── react.ts
│   ├── solid.ts
│   ├── svelte.ts
│   ├── vanilla.ts
│   └── vue.ts
├── types/
│   └── job.ts
└── utils/
    ├── __tests__/
    │   ├── config.test.ts
    │   ├── examples.test.ts
    │   └── install.test.ts
    ├── config.ts
    ├── examples.ts
    ├── ffmpeg.ts
    ├── install.ts
    ├── package-manager.ts
    └── uninstall.ts

9 directories, 50 files
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
- `helios components [query]`: List and search available components.
  - Options: `--framework <name>` (Filter by framework), `--all` (Show all components)
- `helios list`: List installed components.
- `helios diff <component>`: Compare local component with registry version.
- `helios render <input>`: Render a composition.
  - Options: `--output`, `--width`, `--height`, `--fps`, `--duration`, `--quality`, `--mode`, `--emit-job`
- `helios job run <spec>`: Run a distributed render job from a local file or remote URL.
  - Options: `--concurrency`, `--chunks`, `--adapter`, `--aws-region`, `--aws-function-name`, `--aws-job-def-url`, `--gcp-service-url`, `--gcp-job-def-url`, `--cloudflare-service-url`, `--cloudflare-auth-token`, `--cloudflare-job-def-url`, `--azure-service-url`, `--azure-function-key`, `--azure-job-def-url`, `--fly-api-token`, `--fly-app-name`, `--fly-image-ref`, `--fly-region`, `--k8s-kubeconfig-path`, `--k8s-namespace`, `--k8s-job-image`, `--k8s-job-name-prefix`, `--k8s-service-account-name`, `--docker-image`, `--deno-service-url`, `--deno-auth-token`, `--vercel-service-url`, `--vercel-auth-token`, `--vercel-job-def-url`, `--modal-endpoint-url`, `--modal-auth-token`, `--hetzner-api-token`, `--hetzner-server-type`, `--hetzner-image`, `--hetzner-ssh-key-id`, `--hetzner-location`
- `helios merge <output> <inputs...>`: Merge video files.
- `helios build`: Build the project for production.
- `helios preview`: Preview the production build.
- `helios skills install`: Install agent skills.
- `helios deploy setup`: Scaffold deployment configurations (Docker).
- `helios deploy gcp`: Scaffold Google Cloud Run Job configuration.
- `helios deploy aws`: Scaffold AWS Lambda deployment configuration.
- `helios deploy cloudflare`: Scaffold Cloudflare Workers deployment configuration.
- `helios deploy fly`: Scaffold Fly.io Machines deployment configuration.

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
  dependencies?: Record<string, string>;
}
```

## E. Integration

- **Registry**: The CLI uses `RegistryClient` to fetch components. It supports:
  - Custom registry URL via `helios.config.json` or `HELIOS_REGISTRY_URL` env var.
  - **Hydration**: Fetches lightweight `index.json` first, then hydrates file contents on-demand.
  - Authentication via `HELIOS_REGISTRY_TOKEN` env var or constructor injection (Bearer token).
  - **Cross-Framework Support**: Allows installing `vanilla` components in framework-specific projects.
- **Studio**: The `studio` command launches a Vite server with `studioApiPlugin`, allowing the Studio UI to trigger CLI actions (install/remove components) via the server.
- **Renderer**: The `render` command orchestrates rendering using `@helios-project/renderer`. It supports custom browser executable paths via `PUPPETEER_EXECUTABLE_PATH` env var.
- **Job**: The `job` command supports loading job specifications from local paths or remote HTTP/HTTPS URLs using the native `fetch` API. It integrates with `@helios-project/infrastructure` using `JobExecutor` and worker adapters for robust distributed job processing.
- **GCP Deployment**: The `deploy gcp` command scaffolds a Cloud Run Job that supports stateless execution via `HELIOS_JOB_SPEC` environment variable.
